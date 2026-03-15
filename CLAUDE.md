# LINE 智能客服系統 - Claude Code 指引

## 專案概覽

LINE Messaging API 智能客服後台（Node.js + React）。
詳細架構見 [docs/architecture.md](docs/architecture.md)。

## 開發指令

```bash
# 後端
cd server && npm run dev          # nodemon 開發模式 (port 3000)
cd server && npm run migrate      # 執行 Knex migration

# 前端
cd client && npm run dev          # Vite 開發模式 (port 5173)
cd client && npm run build        # 生產建置
```

## 關鍵約定

- **設定優先順序**: DB (system_settings) → .env 環境變數
- **敏感欄位**: API Key、LINE 憑證使用 AES-256-GCM 加密存入 DB
- **LLM Provider**: gemini/openai/custom 共用 openai.provider.js，claude 用獨立 provider
- **前端 Proxy**: `/api` 請求自動轉發到 `http://localhost:3000`
