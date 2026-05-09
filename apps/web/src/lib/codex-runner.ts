import "server-only";

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { spawnCodex } from "@/lib/codex-cli";

type RunCodexOptions = {
  cwd?: string;
  prompt: string;
  outputSchema?: unknown;
  sandbox?: "read-only" | "workspace-write";
  timeoutMs?: number;
  onEvent?: (event: { type: string; message: string; payload?: unknown }) => void | Promise<void>;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

class AppServerClient {
  private proc?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private buffer = "";
  private assistantText = "";
  private threadId = "";
  private turnId = "";
  private completed = false;

  constructor(private readonly options: RunCodexOptions) {}

  private async startProcess() {
    this.proc = await spawnCodex(["app-server"], {
      cwd: this.options.cwd ?? process.cwd(),
    });
    this.proc.stdout.on("data", (chunk) => this.onStdout(chunk.toString()));
    this.proc.stderr.on("data", (chunk) => {
      void this.emit("stderr", chunk.toString());
    });
  }

  async run() {
    await this.startProcess();
    const timeout = setTimeout(() => {
      this.proc?.kill();
      for (const request of this.pending.values()) {
        request.reject(new Error("Codex App Server timed out."));
      }
    }, this.options.timeoutMs ?? 180_000);

    try {
      await this.request("initialize", {
        clientInfo: {
          name: "research_dojo",
          title: "Research Dojo",
          version: "0.1.0",
        },
        capabilities: null,
      });
      this.notify("initialized");

      const auth = (await this.request("getAuthStatus", {})) as { authMethod?: string };
      await this.emit("auth", "Codex auth status checked.", auth);
      if (!auth.authMethod) {
        throw new Error("Codex is not logged in. Open Settings and start Codex login.");
      }

      const thread = (await this.request("thread/start", {
        cwd: this.options.cwd ?? process.cwd(),
        approvalPolicy: "never",
        sandbox: this.options.sandbox ?? "read-only",
        ephemeral: true,
        baseInstructions:
          "You are the Research Dojo backend. Never ask for an OpenAI API key. Use the logged-in Codex environment. For trainer/reviewer tasks, do not edit files or run commands. Return exactly the requested final answer.",
      })) as { thread?: { id?: string } };

      this.threadId = thread.thread?.id ?? "";
      if (!this.threadId) throw new Error("Codex did not return a thread id.");

      const turn = (await this.request("turn/start", {
        threadId: this.threadId,
        input: [{ type: "text", text: this.options.prompt, text_elements: [] }],
        outputSchema: this.options.outputSchema ?? null,
        approvalPolicy: "never",
        sandboxPolicy:
          this.options.sandbox === "workspace-write"
            ? {
                type: "workspaceWrite",
                writableRoots: [this.options.cwd ?? process.cwd()],
                networkAccess: false,
                excludeTmpdirEnvVar: false,
                excludeSlashTmp: false,
              }
            : { type: "readOnly", networkAccess: false },
      })) as { turn?: { id?: string } };
      this.turnId = turn.turn?.id ?? "";

      await this.waitForCompletion();
      return {
        threadId: this.threadId,
        turnId: this.turnId,
        text: this.assistantText.trim(),
      };
    } finally {
      clearTimeout(timeout);
      this.proc?.kill();
    }
  }

  private request(method: string, params: unknown) {
    const id = this.nextId++;
    this.proc?.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  private notify(method: string, params?: unknown) {
    this.proc?.stdin.write(JSON.stringify({ method, params }) + "\n");
  }

  private onStdout(data: string) {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      this.handleMessage(line);
    }
  }

  private handleMessage(line: string) {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      void this.emit("raw", line);
      return;
    }

    if (typeof message.id === "number" && "result" in message) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.id === "number" && "error" in message) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        pending.reject(new Error(JSON.stringify(message.error)));
      }
      return;
    }

    const method = String(message.method ?? "");
    const params = message.params as Record<string, unknown> | undefined;

    if (method === "item/agentMessage/delta") {
      this.assistantText += String(params?.delta ?? "");
    }

    if (method === "turn/completed") {
      this.completed = true;
    }

    if (method.endsWith("/requestApproval")) {
      this.proc?.stdin.write(
        JSON.stringify({
          id: message.id,
          result: { decision: "decline" },
        }) + "\n",
      );
    }

    void this.emit(method, method, params);
  }

  private waitForCompletion() {
    return new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (this.completed) {
          clearInterval(timer);
          resolve();
        }
        if (Date.now() - started > (this.options.timeoutMs ?? 180_000)) {
          clearInterval(timer);
          reject(new Error("Codex turn did not complete in time."));
        }
      }, 250);
    });
  }

  private async emit(type: string, message: string, payload?: unknown) {
    await this.options.onEvent?.({ type, message, payload });
  }
}

export async function runCodexText(options: RunCodexOptions) {
  const client = new AppServerClient({
    ...options,
    cwd: options.cwd ? path.resolve(options.cwd) : process.cwd(),
  });
  return client.run();
}

export async function runCodexJson<T>(options: RunCodexOptions) {
  const result = await runCodexText(options);
  const text = stripJsonFence(result.text);
  try {
    return { ...result, json: JSON.parse(text) as T };
  } catch (error) {
    throw new Error(
      `Codex returned non-JSON output: ${error instanceof Error ? error.message : String(error)}\n${result.text}`,
    );
  }
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
