# 技術架構

## 後端（`server/`）
- **Runtime**: Node.js + Express
- **Port**: 3000
- **DB**: PostgreSQL（LineAIBotDB，連線字串在 `server/.env`）
- **ORM**: Knex.js（migration 檔案在 `server/src/migrations/`）
- **啟動方式**: `cd server && npm run dev`（nodemon 自動重啟）

## 前端（`client/`）
- **Framework**: React 18 + Vite
- **Port**: 5173
- **UI**: Tailwind CSS + shadcn/ui
- **啟動方式**: `cd client && npm run dev`
- **Proxy**: `/api` → `http://localhost:3000`

---

## 目錄結構

```
Line-for-openclaw/
├── server/
│   ├── src/
│   │   ├── index.js                    # Express 入口點，port 3000
│   │   ├── config/
│   │   │   ├── database.js             # Knex PostgreSQL 設定
│   │   │   ├── encryption.js           # AES-256-GCM 加解密
│   │   │   └── logger.js               # Winston logger
│   │   ├── routes/                     # API 路由定義
│   │   ├── controllers/
│   │   │   ├── setup.controller.js    # 初始設定狀態檢查 + 批次初始化
│   │   │   ├── auth.controller.js      # JWT 登入/驗證
│   │   │   ├── lineUser.controller.js  # LINE 用戶管理
│   │   │   ├── message.controller.js   # 訊息紀錄查詢
│   │   │   ├── schedule.controller.js  # 排程管理
│   │   │   ├── settings.controller.js  # 系統設定（含加密欄位）
│   │   │   ├── files.controller.js     # 知識庫檔案上傳
│   │   │   └── webhook.controller.js   # LINE Webhook 入口（非同步驗簽）
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   │   ├── factory.js          # LLM Provider 工廠
│   │   │   │   ├── openai.provider.js  # OpenAI + Gemini（共用 provider）
│   │   │   │   └── claude.provider.js  # Anthropic Claude provider
│   │   │   ├── line.service.js         # LINE 訊息處理（async getLineClient）
│   │   │   ├── rag.service.js          # Google Gemini File Search RAG
│   │   │   ├── scheduler.service.js    # 排程自動傳訊
│   │   │   └── settings.service.js     # DB-first 設定讀取（60s 快取）
│   │   ├── middleware/                 # JWT auth、錯誤處理
│   │   └── migrations/                 # Knex migration 檔案（6 張表）
│   ├── uploads/                        # 上傳的媒體 & 知識庫暫存
│   └── .env                            # 環境變數（不 commit）
└── client/
    └── src/
        ├── pages/
        │   ├── Setup.jsx               # 初次啟動安裝精靈（6 步驟）
│   ├── Dashboard.jsx           # 訊息統計儀表板
        │   ├── Users.jsx               # LINE 用戶列表、AI/人工切換
        │   ├── Messages.jsx            # 訊息紀錄、CSV 匯出
        │   ├── Schedules.jsx           # 排程管理
        │   ├── Knowledge.jsx           # 知識庫檔案管理
        │   └── Settings.jsx            # LLM / RAG / LINE 串接設定
        ├── components/                 # 共用 UI 元件
        ├── services/                   # API fetch 封裝
        └── hooks/                      # 自定義 React Hooks
```

---

## 重要設計說明

### settings.service.js（核心設定服務）
- 所有敏感設定（API Key、LINE 憑證）優先從 DB 讀取
- DB 讀取失敗才 fallback 到 `.env` 環境變數
- 60 秒記憶體快取，避免每次請求都查 DB
- 更新設定後必須呼叫 `invalidate(key)` 刷新快取（settings.controller.js 已處理）

### RAG 中文檔名處理
- Google Gemini File Upload API 不接受 HTTP Header 中的中文字元
- 解法：上傳前將檔案複製到 `/tmp/` 並改為 ASCII 安全檔名，上傳完成後刪除暫存
- 相關邏輯在 `files.controller.js` 和 `files.routes.js`

### LLM Provider 路由
- `gemini` provider 使用 `openai.provider.js`，但 baseURL 指向 Google 的 OpenAI 相容端點
  - `https://generativelanguage.googleapis.com/v1beta/openai/`
- `anthropic` provider 使用獨立的 `claude.provider.js`
- `openai` / `custom` provider 使用標準 `openai.provider.js`
