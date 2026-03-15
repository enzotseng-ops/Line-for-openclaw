# LINE 智能客服系統

無毒農 / OpenClaw — LINE Smart Customer Service System

一套給電商使用的 LINE Messaging API 智能客服後台，功能包含：
- LINE Bot 接收訊息 → AI 自動回覆（支援 Gemini / OpenAI / Claude）
- RAG 知識庫（Google Gemini File Search，支援 PDF 上傳）
- 人工 / AI 模式切換（per-user）
- 訊息紀錄查詢與 CSV 匯出
- 排程自動傳訊
- 管理後台 Web UI

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Node.js 18+ / Express 4 / Port 3000 |
| 前端 | React 18 / Vite 5 / Tailwind CSS / shadcn/ui / Port 5173 |
| 資料庫 | PostgreSQL 14+ / Knex.js ORM |
| AI | LLM Factory（Gemini / OpenAI / Claude / Custom）+ Google File Search RAG |
| 加密 | AES-256-GCM（敏感設定欄位） |
| 對外 | Cloudflare Tunnel（固定子網域） |

## 快速開始

> 完整步驟請參閱 [docs/setup.md](docs/setup.md)

```bash
# 1. 安裝依賴
cd server && npm install
cd ../client && npm install

# 2. 設定環境變數
cd ../server
cp .env.example .env
# 必填：DATABASE_URL、JWT_SECRET、ENCRYPTION_KEY

# 3. 建立資料表
npm run migrate

# 4. 啟動後端（Terminal 1）
npm run dev

# 5. 啟動前端（Terminal 2）
cd ../client && npm run dev

# 6.（可選）啟動 Cloudflare Tunnel（Terminal 3）
cloudflared tunnel run line-bot
```

- 前端：http://localhost:5173
- 後端：http://localhost:3000
- 對外：https://line-bot.openclaw-gb.com（需啟動 Cloudflare Tunnel）
- 預設管理員：`admin@example.com` / `admin123456`

### 初次啟動安裝精靈

首次啟動時，系統會自動偵測尚未完成的設定，並導向安裝精靈 `/setup`，引導你逐步完成：

1. **環境檢查** — 確認資料庫連線、.env 必填項
2. **管理員帳號** — 建立或登入管理員
3. **LINE 串接** — 填入 Channel Secret + Access Token，即時測試連線
4. **AI 模型** — 選擇 LLM 供應商（Gemini / OpenAI / Claude），填入 API Key

所有設定完成後會自動跳轉到管理後台。之後可在「系統設定」頁面隨時修改。

## 文件索引

| 文件 | 內容 |
|------|------|
| [docs/setup.md](docs/setup.md) | 環境變數、安裝步驟、Cloudflare Tunnel、LINE 串接 |
| [docs/database.md](docs/database.md) | 完整資料庫 Schema（6 張表）、欄位說明 |
| [docs/architecture.md](docs/architecture.md) | 技術架構、目錄結構、設計說明 |
| [docs/api.md](docs/api.md) | API 端點列表、管理後台路由 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 已知問題、踩坑紀錄、除錯方法 |
| [docs/todo.md](docs/todo.md) | 已完成功能、待完成項目 |

## License

MIT
