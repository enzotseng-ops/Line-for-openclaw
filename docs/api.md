# API 端點

所有 API 以 `/api` 為前綴。除 auth、webhook、setup/status、setup/database 外，其餘端點需要 JWT Bearer Token。

### 速率限制回應標頭

登入和註冊端點會回傳標準速率限制標頭（Setup 模式下自動跳過）：

| Header | 說明 |
|--------|------|
| `RateLimit-Limit` | 時間窗口內的最大請求數 |
| `RateLimit-Remaining` | 剩餘請求數 |
| `RateLimit-Reset` | 重設時間（秒） |

超過限制時回傳 `429 Too Many Requests`。

## 初始設定

| 方法 | 路徑 | Auth | 說明 |
|------|------|------|------|
| GET | `/api/setup/status` | 無 | 系統設定狀態檢查（含 `setupMode` 欄位） |
| POST | `/api/setup/database` | 無 | 設定資料庫連線（測試 → 存 .env → reinitialize → migration） |
| POST | `/api/setup/initialize` | JWT | 批次儲存設定 |

`GET /api/setup/status` 回傳：
```json
{
  "setupMode": false,
  "database": { "configured": true, "verified": true },
  "admin": { "configured": true },
  "line": { "configured": false, "verified": false, "error": null },
  "llm": { "configured": true, "verified": true, "error": null },
  "setupComplete": false
}
```

`POST /api/setup/database` 請求：
```json
{ "databaseUrl": "postgresql://user:pass@host:5432/dbname" }
```
- 成功：200 `{ "success": true, "message": "Database configured and migrations completed" }`
- 連線失敗：400 `{ "error": "Database connection failed", "detail": "..." }`
- DB 已正常連線：403 `{ "error": "Database is already configured and connected" }`

## 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 管理員註冊（限制：每 IP 每小時 3 次） |
| POST | `/api/auth/login` | 管理員登入，回傳 JWT（限制：每 IP 每 15 分鐘 10 次） |
| GET | `/api/auth/me` | 取得目前登入者資訊 |
| PUT | `/api/auth/password` | 修改密碼（需目前密碼驗證） |

## LINE Webhook

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/webhook/line` | 健康檢查（瀏覽器 / LINE Verify） |
| POST | `/api/webhook/line` | LINE Webhook 事件接收（HMAC-SHA256 驗簽） |

## LINE 用戶管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/line-users` | 用戶列表（支援分頁、搜尋） |
| GET | `/api/line-users/:id` | 用戶詳情 |
| PATCH | `/api/line-users/:id/mode` | 切換 AI / manual 模式 |
| PATCH | `/api/line-users/:id/note` | 更新備註 |

## 訊息

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/messages` | 訊息列表（支援 line_user_id、日期、類型篩選） |
| GET | `/api/messages/export` | 匯出 CSV |
| GET | `/api/messages/dashboard` | 儀表板統計（今日訊息量、AI 回覆率、7 日趨勢） |

## 系統設定

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/settings` | 取得所有設定（加密欄位隱藏值） |
| PATCH | `/api/settings/:key` | 更新單一設定（加密欄位自動加密） |
| GET | `/api/settings/llm/test` | 測試 LLM 連線 |
| GET | `/api/settings/line/test` | 測試 LINE 連線（回傳 Bot 資訊） |

## 排程

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/schedules` | 排程列表 |
| POST | `/api/schedules` | 建立排程規則 |
| PATCH | `/api/schedules/:id` | 更新排程規則 |
| DELETE | `/api/schedules/:id` | 刪除排程規則 |

## 知識庫檔案

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/files` | 檔案列表 |
| POST | `/api/files` | 上傳檔案（multipart/form-data） |
| DELETE | `/api/files/:id` | 刪除檔案 |

## MCP Server 管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/mcp` | MCP Server 列表（api_key 遮蔽） |
| POST | `/api/mcp` | 新增 MCP Server |
| PUT | `/api/mcp/:id` | 更新 MCP Server |
| DELETE | `/api/mcp/:id` | 刪除 MCP Server |
| POST | `/api/mcp/:id/test` | 測試 MCP Server 連線 |
| POST | `/api/mcp/:id/refresh-tools` | 重新發現工具 |

---

## 管理後台頁面

| 路由 | 功能 |
|------|------|
| `/setup` | 初次啟動安裝精靈（含資料庫連線設定） |
| `/login` | 管理員登入 |
| `/change-password` | 強制密碼變更（首次登入） |
| `/dashboard` | 訊息量統計儀表板 |
| `/users` | LINE 用戶列表、AI 模式切換 |
| `/messages` | 訊息紀錄查詢、CSV 匯出 |
| `/schedules` | 排程管理 |
| `/knowledge` | 知識庫 PDF 上傳管理 |
| `/mcp` | MCP Server 管理 |
| `/settings` | LLM / RAG / LINE 串接設定、密碼修改、速率限制 |
