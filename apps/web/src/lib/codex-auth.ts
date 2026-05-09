import "server-only";

import { spawn } from "node:child_process";

export type CodexAuthStatus = {
  available: boolean;
  loggedIn: boolean;
  method: string;
  statusText: string;
  codexHome?: string;
  userAgent?: string;
  error?: string;
};

type JsonRpcMessage = {
  id?: number;
  result?: unknown;
  error?: unknown;
};

function runCommand(command: string, args: string[], timeoutMs = 8_000) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => proc.kill(), timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ code: 1, stdout, stderr: error.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

function appServerProbe(timeoutMs = 8_000) {
  return new Promise<{
    init?: { codexHome?: string; userAgent?: string };
    auth?: { authMethod?: string; requiresOpenaiAuth?: boolean };
  }>((resolve, reject) => {
    const proc = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
    let nextId = 1;
    let buffer = "";
    const pending = new Map<number, (message: JsonRpcMessage) => void>();
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Codex App Server auth probe timed out."));
    }, timeoutMs);

    function request(method: string, params: unknown) {
      const id = nextId++;
      proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
      return new Promise<JsonRpcMessage>((requestResolve) => {
        pending.set(id, requestResolve);
      });
    }

    proc.stderr.on("data", () => undefined);
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines.filter(Boolean)) {
        let message: JsonRpcMessage;
        try {
          message = JSON.parse(line) as JsonRpcMessage;
        } catch {
          continue;
        }
        if (typeof message.id !== "number") continue;
        const resolver = pending.get(message.id);
        if (!resolver) continue;
        pending.delete(message.id);
        resolver(message);
      }
    });

    void (async () => {
      try {
        const initMessage = await request("initialize", {
          clientInfo: {
            name: "research_dojo",
            title: "Research Dojo",
            version: "0.1.0",
          },
          capabilities: null,
        });
        proc.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
        const authMessage = await request("getAuthStatus", {});
        clearTimeout(timer);
        proc.kill();
        resolve({
          init: initMessage.result as { codexHome?: string; userAgent?: string },
          auth: authMessage.result as { authMethod?: string; requiresOpenaiAuth?: boolean },
        });
      } catch (error) {
        clearTimeout(timer);
        proc.kill();
        reject(error);
      }
    })();
  });
}

export async function getCodexAuthStatus(): Promise<CodexAuthStatus> {
  const cli = await runCommand("codex", ["login", "status"]);
  if (cli.code !== 0) {
    return {
      available: false,
      loggedIn: false,
      method: "unknown",
      statusText: "Codex CLI unavailable",
      error: cli.stderr || cli.stdout || "codex login status failed",
    };
  }

  const statusText = cli.stdout.trim() || cli.stderr.trim() || "Unknown";
  const cliLoggedIn = /logged in/i.test(statusText);

  try {
    const probe = await appServerProbe();
    const method = probe.auth?.authMethod || statusText.replace(/^Logged in using\s+/i, "");
    const loggedIn = cliLoggedIn || Boolean(probe.auth?.authMethod);
    return {
      available: true,
      loggedIn,
      method,
      statusText,
      codexHome: probe.init?.codexHome,
      userAgent: probe.init?.userAgent,
    };
  } catch (error) {
    return {
      available: true,
      loggedIn: cliLoggedIn,
      method: statusText.replace(/^Logged in using\s+/i, "") || "unknown",
      statusText,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
