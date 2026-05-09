const { app, BrowserWindow, dialog, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "apps", "web");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const appIconPngPath = path.join(projectRoot, "assets", "research-dojo-icon.png");
const appIconIcnsPath = path.join(projectRoot, "assets", "research-dojo-icon.icns");

let serverProcess = null;
let mainWindow = null;
let logFile = null;

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (logFile) fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

function getWindowIconPath() {
  return process.platform === "darwin" ? appIconIcnsPath : appIconPngPath;
}

function applyAppIdentity() {
  app.setName("Research Dojo");

  if (process.platform === "darwin" && fs.existsSync(appIconPngPath)) {
    const dockIcon = nativeImage.createFromPath(appIconPngPath);
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }
}

function getPackagedStandaloneRoot() {
  return path.join(process.resourcesPath, "next-standalone");
}

function getPackagedWebRoot() {
  return path.join(getPackagedStandaloneRoot(), "apps", "web");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    writeLog(`$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));
    child.stderr.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function getFreePort(preferred = 3765) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      const fallback = net.createServer();
      fallback.listen(0, "127.0.0.1", () => {
        const address = fallback.address();
        fallback.close(() => resolve(address.port));
      });
    });
    server.listen(preferred, "127.0.0.1", () => {
      server.close(() => resolve(preferred));
    });
  });
}

function waitForServer(url, timeoutMs = 90_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 700);
      });
      request.setTimeout(1200, () => request.destroy());
    };
    check();
  });
}

function createLoadingWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: "Research Dojo",
    icon: getWindowIconPath(),
    backgroundColor: "#07101d",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(
    "data:text/html;charset=utf-8," +
      encodeURIComponent(`
        <!doctype html>
        <html lang="ja">
          <head>
            <meta charset="utf-8" />
            <title>Research Dojo</title>
            <style>
              html, body {
                margin: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.28), transparent 36%),
                  radial-gradient(circle at 75% 35%, rgba(34, 211, 238, 0.16), transparent 32%),
                  #07101d;
                color: #e5edf8;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              main {
                height: 100%;
                display: grid;
                place-items: center;
              }
              section {
                width: min(520px, calc(100vw - 48px));
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                padding: 28px;
                background: rgba(8, 15, 28, 0.72);
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
              }
              .mark {
                width: 42px;
                height: 42px;
                border-radius: 10px;
                background: linear-gradient(135deg, #7c3aed, #22d3ee);
                margin-bottom: 18px;
              }
              h1 {
                margin: 0;
                font-size: 24px;
              }
              p {
                margin: 12px 0 0;
                color: #9caec5;
                line-height: 1.7;
                font-size: 14px;
              }
              .bar {
                height: 4px;
                margin-top: 24px;
                border-radius: 999px;
                overflow: hidden;
                background: rgba(255, 255, 255, 0.08);
              }
              .bar span {
                display: block;
                height: 100%;
                width: 38%;
                border-radius: inherit;
                background: linear-gradient(90deg, #7c3aed, #22d3ee);
                animation: move 1.2s ease-in-out infinite alternate;
              }
              @keyframes move {
                from { transform: translateX(-80%); }
                to { transform: translateX(220%); }
              }
            </style>
          </head>
          <body>
            <main>
              <section>
                <div class="mark"></div>
                <h1>Research Dojoを起動しています</h1>
                <p>このアプリはローカルだけで動きます。初回起動や更新後は、内部ビルドのため少しだけ時間がかかります。</p>
                <div class="bar"><span></span></div>
              </section>
            </main>
          </body>
        </html>
      `),
  );
}

async function ensureBuild(env) {
  if (app.isPackaged) return;

  const buildId = path.join(webRoot, ".next", "BUILD_ID");
  if (process.env.RESEARCH_DOJO_FORCE_BUILD === "1" || !fs.existsSync(buildId)) {
    await runCommand(npmCommand, ["run", "build"], { env });
  }
}

function startNextServer(port, env) {
  const packagedServerEntry = path.join(getPackagedWebRoot(), "server.js");
  const command = app.isPackaged ? process.execPath : npmCommand;
  const args = app.isPackaged
    ? [packagedServerEntry]
    : [
        "--workspace",
        "@research-dojo/web",
        "run",
        "start",
        "--",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ];
  const cwd = app.isPackaged ? getPackagedWebRoot() : projectRoot;
  const serverEnv = app.isPackaged
    ? {
        ...env,
        ELECTRON_RUN_AS_NODE: "1",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        RESEARCH_DOJO_SQLJS_DIR: path.join(
          getPackagedStandaloneRoot(),
          "node_modules",
          "sql.js",
          "dist",
        ),
      }
    : env;

  if (app.isPackaged && !fs.existsSync(packagedServerEntry)) {
    throw new Error(`Packaged Next server was not found: ${packagedServerEntry}`);
  }

  serverProcess = spawn(command, args, {
    cwd,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));
  serverProcess.stderr.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));
  serverProcess.on("exit", (code) => {
    writeLog(`Next server exited with code ${code}`);
  });
}

async function boot() {
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  logFile = path.join(userData, "desktop.log");

  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NODE_ENV: "production",
    RESEARCH_DOJO_DESKTOP: "1",
    RESEARCH_DOJO_DB_PATH: path.join(userData, "research-dojo.sqlite"),
  };

  createLoadingWindow();
  await ensureBuild(env);
  startNextServer(port, env);
  await waitForServer(url);
  await mainWindow.loadURL(url);
}

app.whenReady().then(() => {
  applyAppIdentity();
  boot().catch(async (error) => {
    writeLog(error.stack || error.message || String(error));
    await dialog.showMessageBox({
      type: "error",
      title: "Research Dojo failed to start",
      message: "Research Dojoの起動に失敗しました。",
      detail: `${error.message || error}\n\nLog: ${logFile ?? "(not created)"}`,
      buttons: ["OK", "ログを開く"],
    }).then((result) => {
      if (result.response === 1 && logFile) shell.openPath(logFile);
    });
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
