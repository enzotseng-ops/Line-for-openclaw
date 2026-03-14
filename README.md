# LINE 智能客服系統

無毒農 / Greenbox — LINE Smart Customer Service System

## 功能特色

- **AI 自動回覆**：整合 Claude / OpenAI / Custom LLM，透過工廠模式輕鬆切換
- **RAG 知識庫**：使用 OpenAI Assistants API File Search 建立企業知識庫
- **混合模式**：全域開關 + 時間排程 + 用戶級別模式三層控制
- **管理後台**：React 管理介面，含儀表板、用戶管理、訊息紀錄、排程設定等
- **CSV 匯出**：完整訊息紀錄匯出

## 系統需求

- Node.js v18+
- PostgreSQL
- ngrok（本地開發）

## 快速開始

### 1. 建立資料庫

```bash
createdb line_cs
```

### 2. 安裝依賴

```bash
npm run install:all
```

### 3. 設定環境變數

```bash
cd server
cp .env.example .env
# 編輯 .env，填入 LINE Channel Secret 與 Access Token
```

`.env` 範例：

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/line_cs
JWT_SECRET=your-jwt-secret-key
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
ENCRYPTION_KEY=<64個hex字元的隨機字串>
```

生成 ENCRYPTION_KEY：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 執行資料庫 Migration

```bash
npm run migrate
```

### 5. 啟動服務

```bash
# 後端 (Terminal 1)
npm run dev:server

# 前端 (Terminal 2)
npm run dev:client

# ngrok (Terminal 3)
ngrok http 3000
```

### 6. 設定 LINE Webhook

將 ngrok 產生的 URL 填入 LINE Developers Console：
```
https://<your-ngrok-url>/api/webhook/line
```

### 7. 建立管理員帳號

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password","name":"Admin"}'
```

## 架構說明

```
Line-for-openclaw/
├── server/                    # Node.js + Express 後端
│   ├── src/
│   │   ├── index.js           # Express 入口點
│   │   ├── config/            # DB、加密、Logger 設定
│   │   ├── routes/            # API 路由
│   │   ├── controllers/       # 請求處理器
│   │   ├── services/
│   │   │   ├── llm/           # LLM Factory (Claude/OpenAI/Custom)
│   │   │   ├── line.service.js
│   │   │   ├── rag.service.js
│   │   │   └── scheduler.service.js
│   │   ├── middleware/        # JWT 驗證、錯誤處理
│   │   └── migrations/        # 資料庫 Migration
│   └── uploads/               # 媒體檔案 & 知識庫檔案
└── client/                    # React + Vite 前端
    └── src/
        ├── pages/             # 各頁面
        ├── components/        # 共用元件
        ├── services/          # API 呼叫封裝
        └── hooks/             # 自定義 Hooks
```

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/auth/register | 註冊管理員 |
| POST | /api/auth/login | 登入 |
| POST | /api/webhook/line | LINE Webhook |
| GET | /api/line-users | 用戶列表 |
| PATCH | /api/line-users/:id/mode | 切換 AI/人工模式 |
| GET | /api/messages | 訊息紀錄 |
| GET | /api/messages/export | CSV 匯出 |
| GET | /api/messages/dashboard | 儀表板統計 |
| GET/PATCH | /api/settings | 系統設定 |
| GET | /api/settings/llm/test | 測試 LLM 連線 |
| GET/POST/PATCH/DELETE | /api/schedules | 排程管理 |
| GET/POST/DELETE | /api/files | 知識庫檔案 |

## 環境變數說明

| 變數 | 說明 |
|------|------|
| PORT | 服務埠（預設 3000） |
| DATABASE_URL | PostgreSQL 連線字串 |
| JWT_SECRET | JWT 簽名金鑰 |
| LINE_CHANNEL_SECRET | LINE Channel Secret |
| LINE_CHANNEL_ACCESS_TOKEN | LINE Channel Access Token |
| ENCRYPTION_KEY | AES-256 加密金鑰（64 個 hex 字元） |

## 管理後台頁面

| 路由 | 功能 |
|------|------|
| /login | 登入 |
| /dashboard | 儀表板統計 |
| /users | LINE 用戶管理、模式切換 |
| /messages | 訊息紀錄、CSV 匯出 |
| /schedules | 排程設定 + 全域開關 |
| /knowledge | 知識庫檔案上傳 |
| /settings | LLM 設定、System Prompt |

## 注意事項

- LINE 免費方案每月有 500 則推送訊息限制（Reply Message 不計）
- ngrok 免費版每次啟動產生新 URL，需重新設定 LINE Webhook
- LLM API Key 以 AES-256-GCM 加密儲存於資料庫
- 媒體訊息（圖片/影片）僅儲存，不觸發 AI 回覆
