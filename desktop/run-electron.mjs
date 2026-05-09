import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };

// Some agent/terminal environments set this, which makes Electron run as plain Node.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [path.join(projectRoot, "desktop", "main.cjs")], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
