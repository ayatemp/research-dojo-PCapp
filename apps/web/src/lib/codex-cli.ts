import "server-only";

import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
} from "node:child_process";
import os from "node:os";

export type CodexCommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  binaryPath?: string;
  notFound?: boolean;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function commonBinDirs() {
  const home = os.homedir();
  const dirs = [
    `${home}/.local/bin`,
    `${home}/.npm-global/bin`,
    `${home}/.volta/bin`,
    `${home}/.bun/bin`,
  ];

  if (process.platform === "darwin") {
    dirs.push(
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
      `${home}/Library/pnpm`,
    );
  } else if (process.platform === "win32") {
    dirs.push(
      process.env.APPDATA ? `${process.env.APPDATA}\\npm` : "",
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Programs\\nodejs` : "",
      process.env.ProgramFiles ? `${process.env.ProgramFiles}\\nodejs` : "",
    );
  } else {
    dirs.push("/usr/local/bin", "/usr/bin", "/bin", `${home}/.nvm/current/bin`);
  }

  return unique(dirs);
}

type CodexEnv = Record<string, string | undefined>;

export function createCodexEnv(extraEnv: CodexEnv = {}) {
  const currentPath = process.env.PATH || process.env.Path || "";
  const pathDelimiter = process.platform === "win32" ? ";" : ":";
  const pathValue = unique([...commonBinDirs(), ...currentPath.split(pathDelimiter)]).join(
    pathDelimiter,
  );
  const env: CodexEnv = {
    ...process.env,
    ...extraEnv,
    PATH: pathValue,
    Path: process.platform === "win32" ? pathValue : process.env.Path,
  };

  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

async function discoverWithShell() {
  const shell = process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : process.env.SHELL || (process.platform === "darwin" ? "/bin/zsh" : "/bin/sh");
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "where codex"]
    : ["-lc", "command -v codex"];
  return new Promise<string>((resolve) => {
    const proc = spawn(shell, args, {
      env: createCodexEnv() as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.on("error", () => resolve(""));
    proc.on("close", () => resolve(stdout.trim().split("\n")[0] ?? ""));
  });
}

export async function resolveCodexBinary() {
  const explicit = process.env.CODEX_BINARY;
  if (explicit) return explicit;

  const shellResult = await discoverWithShell();
  if (shellResult) return shellResult;

  return "";
}

export async function spawnCodex(
  args: string[],
  options: { cwd?: string; env?: CodexEnv } = {},
): Promise<ChildProcessWithoutNullStreams> {
  const binaryPath = await resolveCodexBinary();
  if (!binaryPath) {
    throw new Error(
      "Codex CLI was not found. Install Codex CLI, then reopen Research Dojo.",
    );
  }

  const spawnOptions: SpawnOptions = {
    env: createCodexEnv(options.env) as NodeJS.ProcessEnv,
    shell: process.platform === "win32" && binaryPath.endsWith(".cmd"),
    stdio: ["pipe", "pipe", "pipe"],
    ...(options.cwd ? { cwd: options.cwd } : {}),
  } as const;

  return spawn(binaryPath, args, spawnOptions) as ChildProcessWithoutNullStreams;
}

export async function runCodexCommand(
  args: string[],
  options: { cwd?: string; timeoutMs?: number; env?: CodexEnv } = {},
): Promise<CodexCommandResult> {
  const binaryPath = await resolveCodexBinary();
  if (!binaryPath) {
    return {
      code: null,
      stdout: "",
      stderr: "Codex CLI was not found. Install Codex CLI, then reopen Research Dojo.",
      notFound: true,
    };
  }

  return new Promise<CodexCommandResult>((resolve) => {
    const spawnOptions: SpawnOptions = {
      env: createCodexEnv(options.env) as NodeJS.ProcessEnv,
      shell: process.platform === "win32" && binaryPath.endsWith(".cmd"),
      stdio: ["pipe", "pipe", "pipe"],
      ...(options.cwd ? { cwd: options.cwd } : {}),
    };
    const proc = spawn(binaryPath, args, spawnOptions) as ChildProcessWithoutNullStreams;
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => proc.kill(), options.timeoutMs ?? 8_000);

    proc.stdin.end();
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ code: 1, stdout, stderr: error.message, binaryPath });
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr, binaryPath });
    });
  });
}
