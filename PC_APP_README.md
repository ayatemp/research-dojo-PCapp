# Research Dojo PC App

このディレクトリは、既存の `research-dojo` をそのまま残したまま作ったローカルPCアプリ版です。

## 使い方

配布版を使う場合は、GitHub Releasesから自分のOSに合うファイルをダウンロードします。

```text
https://github.com/ayatemp/research-dojo-PCapp/releases/latest
```

- Apple Silicon Mac: `Research-Dojo-*-mac-arm64.dmg`
- Intel Mac: `Research-Dojo-*-mac-x64.dmg`
- Windows: ブラウザが `.exe` を止める場合は `Research-Dojo-*-win-x64.zip`
- Windows: インストーラで入れたい場合は `Research-Dojo-Setup-*-win-x64.exe`

## ダウンロード時に警告が出る場合

まだコード署名をしていないため、ブラウザやOSが「見慣れないアプリ」として警告を出すことがあります。

- Chrome / Edge: ダウンロード一覧から `保存` / `Keep` -> `Keep anyway`
- Windows: `.exe` が止められる場合は `.zip` 版を使う
- macOS: 初回起動で止められる場合はFinderで右クリック -> `開く`
- Windows SmartScreen: `詳細情報` -> `実行`

警告を完全になくすには、Apple Developerの公証とWindowsのコード署名証明書が必要です。

以下は開発用にこのディレクトリから直接起動する場合の手順です。

初回だけ依存関係を入れます。

```bash
npm install
```

Macアプリ風の起動アイコンを作ります。

```bash
npm run make:mac
```

その後は `Research Dojo.app` をダブルクリックすると起動します。

## ターミナルから起動

```bash
npm run pcapp
```

初回起動やソース更新後は、内部でNext.jsのproduction buildを作るため少し時間がかかります。

## データの保存先

PCアプリ版のDBはMacのアプリデータ領域に保存されます。

```text
~/Library/Application Support/research-dojo-pcapp/research-dojo.sqlite
```

Vercelや外部ホストは使いません。ブラウザ公開用のURLも不要です。

## Codex連携

Paper RoomやIdea Grow RoomのCodex生成は、これまで通りローカルのCodexログイン状態を使います。
未ログインの場合は、ターミナルで先に実行してください。

```bash
codex login
```

## 更新後にうまく起動しないとき

強制的に再ビルドして起動できます。

```bash
npm run pcapp:rebuild
```

## 配布パッケージを作る

```bash
npm run dist:mac
npm run dist:win
```

通常は `v0.1.0` のようなタグをGitHubにpushすると、GitHub ActionsがmacOS/Windows向けの成果物を作ってReleaseにアップロードします。
