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
| `JWT_SECRET` | **必填** | JWT 簽名金鑰 | 見下方說明 |
| `ENCRYPTION_KEY` | **必填** | AES-256-GCM 加密金鑰 | 見下方說明 |
| `LINE_CHANNEL_SECRET` | | LINE Channel Secret（Fallback） | 優先從 DB 讀取 |
| `LINE_CHANNEL_ACCESS_TOKEN` | | LINE Channel Access Token（Fallback） | 優先從 DB 讀取 |
| `GOOGLE_AI_API_KEY` | | Google Gemini API Key（Fallback） | 優先從 DB 讀取 |

> **設定優先順序**：管理後台 Settings 頁面寫入 DB → DB 讀取 → `.env` 環境變數 fallback

### JWT_SECRET（重要！）

**用途**：簽署和驗證管理員登入的 JWT Token。

**風險**：如果使用預設值或被他人取得，任何人都能偽造管理員身份登入後台。

**規則**：
- 系統啟動時會檢查此值，**不能留空**，也**不能使用 `.env.example` 裡的預設值**
- 使用預設值 `your-jwt-secret-key-change-in-production` 時，server 會拒絕啟動
- 更換後，所有已登入的 session 會失效，需重新登入

**生成方式**：
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### ENCRYPTION_KEY（重要！）

**用途**：用 AES-256-GCM 加密儲存在資料庫中的敏感設定（LINE Channel Secret、Access Token、LLM API Key 等）。

**風險**：如果遺失此 key，已加密的設定將無法解密，需要重新填入所有 API 金鑰。

**規則**：
- 必須是 **64 個十六進位字元**（= 32 bytes）
- 系統啟動時會檢查，**未設定則拒絕啟動**
- **請務必備份此值**，更換後舊資料無法解密

**生成方式**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 啟動檢查

系統啟動時會自動檢查以下項目，任一不通過則拒絕啟動並顯示錯誤訊息：

| 檢查項目 | 錯誤訊息 |
|----------|---------|
| `DATABASE_URL` 未設定 | `Missing required environment variable: DATABASE_URL` |
| `JWT_SECRET` 未設定 | `Missing required environment variable: JWT_SECRET` |
| `JWT_SECRET` 為預設值 | `JWT_SECRET is still the default placeholder` |
| `ENCRYPTION_KEY` 未設定 | `Missing required environment variable: ENCRYPTION_KEY` |

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
- 預設管理員：`admin@example.com` / `admin123456`（首次登入後請至設定頁面修改密碼）

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

---

## 安全防護（內建）

系統內建以下安全防護，安裝後自動生效，無需額外設定：

### 登入速率限制

使用 `express-rate-limit` 防止暴力破解和 DDoS：

| 端點 | 限制 | 超限回應 |
|------|------|---------|
| `POST /api/auth/login` | 每 IP 每 15 分鐘 10 次 | 429 + `登入嘗試過多，請 15 分鐘後再試。` |
| `POST /api/auth/register` | 每 IP 每小時 3 次 | 429 + `註冊嘗試過多，請 1 小時後再試。` |

超限時前端會自動顯示中文錯誤訊息。Server log 會記錄被限制的 IP 和嘗試登入的 email。

### LINE 用戶 AI 回覆速率限制

防止單一 LINE 用戶頻繁觸發 AI 回覆造成 Token 費用暴漲：

| 設定 | 預設值 | 說明 |
|------|--------|------|
| `rate_limit_window_minutes` | 5 | 時間窗口（分鐘） |
| `rate_limit_max_messages` | 10 | 窗口內最大 AI 回覆數 |

在管理後台 **系統設定** → **對話設定** → **速率限制** 區塊可調整。設為 0 則不限制。

超限時 Bot 會回覆：「您發送訊息太頻繁，請 X 分鐘後再試。（上限：每 X 分鐘 Y 則）」

### 密碼管理

管理員可在 **系統設定** 頁面修改密碼：
- 需輸入目前密碼驗證身份
- 新密碼至少 8 個字元
- 使用 bcryptjs（salt rounds 10）雜湊儲存

### CORS 設定

預設允許 `*.openclaw-gb.com` 子網域和本地開發埠（5173-5175）。可透過環境變數自訂：

```bash
# server/.env（可選）
CLIENT_URL=https://your-domain.com
CORS_ALLOWED_ORIGINS=*.your-domain.com,*.another-domain.com
```
