import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appName = "Research Dojo";
const appDir = path.join(projectRoot, `${appName}.app`);
const contentsDir = path.join(appDir, "Contents");
const macosDir = path.join(contentsDir, "MacOS");
const resourcesDir = path.join(contentsDir, "Resources");
const executablePath = path.join(macosDir, appName);
const plistPath = path.join(contentsDir, "Info.plist");
const iconFileName = "research-dojo-icon.icns";
const iconSourcePath = path.join(projectRoot, "assets", iconFileName);
const iconDestPath = path.join(resourcesDir, iconFileName);

fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(macosDir, { recursive: true });
fs.mkdirSync(resourcesDir, { recursive: true });
fs.copyFileSync(iconSourcePath, iconDestPath);

fs.writeFileSync(
  plistPath,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>ja</string>
  <key>CFBundleExecutable</key>
  <string>${appName}</string>
  <key>CFBundleIdentifier</key>
  <string>local.research-dojo.pcapp</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundleDisplayName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleIconFile</key>
  <string>${iconFileName}</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`,
);

fs.writeFileSync(
  executablePath,
  `#!/bin/zsh
set -e

export PATH="$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

APP_EXECUTABLE="$0"
APP_MACOS_DIR="$(dirname "$APP_EXECUTABLE")"
PROJECT_ROOT="$(cd "$APP_MACOS_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"
exec npm run pcapp
`,
);
fs.chmodSync(executablePath, 0o755);

console.log(`Created ${appDir}`);
