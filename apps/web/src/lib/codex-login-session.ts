import "server-only";

import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawnCodex } from "@/lib/codex-cli";
import { getCodexAuthStatus } from "@/lib/codex-auth";

export type CodexDeviceLoginSession = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  authUrl?: string;
  userCode?: string;
  expiresAt?: string;
  output: string;
  error?: string;
  exitCode?: number | null;
  binaryPath?: string;
};

let loginProcess: ChildProcessWithoutNullStreams | undefined;
let loginSession: CodexDeviceLoginSession = {
  status: "idle",
  output: "",
};

function stripAnsi(value: string) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function appendOutput(chunk: string) {
  const clean = stripAnsi(chunk).replace(/\r/g, "");
  loginSession.output = `${loginSession.output}${clean}`.slice(-5000);

  const url = loginSession.output.match(/https:\/\/auth\.openai\.com\/codex\/device/)?.[0];
  const code = loginSession.output.match(/\b[A-Z0-9]{4}-[A-Z0-9]{5}\b/)?.[0];
  if (url) loginSession.authUrl = url;
  if (code) {
    loginSession.userCode = code;
    loginSession.expiresAt ??= new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
}

export function getCodexDeviceLoginSession() {
  return { ...loginSession };
}

export function markCodexDeviceLoginCompleted() {
  if (loginSession.status === "running") {
    loginSession = {
      ...loginSession,
      status: "completed",
      completedAt: new Date().toISOString(),
      error: undefined,
    };
    loginProcess?.kill();
    loginProcess = undefined;
  }
  return getCodexDeviceLoginSession();
}

export async function startCodexDeviceLogin() {
  if (loginSession.status === "running") {
    return getCodexDeviceLoginSession();
  }

  const codex = await getCodexAuthStatus();
  if (codex.loggedIn) {
    loginSession = {
      status: "completed",
      completedAt: new Date().toISOString(),
      output: codex.statusText,
      binaryPath: codex.binaryPath,
    };
    return getCodexDeviceLoginSession();
  }

  if (!codex.available) {
    loginSession = {
      status: "failed",
      completedAt: new Date().toISOString(),
      output: "",
      error: codex.error || "Codex CLI was not found.",
      binaryPath: codex.binaryPath,
    };
    return getCodexDeviceLoginSession();
  }

  loginSession = {
    status: "running",
    startedAt: new Date().toISOString(),
    output: "",
    binaryPath: codex.binaryPath,
  };

  try {
    loginProcess = await spawnCodex(["login", "--device-auth"]);
  } catch (error) {
    loginSession = {
      ...loginSession,
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
    return getCodexDeviceLoginSession();
  }

  loginProcess.stdout.on("data", (chunk) => appendOutput(chunk.toString()));
  loginProcess.stderr.on("data", (chunk) => appendOutput(chunk.toString()));
  loginProcess.on("error", (error) => {
    loginSession = {
      ...loginSession,
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error.message,
    };
    loginProcess = undefined;
  });
  loginProcess.on("close", (code) => {
    if (loginSession.status === "completed") return;
    loginSession = {
      ...loginSession,
      status: code === 0 ? "completed" : "failed",
      completedAt: new Date().toISOString(),
      exitCode: code,
      error: code === 0 ? undefined : loginSession.error || `codex login exited with code ${code}`,
    };
    loginProcess = undefined;
  });

  return getCodexDeviceLoginSession();
}
