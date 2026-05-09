import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { CodexBridgeEvent, CodexBridgeOptions } from "./types";

export class CodexBridge {
  private proc?: ChildProcessWithoutNullStreams;
  private nextId = 1;

  constructor(private readonly options: CodexBridgeOptions) {}

  start() {
    if (this.proc) return;

    this.proc = spawn(this.options.codexBinary ?? "codex", ["app-server"], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    this.proc.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        this.handleMessage(line);
      }
    });
  }

  initialize() {
    this.send("initialize", {
      clientInfo: {
        name: "research_dojo",
        title: "Research Dojo",
        version: "0.1.0",
      },
    });
    this.send("initialized", {});
  }

  startTask(prompt: string, repoPath: string) {
    this.assertAllowedRepo(repoPath);
    const requestId = this.send("thread/start", { cwd: repoPath });
    this.emit({
      type: "log",
      message: `thread/start sent as request ${requestId}`,
    });

    this.send("turn/start", {
      threadId: "thread_id_placeholder",
      input: [{ type: "text", text: prompt }],
    });
  }

  send(method: string, params: Record<string, unknown> = {}) {
    if (!this.proc) {
      throw new Error("CodexBridge.start() must be called before send().");
    }

    const id = this.nextId++;
    this.proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    return id;
  }

  stop() {
    this.proc?.kill();
    this.proc = undefined;
  }

  private assertAllowedRepo(repoPath: string) {
    if (!this.options.allowedRepoPaths.includes(repoPath)) {
      throw new Error(`Repo path is not registered: ${repoPath}`);
    }
  }

  private handleMessage(line: string) {
    try {
      const message = JSON.parse(line);
      this.emit({ type: "log", message: JSON.stringify(message) });
    } catch (error) {
      this.emit({
        type: "failed",
        error: error instanceof Error ? error.message : "Invalid JSON-RPC event",
      });
    }
  }

  private emit(event: CodexBridgeEvent) {
    this.options.onEvent?.(event);
  }
}
