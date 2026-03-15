# API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 管理員註冊 |
| POST | `/api/auth/login` | 管理員登入，回傳 JWT |
| POST | `/api/webhook/line` | LINE Webhook（非同步驗簽）|
| GET | `/api/line-users` | LINE 用戶列表 |
| PATCH | `/api/line-users/:id/mode` | 切換 AI / 人工客服模式 |
| GET | `/api/messages` | 訊息紀錄（支援分頁、篩選）|
| GET | `/api/messages/export` | 匯出 CSV |
| GET | `/api/messages/dashboard` | 儀表板統計資料 |
| GET | `/api/settings` | 取得所有系統設定 |
| PATCH | `/api/settings` | 更新系統設定（加密欄位自動加密，並 invalidate 快取）|
| GET | `/api/settings/llm/test` | 測試 LLM API 連線 |
| GET/POST/PATCH/DELETE | `/api/schedules` | 排程 CRUD + 全域開關 |
| GET/POST/DELETE | `/api/files` | 知識庫檔案管理 |

---

## 管理後台頁面

| 路由 | 功能 |
|------|------|
| `/login` | 管理員登入 |
| `/dashboard` | 訊息量統計儀表板 |
| `/users` | LINE 用戶列表、AI 模式切換 |
| `/messages` | 訊息紀錄查詢、CSV 匯出 |
| `/schedules` | 定時傳訊排程管理 |
| `/knowledge` | 知識庫 PDF 上傳管理 |
| `/settings` | LLM / RAG / LINE 串接設定 |
