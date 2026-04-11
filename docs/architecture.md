# 技術架構

## 後端（`server/`）
- **Runtime**: Node.js + Express
- **Port**: 8080（預設，可透過 `PORT` 環境變數覆蓋）
- **DB**: PostgreSQL（連線字串透過 Web 設定精靈或環境變數設定）
- **ORM**: Knex.js（migration 檔案在 `server/src/migrations/`）
- **啟動方式**: `cd server && npm run dev`（nodemon 自動重啟）
- **部署**: Zeabur（原生 Node.js，不使用 Docker）

## 前端（`client/`）
- **Framework**: React 18 + Vite
- **Port**: 5173（開發模式）
- **UI**: Tailwind CSS + shadcn/ui
- **啟動方式**: `cd client && npm run dev`
- **Proxy**: `/api` → `http://localhost:8080`
- **Production**: `npm run build` 後由 Express 提供靜態檔

---

## 目錄結構

```
Line-for-openclaw/
├── server/
│   ├── src/
│   │   ├── index.js                    # Express 入口點
│   │   ├── config/
│   │   │   ├── db.js                  # Knex wrapper（支援熱替換 reinitialize）
│   │   │   ├── ensureEnv.js           # 啟動時自動產生 JWT_SECRET / ENCRYPTION_KEY
│   │   │   ├── encryption.js          # AES-256-GCM 加解密
│   │   │   └── logger.js              # Winston logger
│   │   ├── routes/                    # API 路由定義
│   │   ├── controllers/
│   │   │   ├── setup.controller.js    # 初始設定 + 資料庫連線設定（configureDatabase）
│   │   │   ├── auth.controller.js     # JWT 登入/驗證
│   │   │   ├── lineUser.controller.js # LINE 用戶管理
│   │   │   ├── message.controller.js  # 訊息紀錄查詢
│   │   │   ├── schedule.controller.js # 排程管理
│   │   │   ├── settings.controller.js # 系統設定（含加密欄位）
│   │   │   ├── files.controller.js    # 知識庫檔案上傳
│   │   │   ├── mcp.controller.js      # MCP Server 管理
│   │   │   └── webhook.controller.js  # LINE Webhook 入口（非同步驗簽）
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── factory.js         # LLM Provider 工廠
│   │   │   │   ├── openai.provider.js # OpenAI + Gemini（共用 provider）
│   │   │   │   └── claude.provider.js # Anthropic Claude provider
│   │   │   ├── mcp.service.js         # MCP Server 連線、工具發現、工具呼叫
│   │   │   ├── line.service.js        # LINE 訊息處理（async getLineClient）
│   │   │   ├── rag.service.js         # Google Gemini File Search RAG
│   │   │   ├── rateLimit.service.js   # LINE 用戶 AI 回覆速率限制
│   │   │   ├── scheduler.service.js   # 排程自動傳訊
│   │   │   └── settings.service.js    # DB-first 設定讀取（60s 快取）
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT 驗證 middleware
│   │   │   ├── errorHandler.js        # 全域錯誤處理
│   │   │   ├── loginRateLimit.js      # 登入/註冊 IP 速率限制
│   │   │   └── setupGuard.js          # Setup 模式路由守衛
│   │   └── migrations/                # Knex migration 檔案（9 個）
│   ├── uploads/                       # 上傳的媒體 & 知識庫暫存
│   └── .env                           # 環境變數（自動產生，不 commit）
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Setup.jsx              # 初次啟動安裝精靈（6 步驟，含 DB 連線設定）
│       │   ├── Dashboard.jsx          # 訊息統計儀表板
│       │   ├── Users.jsx              # LINE 用戶列表、AI/人工切換
│       │   ├── Messages.jsx           # 訊息紀錄、CSV 匯出
│       │   ├── Schedules.jsx          # 排程管理
│       │   ├── Knowledge.jsx          # 知識庫檔案管理
│       │   ├── McpServers.jsx         # MCP Server 管理
│       │   └── Settings.jsx           # LLM / RAG / LINE 串接設定
│       ├── components/                # 共用 UI 元件
│       ├── services/                  # API fetch 封裝
│       └── hooks/                     # 自定義 React Hooks
└── package.json                       # 根目錄 start/build scripts（Zeabur 部署用）
```

---

## 重要設計說明

### 零配置啟動（Zero-Config Startup）

