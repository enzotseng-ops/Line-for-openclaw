# 環境設定與快速開始

## 環境變數（`server/.env`）

| 變數 | 說明 | 備註 |
|------|------|------|
| `PORT` | 後端服務埠 | 預設 3000 |
| `DATABASE_URL` | PostgreSQL 連線字串 | Zeabur 雲端 |
| `JWT_SECRET` | JWT 簽名金鑰 | ⚠️ 目前為弱 default，上線前必須換強金鑰 |
| `ENCRYPTION_KEY` | AES-256-GCM 加密金鑰 | 64 個 hex 字元，必填 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret（Fallback） | 優先從 DB 讀取 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token（Fallback） | 優先從 DB 讀取 |
| `GOOGLE_AI_API_KEY` | Google Gemini API Key（Fallback） | 優先從 DB 讀取 |

生成 ENCRYPTION_KEY：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 快速開始（接手開發）

```bash
# 1. 安裝依賴
cd server && npm install
cd ../client && npm install

# 2. 設定環境變數
cd ../server
cp .env.example .env  # 填入 DATABASE_URL、JWT_SECRET、ENCRYPTION_KEY

# 3. 執行 Migration（如果 DB 已存在可跳過）
npm run migrate

# 4. 啟動後端（Terminal 1）
npm run dev

# 5. 啟動前端（Terminal 2）
cd ../client && npm run dev
```

- 前端：http://localhost:5173
- 後端：http://localhost:3000
- 預設管理員：`admin@example.com` / `admin123456`

---

## Cloudflare Tunnel（對外網址）

本專案使用 Cloudflare Tunnel 建立固定公開網址，取代 ngrok。

```bash
# 啟動隧道（將本機 :3000 對外為 https://line-bot.openclaw-gb.com）
cloudflared tunnel run line-bot
```

- 隧道名稱：`line-bot`
- 公開網址：`https://line-bot.openclaw-gb.com`
- Webhook URL：`https://line-bot.openclaw-gb.com/api/webhook/line`
- 設定檔：`~/.cloudflared/config.yml`

---

## LINE 串接設定

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立或選擇一個 Messaging API Channel
3. 在 **Basic Settings** 取得 `Channel Secret`
4. 在 **Messaging API** 取得 `Channel Access Token`
5. 啟動 Cloudflare Tunnel：`cloudflared tunnel run line-bot`
6. 在 LINE Developers Console 設定 Webhook URL：`https://line-bot.openclaw-gb.com/api/webhook/line`
7. 在本專案 **Settings → LINE 串接設定** 頁面填入 Channel Secret 和 Access Token
8. 點擊「測試 LINE 連線」確認 Bot 資訊正確

> 完整圖文教學請參閱管理後台 **Settings** 頁面底部的展開式教學。
