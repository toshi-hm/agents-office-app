# Agents Office Mac App API & IPC Contract

共有型はすべて `@agents-office-app/domain` (`packages/domain/src/types.ts`) を正本とする。

## 1. Bun Backend HTTP + SSE API (`apps/server`)

- Base URL: `http://127.0.0.1:<port>` (default `4318`, or `AGENTS_OFFICE_PORT=0` for ephemeral port)
- Auth: `Authorization: Bearer <token>` (or `?token=<token>` for `EventSource` on `/api/events`)
- Startup stdout handshake (JSON line):
  `{"type":"ready","port":4318,"baseUrl":"http://127.0.0.1:4318","pid":12345}`
- CORS: allow `http://localhost:*`, `http://127.0.0.1:*`, `tauri://localhost`, `http://tauri.localhost`

### Endpoints

| Method | Path | Auth | Request / Query | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | No | - | `200 { ok: true, version: "0.1.0", pid: number }` |
| `GET` | `/api/snapshot` | Yes | - | `200 OfficeSnapshot` |
| `GET` | `/api/events` | Yes (Header or `?token=`) | - | `200 text/event-stream` (`OfficeSseEvent` JSON) |
| `POST` | `/api/agents` | Yes | `CreateAgentInput` | `201 { agent: Agent }` |
| `PATCH` | `/api/agents/:id` | Yes | `UpdateAgentInput` | `200 { agent: Agent }` |
| `DELETE` | `/api/agents/:id` | Yes | - | `200 { ok: true }` / `409` if busy |
| `POST` | `/api/tasks` | Yes | `CreateTaskInput` | `201 { task: Task }` |
| `POST` | `/api/tasks/:id/stop` | Yes | - | `200 { task: Task }` |
| `GET` | `/api/tasks/:id/logs` | Yes | `?limit=200` | `200 { logs: ExecutionLog[] }` |
| `GET` | `/api/agents/:id/logs` | Yes | `?limit=200` | `200 { logs: ExecutionLog[] }` |
| `POST` | `/api/approvals/:id/decide` | Yes | `DecideApprovalInput` | `200 { approval: ApprovalRequest }` |
| `POST` | `/api/demo/scenario` | Yes | `{ kind?: "kickoff" \| "approval" \| "stop_all" }` | `200 { ok: true, startedTaskIds: string[] }` |

## 2. Tauri v2 IPC Commands (`src-tauri` <-> `apps/desktop`)

| Command | Payload | Return |
| --- | --- | --- |
| `get_backend_config` | `{}` | `{ baseUrl: string, token: string, platform: "macos" }` |
| `set_window_mode` | `{ mode: "full" \| "mini" }` | `{ mode: "full" \| "mini" }` |
| `set_always_on_top` | `{ enabled: boolean }` | `{ enabled: boolean }` |
| `send_native_notification` | `{ title: string, body: string }` | `void` |
| `open_path_in_finder` | `{ path: string }` | `void` |
| `open_path_in_terminal` | `{ path: string }` | `void` |
| `pick_workspace_directory` | `{ defaultPath?: string }` | `string \| null` |
| `update_tray_summary` | `{ runningCount: number, pendingApprovals: number }` | `void` |

### Tauri Events (Rust -> WebView)
- `office:window-mode-changed`: payload `"full" | "mini"`
- `office:tray-action`: payload `"new-task" | "toggle-mini" | "refresh"`
