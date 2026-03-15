# LINE 智能客服系統

無毒農 / Greenbox — LINE Smart Customer Service System

一套給電商使用的 LINE Messaging API 智能客服後台，功能包含 LINE Bot 接收訊息 → AI 自動回覆、RAG 知識庫（Google File Search）、人工/AI 模式切換、訊息排程、管理後台 Web UI。

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Node.js + Express, Port 3000 |
| 前端 | React 18 + Vite + Tailwind + shadcn/ui, Port 5173 |
| 資料庫 | PostgreSQL (Zeabur) + Knex.js ORM |
| AI | Gemini / OpenAI / Claude (LLM Factory) + Google File Search RAG |
| 加密 | AES-256-GCM（敏感設定欄位） |

## 快速開始

```bash
cd server && npm install && cd ../client && npm install
cd ../server && cp .env.example .env   # 填入 DATABASE_URL、JWT_SECRET、ENCRYPTION_KEY
npm run migrate                         # 建立資料表（DB 已存在可跳過）
npm run dev                             # Terminal 1: 後端
cd ../client && npm run dev             # Terminal 2: 前端
```

- 前端：http://localhost:5173
- 後端：http://localhost:3000
- 預設管理員：`admin@example.com` / `admin123456`

## 文件索引

| 文件 | 內容 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 技術架構、目錄結構、設計說明 |
| [docs/database.md](docs/database.md) | 資料庫 Schema（6 張表）、DB 設定狀態、知識庫文件 |
| [docs/api.md](docs/api.md) | API 端點列表、管理後台路由 |
| [docs/setup.md](docs/setup.md) | 環境變數說明、快速開始詳細步驟、LINE 串接設定 |
| [docs/todo.md](docs/todo.md) | 已完成功能、待完成項目與已知問題 |
