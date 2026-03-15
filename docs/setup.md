# 環境設定與快速開始

## 前置需求

- **Node.js** 18+（建議 20 LTS）
- **npm** 9+
- **PostgreSQL** 14+（本專案使用 LineAIBotDB）
- **cloudflared**（Cloudflare Tunnel CLI，用於對外網址）

---

## 環境變數（`server/.env`）

從範本複製：
```bash
cd server && cp .env.example .env
```

| 變數 | 必填 | 說明 | 備註 |
|------|------|------|------|
| `PORT` | | 後端服務埠 | 預設 3000 |
| `DATABASE_URL` | **必填** | PostgreSQL 連線字串 | 格式：`postgresql://user:pass@host:port/dbname` |
| `JWT_SECRET` | **必填** | JWT 簽名金鑰 | ⚠️ 上線前必須換強隨機字串 |
| `ENCRYPTION_KEY` | **必填** | AES-256-GCM 加密金鑰 | 64 個 hex 字元 |
| `LINE_CHANNEL_SECRET` | | LINE Channel Secret（Fallback） | 優先從 DB 讀取 |
| `LINE_CHANNEL_ACCESS_TOKEN` | | LINE Channel Access Token（Fallback） | 優先從 DB 讀取 |
| `GOOGLE_AI_API_KEY` | | Google Gemini API Key（Fallback） | 優先從 DB 讀取 |

> **設定優先順序**：管理後台 Settings 頁面寫入 DB → DB 讀取 → `.env` 環境變數 fallback

生成 ENCRYPTION_KEY：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生成強 JWT_SECRET：
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 安裝步驟

### Step 1：安裝依賴

```bash
# 後端
cd server && npm install

# 前端
cd ../client && npm install
```

### Step 2：設定環境變數

```bash
cd ../server
cp .env.example .env
# 用編輯器填入 DATABASE_URL、JWT_SECRET、ENCRYPTION_KEY
```

### Step 3：建立資料庫

```bash
# 執行所有 migration（建立 6 張表 + seed 預設管理員和設定）
npm run migrate
```

> 如果 DB 已存在且有資料，此步驟會跳過已執行的 migration。

### Step 4：啟動服務

```bash
# Terminal 1：後端（nodemon 自動重啟）
cd server && npm run dev

# Terminal 2：前端（Vite dev server）
cd client && npm run dev
```

- 前端：http://localhost:5173
- 後端：http://localhost:3000
- 預設管理員：`admin@example.com` / `admin123456`

### Step 5：初次啟動安裝精靈

首次開啟瀏覽器訪問系統時，會自動偵測設定狀態並導向安裝精靈（`/setup`）。安裝精靈會引導你完成：

1. **環境檢查** — 確認資料庫連線正常
2. **管理員帳號** — 建立新帳號或用預設帳號登入
3. **LINE 串接** — 填入 Channel Secret + Access Token，可即時測試
4. **AI 模型** — 選擇 Gemini / OpenAI / Claude，填入 API Key，可即時測試

> LINE 和 AI 模型步驟可以先跳過，之後在「系統設定」頁面補完。所有設定完成後會自動跳轉到管理後台。

### Step 6：（可選）建構前端靜態檔

如果要用 Express 直接提供前端（不用 Vite dev server），例如透過 Cloudflare Tunnel 對外：

```bash
cd client && npm run build
```

建構完成後 Express 會自動從 `client/dist/` 提供靜態檔，前後端共用 port 3000。

---

## Cloudflare Tunnel（對外固定網址）

本專案使用 Cloudflare Tunnel 建立固定公開網址，取代 ngrok。

### 為什麼用 Cloudflare Tunnel？

| | ngrok | Cloudflare Tunnel |
|--|-------|-------------------|
| 網址 | 每次重啟都換 | **固定子網域** |
| LINE Webhook | 每次都要改 | 設一次就好 |
| 費用 | 免費方案有限制 | 完全免費 |
| 自訂網域 | 付費功能 | 免費支援 |

### 首次設定（已完成，新開發者不需要重做）

```bash
# 1. 安裝 cloudflared
brew install cloudflared

# 2. 登入（會開瀏覽器驗證）
cloudflared tunnel login

# 3. 建立具名隧道
cloudflared tunnel create line-bot

# 4. 設定 DNS CNAME（將子網域指向隧道）
cloudflared tunnel route dns line-bot line-bot.openclaw-gb.com

# 5. 建立設定檔
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <你的隧道 UUID>
credentials-file: ~/.cloudflared/<你的隧道 UUID>.json

ingress:
  - hostname: line-bot.openclaw-gb.com
    service: http://localhost:3000
  - service: http_status:404
EOF
```

### 日常啟動

```bash
# 啟動隧道（將本機 :3000 對外為 https://line-bot.openclaw-gb.com）
cloudflared tunnel run line-bot
```

- 隧道名稱：`line-bot`
- 公開網址：`https://line-bot.openclaw-gb.com`
- Webhook URL：`https://line-bot.openclaw-gb.com/api/webhook/line`
- 設定檔：`~/.cloudflared/config.yml`

> **注意**：啟動 Tunnel 前，需先確保 Express 已啟動且前端已 build（`cd client && npm run build`），否則外網訪問會得到空白頁。

---

## LINE Messaging API 串接

### Step 1：建立 LINE Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Provider（如已有可跳過）
3. 建立 **Messaging API Channel**

### Step 2：取得憑證

1. **Basic Settings** → 取得 `Channel Secret`
2. **Messaging API** → 點 `Issue` 取得 `Channel Access Token`（long-lived）

### Step 3：填入本系統

1. 登入管理後台 → **系統設定** 頁面
2. 在「LINE Messaging API 串接設定」區塊填入：
   - Channel Secret
   - Channel Access Token
3. 點「儲存」
4. 點「測試 LINE 連線」確認 Bot 資訊正確

### Step 4：設定 Webhook

1. 確保 Cloudflare Tunnel 正在運行
2. 回到 LINE Developers Console → 你的 Channel → **Messaging API** 頁籤
3. **Webhook settings** → 點 **Edit**，填入：
   ```
   https://line-bot.openclaw-gb.com/api/webhook/line
   ```
4. 點 **Update** 儲存
5. 點 **Verify** 測試 → 應顯示 **Success**
6. 確保 **Use webhook** 已開啟

### Step 5：關閉自動回應

在 [LINE Official Account Manager](https://manager.line.biz/)：
1. 進入你的官方帳號
2. **設定** → **回應設定**
3. 關閉「**自動回應訊息**」（否則 LINE 會同時回覆預設訊息和 AI 回覆）

---

## LLM（AI 模型）設定

在管理後台 **系統設定** 頁面：

| 設定 | 說明 |
|------|------|
| LLM Provider | 選擇 AI 供應商：Gemini / OpenAI / Claude / Custom |
| API Key | 對應供應商的 API Key |
| Model | 模型名稱（如 `gemini-2.5-flash`、`gpt-4o`、`claude-sonnet-4-20250514`） |
| System Prompt | AI 客服的系統提示詞 |

> Gemini 使用 Google 的 OpenAI 相容端點：`https://generativelanguage.googleapis.com/v1beta/openai/`

## RAG 知識庫設定

1. 在 **系統設定** 填入 Google AI API Key 和 File Search Store Name
2. 前往 **知識庫** 頁面上傳 PDF 文件
3. 上傳成功後狀態會變為 `ready`

> RAG 使用 Google Gemini File Search API，上傳的文件會建立向量索引用於語意搜尋。
