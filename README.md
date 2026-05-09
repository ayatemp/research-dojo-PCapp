# Research Dojo

Research Dojo is a research training app that keeps the loop fixed:

`読む -> 自分で答える -> 厳しく採点される -> 修正する -> 再提出する -> 実装タスクに落とす`

The app intentionally avoids a chat-first shape. The core objects are Question, Answer, Review, Revision, Experiment, and Codex Task.

## Desktop Downloads

Packaged desktop builds are published on GitHub Releases:

https://github.com/ayatemp/research-dojo-PCapp/releases/latest

- macOS Apple Silicon: download `Research-Dojo-*-mac-arm64.dmg`
- macOS Intel: download `Research-Dojo-*-mac-x64.dmg`
- Windows: download `Research-Dojo-*-win-x64.zip` if your browser blocks `.exe`; otherwise use `Research-Dojo-Setup-*-win-x64.exe`

The app runs locally on your computer. Paper data, answers, reviews, and idea notes are stored in the app data folder, not on Vercel.

Because the app is not code-signed yet, browsers, macOS, or Windows may show a security warning on download or first launch. If Chrome or Edge blocks the Windows installer, use the `.zip` download instead. For public distribution without warnings, add Apple Developer notarization and Windows code signing later.

### Download Warning Notes

Unsigned desktop apps are often marked as uncommon downloads.

- Chrome / Edge: open the Downloads panel, choose `Keep`, then `Keep anyway`.
- macOS: if the app is blocked on first launch, open it once to show the warning, then go to `System Settings` / `システム設定` -> `Privacy & Security` / `プライバシーとセキュリティ`, scroll down, click `Open Anyway` / `このまま開く`, and open the app again.
- Windows: if SmartScreen appears, choose `More info` -> `Run anyway`.

Only download files from the official Release page above.

### macOS First Launch

Because the macOS build is not notarized yet, the first launch may be blocked by Gatekeeper. This is expected for unsigned local builds.

1. Try to open `Research Dojo.app` once and let macOS show the warning.
2. Open `System Settings` / `システム設定` -> `Privacy & Security` / `プライバシーとセキュリティ`.
3. Scroll down and click `Open Anyway` / `このまま開く` for `Research Dojo.app`.
4. Open `Research Dojo.app` again and confirm `Open`.

After this, macOS saves the exception and the app can be opened normally.

## MVP Screens

- `/dashboard` - daily training, score trend, weak-point ranking, pending revisions
- `/papers` - paper list, upload/search surface, paper card preview
- `/papers/[id]/train` - question set, answer form, strict review, revision challenge
- `/ideas` - rough idea to hypothesis, novelty candidates, experiments, Codex task prompt
- `/codex-tasks` - task queue, bridge progress, approval gate

## Repository Layout

```text
research-dojo/
  apps/
    web/                 # Next.js app
  packages/
    ai/                  # prompts, schemas, review helpers
    codex-bridge/        # stdio bridge skeleton for codex app-server
    db/                  # relational schema reference
  docs/                  # product and architecture notes
```

## Development

```bash
npm install
npm run dev
npm run build
```

## Build Desktop Installers

```bash
npm run dist:mac
npm run dist:win
```

Release builds are normally created by `.github/workflows/release.yml` when a `v*` tag is pushed.

## Codex-Only AI

Research Dojo does not use an OpenAI API key. Paper Card generation, question generation, strict review, idea refinement, and implementation tasks all go through `codex app-server`.

Before using the app:

```bash
codex login status
```

If Codex is not logged in, open `Settings` -> `Codex App Server` inside Research Dojo and start Codex login there. The app will show the device-auth URL and one-time code on the settings screen.

You can also log in from a terminal:

```bash
codex login
```

## Local Database

The app persists users, sessions, papers, questions, answers, reviews, ideas, repo registrations, and Codex tasks to a local SQLite file powered by `sql.js`.

```bash
cp apps/web/.env.example apps/web/.env.local
```

Default DB path:

```text
apps/web/.data/research-dojo.sqlite
```

## What Works Now

- Email/password login with HTTP-only sessions
- Project auto-creation after signup
- Paper/memo text persistence
- Codex-generated Paper Cards and question sets
- User answer persistence
- Codex strict review with structured JSON saved to DB
- Idea-to-experiment refinement through Codex
- Local repo registration
- Codex implementation task creation and execution through `codex app-server`

This is designed as a local-first/self-hosted app. Because Codex can edit local repositories, production deployment should run in an environment where the owner intentionally installed and logged into Codex.
