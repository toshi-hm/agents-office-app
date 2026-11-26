# Agents Office (macOS App)

複数の AI エージェント（**Claude Code / Codex / Antigravity (`agy`) / デモシミュレーション**）を、Mac 上の**小さな 3D バーチャルオフィス**で可視化・管理するネイティブデスクトップアプリです。

`~/work/agents-office`（Web / WSL2 版）をベースに、**Tauri v2 + Bun** で macOS ネイティブアプリとして再設計しました（Node.js 不使用）。

---

## 技術選定: なぜ Electron ではなく Tauri v2 + Bun か

詳細は [デスクトップフレームワーク選定記録](docs/architecture/desktop-framework-decision.md) を参照してください。

| 観点 | Tauri v2 + Bun（採用） | Electron |
| --- | --- | --- |
| **Bun 中心の構成** | **Node.js ランタイム完全不使用**（フロントビルド・サーバー・SQLite・プロセス管理すべて Bun + Rust） | 内部に **Node.js を固定同梱**するため「Node.js ではなく Bun で」と構造的に矛盾 |
| **常駐メモリ / 軽量性** | macOS 標準 WKWebView（Metal WebGL2）で約 60〜150 MB 級。常駐ミニオフィスに最適 | Chromium + Node.js 同梱でベースライン 250〜500 MB+ |
| **SQLite / ネイティブ依存** | `bun:sqlite` をゼロビルドで利用可能 | `better-sqlite3` の Electron ABI リビルドが必要 |
| **配布サイズ** | コンパクト（`.app` / `.dmg`） | 約 180〜280 MB |
| **macOS ネイティブ体験** | Overlay タイトルバー、メニューバートレイ、Always-on-Top 小型 Mini Office ウィンドウ、ネイティブ通知 | すべて Chromium/Node ブリッジ経由 |

---

## 主な機能

- **小さな 3D バーチャルオフィス（Kenney CC0 素材）**:
  - 経営・開発部・note部・YouTube部の 1 フロア箱庭オフィスに、各エージェントが着席・移動・作業中・承認待ち・エラー・外部稼働中として表示されます。
  - 3D キャラクターやデスクをクリックするとカメラ追従＆詳細インスペクターが開きます。
- **2 つのウィンドウモード**:
  - **通常オフィスモード（Full）**: 左（社員・仕事一覧）、中央（3D バーチャルオフィス）、右（エージェント詳細・ライブログ・承認・依頼パネル）の 3 ペイン構成。
  - **小さなオフィスモード（Mini Office / `Cmd+M`）**: 画面隅に常駐（Always-on-Top）できる小型フローティング 3D 箱庭ウィジェット。
- **macOS ネイティブ統合（Tauri v2 Rust シェル）**:
  - メニューバートレイ（稼働数・承認待ち数のライブ表示、モード切替、新規依頼）。
  - 承認待ち・完了時の macOS ネイティブ通知。
  - ワークスペースのフォルダ選択ダイアログ、Finder / Terminal で開くショートカット。
  - 起動時にランダムトークンを生成して Bun バックエンドを自動起動・終了時クリーン停止（手動ペアリングコード入力不要）。
- **純 Bun バックエンド（`apps/server`）**:
  - `bun:sqlite`（WAL モード）による永続化と初期組織シード。
  - `Bun.serve` によるローカル REST API + SSE リアルタイム更新。
  - 4 枠同時実行スロット制御（`SlotLedger`）と `Bun.spawn` による `claude` / `codex` / `agy` / `demo` 実行・プロセス停止。
  - macOS ローカルで稼働中の外部 `claude` / `codex` / `agy` プロセス観測。

---

## ディレクトリ構成

```text
├── docs/architecture/
│   ├── desktop-framework-decision.md  # Tauri v2 vs Electron 比較・採用根拠
│   └── api-contract.md                # REST / SSE / Tauri IPC 契約
├── packages/
│   ├── domain/                        # 共有型・4枠 SlotLedger・状態導出ロジック
│   └── office-scene/                  # Three.js / R3F 3D バーチャルオフィス + Kenney CC0 GLB
├── apps/
│   ├── server/                        # 純 Bun バックエンド (bun:sqlite + Bun.serve + Bun.spawn)
│   └── desktop/                       # React 19 + Vite デスクトップ UI + Tauri IPC ブリッジ
├── src-tauri/                         # Tauri v2 macOS ネイティブシェル (Rust)
├── scripts/                           # Bun 開発・Tauri 起動スクリプト (Nix Rust 自動補完)
└── flake.nix                          # Nix devShell (bun + rustc + cargo)
```

---

## 起動方法

### 1. 依存インストール（Bun）

```sh
bun install
```

### 2. Mac ネイティブアプリとして起動（Tauri v2 + Bun）

```sh
bun run tauri:dev
```

> `cargo` / `rustc` が PATH にない場合でも、`scripts/tauri.ts` が Nix 経由で自動提供します。`nix develop` でシェルに入って実行することも可能です。

### 3. Mac アプリバンドル（`.app` / `.dmg`）のビルド

```sh
bun run tauri:build
```

### 4. ブラウザプレビュー（フロント＋Bun サーバーのみ）

```sh
bun run dev
```

### 5. テスト・型チェック

```sh
bun test
bun run typecheck
```
