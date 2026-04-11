# 疑難排解與踩坑紀錄

開發過程中遇到的問題與解法，方便後續接手者避免重蹈覆轍。

---

## 1. Bot 已驗證成功但不回覆訊息

### 症狀
- Settings 頁面「測試 LINE 連線」顯示已連線
- LINE Developers Console 的 Verify 也成功
- 傳訊息給 Bot 沒有回覆

### 根因
AI 回覆需要通過 4 項檢查（`shouldAIReply()`），任一項失敗就不回覆：

| 檢查項 | 條件 | 常見卡住原因 |
|--------|------|-------------|
| 全域開關 | `system_settings.global_ai_enabled = 'true'` | 預設值可能未設定 |
| 排程規則 | `isWithinSchedule()` 回傳 `true` | ~~原本沒有規則 = 不回覆~~ 已修復為預設 24/7 |
| 用戶模式 | `line_users.mode = 'ai'` | 用戶被切到 manual 模式 |
| 用戶啟用 | `line_users.is_active = true` | 用戶被停用 |

### 除錯方法
查看 server terminal 的 log：
```
info: AI reply check: user=Uxxxxx, mode=ai, active=true, result=true
```
如果 `result=false`，依序排查上述 4 項。

### 修復歷程
- `schedule_rules` 表為空時，原始邏輯回傳 `false`（沒有任何規則 = 永遠不在服務時間）
- **修復**：改為沒有規則時預設回傳 `true`（24/7 全時段服務），只有設定規則後才限制時段

---

## 2. 用戶管理 / 訊息紀錄頁面載入失敗

### 症狀
- 頁面顯示「載入失敗」或空白
- Console 出現 500 錯誤

### 根因
Knex.js 的 `query.clone()` 會複製整個 query chain 包含 `orderBy`，但 PostgreSQL 不允許在 `COUNT()` 查詢中使用 `ORDER BY`。

### 正確程式碼
```javascript
// ✅ orderBy 只用在分頁查詢
let query = db('line_users');
const total = await query.clone().count('id as count').first();
const users = await query.clone().select('*').orderBy('last_message_at', 'desc').limit(limit).offset(offset);
```

---

## 3. Webhook 回傳 `Cannot GET /api/webhook/line`

### 修復
加上 GET handler 用於健康檢查 + LINE Console 的瀏覽器驗證。

---

## 4. Cloudflare Tunnel 訪問得到空白頁

### 根因
Express 只提供 API 路由，React SPA 在 Vite dev server 上，外網只看得到 Express port。

### 修復
先建構前端：`cd client && npm run build`，Express 自動從 `client/dist/` 提供靜態檔。

---

## 5. Port 被佔用（EADDRINUSE）

```bash
lsof -i :8080 -t | xargs kill -9
cd server && npm run dev
```

---

## 6. Webhook 簽名驗證失敗（401 Invalid Signature）

| 原因 | 解法 |
|------|------|
| Channel Secret 未設定 | 在 Settings 頁面填入並儲存 |
| Channel Secret 不正確 | 重新從 LINE Developers Console 複製 |
| Body parsing 衝突 | Webhook route 使用 `express.raw()` 取得原始 body |

---

## 7. LLM 不回覆

### 除錯步驟
1. 檢查 server log 是否有 `LLM error:` 開頭的錯誤
2. Settings 頁面點「測試 LLM 連線」
3. 確認 API Key 和模型名稱

---

## 8. 設定修改後沒有生效

### 原因
`settings.service.js` 有 60 秒記憶體快取。透過 API 更新會自動 invalidate，但直接改 DB 需要等 60 秒或重啟 server。

---

## 9. 知識庫上傳中文檔名失敗

已內建解法：上傳前自動改為 ASCII 安全檔名。

---

## 10. 登入被鎖定（429 Too Many Requests）

### 症狀
- 登入時顯示「登入嘗試過多，請 15 分鐘後再試」
- API 回傳 429 狀態碼

### 解法
1. **等待 15 分鐘**後重試
2. **重新部署**（速率限制使用記憶體儲存，重啟後計數器重設）

> **Setup 模式下自動跳過 rate limit**，不會影響初始設定精靈。

---

## 11. LINE 用戶被速率限制

### 解法
在管理後台 **系統設定** → **對話設定** → **速率限制** 調整上限，設為 0 則不限制。

---

## 12. Zeabur 部署 — 502 Bad Gateway

### 症狀
部署後立即崩潰，返回 502

### 可能原因與解法

| 原因 | 解法 |
|------|------|
| `Cannot find module '/src/index.js'` | 確認根目錄 `package.json` 有 `"start": "cd server && node src/index.js"` |
| 檔案系統唯讀導致 `.env` 寫入失敗 | `ensureEnv.js` 已處理：env vars 已設定時跳過所有 file I/O |
| PORT 不正確 | Zeabur 會注入 `PORT` 環境變數，預設 fallback 為 8080 |

---

## 13. Zeabur 部署 — Not allowed by CORS

### 症狀
靜態資源（JS/CSS）被 CORS 擋：`Not allowed by CORS` on `/assets/index-*.js`

### 根因
靜態檔案放在 CORS middleware 之後被擋。

### 已修復
- 靜態檔案 serve（`express.static`）移到 CORS middleware 之前
- CORS 改為 `cors()` 允許所有來源（前後端同域部署不需要嚴格 CORS）

---

## 14. Zeabur 部署 — The server does not support SSL connections

### 症狀
資料庫連線失敗：`The server does not support SSL connections`

### 根因
程式碼硬寫 `ssl: { rejectUnauthorized: false }`，但 Zeabur PostgreSQL 不支援 SSL。

### 已修復
移除硬寫的 SSL 設定，直接使用連線字串。如需 SSL，在連線字串尾巴加 `?sslmode=require`。

---

## 15. Setup 精靈 — 資料庫已設定但連線失敗

### 症狀
Zeabur 已注入 `DATABASE_URL`，但 Setup 精靈 Step 1 顯示「未設定」

### 根因
原本只有 `setupMode === true` 才顯示 DATABASE_URL 輸入框，但 DATABASE_URL 已存在時 setupMode 是 false，即使連不上也無法重新設定。

### 已修復
改為**只要資料庫未連線就顯示輸入框**（`setupMode || !database.configured`）。後端也允許在 DB 連線失敗時重新設定。

---

## 16. Setup 精靈 — 登入嘗試過多

### 症狀
在 Setup 精靈 Step 2 多次嘗試後被 rate limit 擋：「登入嘗試過多，請 15 分鐘後再試」

### 根因
`express-rate-limit` 在 Setup 期間也生效，加上 Zeabur 反向代理讓所有請求共用同一個內部 IP。

### 已修復
1. Setup 模式下自動跳過 rate limit（`skip: () => process.env.SETUP_MODE === 'true'`）
2. 加上 `app.set('trust proxy', 1)` 讓 rate limiter 使用真實 IP

---

## 開發環境常用指令

```bash
# 查看 server 是否運行
curl http://localhost:8080/health

# 查看資料庫設定
cd server && node -e "
const db = require('./src/config/db');
(async () => {
  const rows = await db('system_settings').select('key', 'value');
  rows.forEach(r => console.log(r.key, '=', r.value?.substring(0,30)));
  process.exit(0);
})();
"

# 查看訊息數量
cd server && node -e "
const db = require('./src/config/db');
(async () => {
  const c = await db('messages').count('id as count').first();
  console.log('Messages:', c.count);
  process.exit(0);
})();
"
```