系統支援完全零配置啟動，不需要手動建立 `.env` 檔案：

1. **`ensureEnv.js`** — 啟動時檢查環境變數：
   - `DATABASE_URL` 缺失 → 進入 **Setup Mode**（不崩潰）
   - `JWT_SECRET` 缺失 → 自動產生 `crypto.randomBytes(48).toString('base64')`
   - `ENCRYPTION_KEY` 缺失 → 自動產生 `crypto.randomBytes(32).toString('hex')`
   - 產生的 key 嘗試寫回 `.env`，唯讀檔案系統（容器環境）則跳過

2. **`db.js` Knex Wrapper** — 支援熱替換的資料庫連線：
   - 導出 wrapper function，所有 consumer 呼叫 `db('table')` 委派給內部 instance
   - `db.isConfigured()` — 檢查是否已初始化
   - `db.reinitialize(url)` — 熱替換連線（Setup 精靈使用）

3. **`setupGuard.js`** — Setup 模式路由守衛：
   - Setup Mode 下只放行 `/api/setup/*`、`/api/auth/*`、`/health`
   - 其他 API 回傳 `503 { setupRequired: true }`
   - 靜態檔案不受影響（在 CORS middleware 之前 serve）

4. **Setup 精靈 Web UI** — Step 1 可輸入 DATABASE_URL：
   - `POST /api/setup/database` → 測試連線 → 存 `.env` → reinitialize → 自動跑 migration
   - 資料庫連線失敗時也顯示輸入框（不限於 Setup Mode）

### MCP Server 管理

- 支援 SSE 和 Streamable HTTP 兩種傳輸方式
- 支援 Bearer Token 和 X-Api-Key 兩種認證方式（`auth_type` 欄位）
- API Key 使用 AES-256-GCM 加密儲存
- 工具發現結果快取 5 分鐘
- 連線池（in-memory Map）維持持久連線
- LLM 整合：工具自動轉換為 Claude / OpenAI 格式

### settings.service.js（核心設定服務）
- 所有敏感設定（API Key、LINE 憑證）優先從 DB 讀取
- DB 讀取失敗才 fallback 到 `.env` 環境變數
- 60 秒記憶體快取，避免每次請求都查 DB
- 更新設定後必須呼叫 `invalidate(key)` 刷新快取（settings.controller.js 已處理）

### RAG 中文檔名處理
- Google Gemini File Upload API 不接受 HTTP Header 中的中文字元
- 解法：上傳前將檔案複製到 `/tmp/` 並改為 ASCII 安全檔名，上傳完成後刪除暫存
- 相關邏輯在 `files.controller.js` 和 `files.routes.js`

### 安全防護架構

系統內建兩層速率限制：

1. **IP 層級**（`loginRateLimit.js`）：使用 `express-rate-limit`，保護登入和註冊端點免受暴力破解
   - 登入：每 IP 每 15 分鐘 10 次
   - 註冊：每 IP 每小時 3 次
   - **Setup 模式下自動跳過**（避免設定精靈被鎖）
   - 記憶體儲存（單實例部署適用）

2. **用戶層級**（`rateLimit.service.js`）：DB-based 查詢，限制單一 LINE 用戶的 AI 回覆頻率
   - 查詢 `messages` 表中的 AI outbound 記錄
   - 可在管理後台動態調整（`rate_limit_window_minutes`、`rate_limit_max_messages`）
   - 設為 0 時不限制

### CORS 設定
- 預設允許所有來源（`cors()`）
- 前後端同域部署（Express 提供 React 靜態檔），不需要嚴格 CORS

### Proxy 信任
- `app.set('trust proxy', 1)` — 信任第一層代理（Zeabur / Cloudflare），確保 rate limiter 使用真實 IP

### LLM Provider 路由
- `gemini` provider 使用 `openai.provider.js`，但 baseURL 指向 Google 的 OpenAI 相容端點
  - `https://generativelanguage.googleapis.com/v1beta/openai/`
- `anthropic` provider 使用獨立的 `claude.provider.js`
- `openai` / `custom` provider 使用標準 `openai.provider.js`
- MCP 工具自動注入所有 LLM provider 的請求中

### 啟動時自動執行 Migration
- `index.js` 在 `app.listen` callback 中呼叫 `db.migrate.latest()`
- 部署到 Zeabur 時不需要手動跑 `npm run migrate`
- Migration 是冪等的，已執行的不會重複執行
