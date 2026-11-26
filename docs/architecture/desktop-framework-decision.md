# デスクトップフレームワーク選定: Tauri v2 vs Electron（macOS + Bun）

## 結論

本リポジトリ（`agents-office-app`）では **Tauri v2 + Bun** を採用する。

- **UI / 3D バーチャルオフィス**: React 19 + Three.js / React Three Fiber / Drei（Kenney CC0 GLB 素材）を Bun + Vite でビルドし、macOS ネイティブ WKWebView 上で描画する。
- **ネイティブシェル**: Tauri v2（Rust）で macOS ウィンドウ（通常モード／小型常駐 Mini Office モード／Always-on-Top）、メニューバートレイ（TrayIcon）、macOS ネイティブ通知、フォルダ選択・Finder/Terminal 連携、および Bun バックエンドのライフサイクル管理を担う。
- **バックエンドサービス**: Node.js ではなく **純粋な Bun**（`bun:sqlite` + `Bun.serve` + `Bun.spawn`）でローカル API・SSE ストリーム・4枠スロット制御・実 CLI エージェント（`claude` / `codex` / `agy`）およびデモ実行を管理する。

---

## Tauri v2 vs Electron 詳細比較

| 比較項目 | Tauri v2 + Bun（採用） | Electron（不採用） |
| --- | --- | --- |
| **「Node.js ではなく Bun で」との整合性** | **完全整合**。フロントエンドのパッケージ管理・ビルド・テスト・バックエンド（`bun:sqlite` / `Bun.serve` / `Bun.spawn`）すべてに Bun を使用し、Node.js ランタイムを一切含まない。 | **構造的に不整合**。Electron は内部に Chromium と **Node.js ランタイムを固定同梱**しており、Main Process は Node.js で動作する。Bun はビルド補助止まりとなる。 |
| **常駐メモリ・省電力（「小さなバーチャルオフィス」用途）** | **軽量（約 60〜150 MB 級）**。macOS 標準 WKWebView（Apple Silicon Metal バックエンド）を使うため、`claude` / `codex` / `agy` を複数並列稼働させる Mac 環境でも圧迫が少ない。 | **重い（ベースライン 250〜500 MB+）**。Chromium + Node.js をアプリごとに丸ごと起動するため、常駐ミニオフィス用途では負荷が大きい。 |
| **配布アプリサイズ（`.app` / `.dmg`）** | 約 15〜40 MB（Bun サイドカー同梱時でもコンパクト）。 | 約 180〜280 MB。 |
| **SQLite・ネイティブ依存の扱い** | Bun 標準の `bun:sqlite`（WAL 対応・ゼロネイティブビルド）をそのまま使える。`better-sqlite3` の ABI 再ビルド地獄が不要。 | `better-sqlite3` 等を Electron 固有の Node ABI 向けに毎回リビルド（`electron-rebuild`）する必要がある。 |
| **macOS ネイティブ UX** | `titleBarStyle: "Overlay"` による自然なトラフィックライト配置、メニューバー常駐トレイ、ミニフローティングウィンドウ（Always-on-Top）、ネイティブ通知が軽量・標準的に実現可能。 | 実現可能だがすべて Chromium/Node ブリッジ経由でリソース消費が大きい。 |
| **3D（Three.js / WebGL2）互換性** | macOS WKWebView は WebGL2 + Metal をサポートしており、Kenney ローポリ GLB（約 850 KB）の箱庭 3D オフィスを十分に滑らかに描画できる。 | Chromium ANGLE/Metal によりクロスプラットフォーム互換性は最も高いが、今回の対象は **Mac アプリ** に限定されているため WKWebView で十分。 |
| **開発ツールチェーンの前提** | Rust（`rustc` / `cargo`）が必要。本環境は Determinate Nix を利用しているため、`flake.nix`（`nix develop`）および自動検出スクリプトで再現性高く扱える。 | Rust 不要で JS のみで完結する点は利点だが、Node.js 同梱・常駐負荷のデメリットが上回る。 |

---

## `~/work/agents-office`（Web / WSL 版）からの主な変更点

1. **OS 依存の刷新（Linux systemd/cgroup → macOS ネイティブプロセス管理）**
   - 元リポジトリは Windows + WSL2 前提で `systemd-run` / `systemctl --user` / `/proc` に依存していた。
   - 本リポジトリでは macOS 向けに `Bun.spawn` + プロセスグループ単位の終了制御（`SIGTERM` → `SIGKILL`）、`ps` によるローカル `claude` / `codex` / `agy` プロセス観測へ刷新した。
2. **ランタイムの刷新（Node.js + pnpm + better-sqlite3 → Bun + bun:sqlite + Bun.serve）**
   - 依存解決・テスト・サーバー・SQLite をすべて Bun に統一。
3. **認証体験のデスクトップ化（手動ペアリングコード入力の撤廃）**
   - Web アプリ版ではブラウザ接続時に端末のペアリングコード入力が必要だったが、Tauri v2 シェルが起動時にランダムトークンを生成して Bun バックエンドへ渡し、IPC 経由で WebView へ安全に共有するため、**起動即接続**となる。
4. **「小さなバーチャルオフィス」体験の追加**
   - 3ペインの通常管理画面に加え、画面の隅に常駐させられる **Mini Office モード（小型フローティング 3D 箱庭 + Always-on-Top）** と **macOS メニューバートレイ** を備える。
