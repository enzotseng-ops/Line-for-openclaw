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
Knex.js 的 `query.clone()` 會複製整個 query chain 包含 `orderBy`，但 PostgreSQL 不允許在 `COUNT()` 查詢中使用 `ORDER BY`：

```
ERROR: column "line_users.last_message_at" must appear in the GROUP BY clause
       or be used in an aggregate function
```

### 錯誤程式碼
```javascript
// ❌ orderBy 被 clone 到 count 查詢
let query = db('line_users').orderBy('last_message_at', 'desc');
const total = await query.clone().count('id as count').first();  // 報錯！
```

### 正確程式碼
```javascript
// ✅ orderBy 只用在分頁查詢
let query = db('line_users');
const total = await query.clone().count('id as count').first();
const users = await query.clone().select('*').orderBy('last_message_at', 'desc').limit(limit).offset(offset);
```

### 影響範圍
- `lineUsers.controller.js` — 用戶列表
- `messages.controller.js` — 訊息列表

---

## 3. Webhook 回傳 `Cannot GET /api/webhook/line`

### 症狀
- 瀏覽器訪問 webhook URL 得到 404
- LINE Console Verify 失敗

### 根因
Webhook route 原本只有 `POST` handler，沒有 `GET`。

### 修復
加上 GET handler 用於健康檢查 + LINE Console 的瀏覽器驗證：
```javascript
router.get('/line', (req, res) => {
  res.json({ status: 'ok', message: 'LINE Webhook endpoint is active.' });
});
```

---

## 4. Cloudflare Tunnel 訪問得到空白頁（Cannot GET /）

### 症狀
- `https://line-bot.openclaw-gb.com/` 回傳 `Cannot GET /`
- API 端點正常

### 根因
Express 只提供 API 路由，React SPA 在 Vite dev server (port 5173) 上，外網只看得到 port 3000。

### 修復
1. 先建構前端：`cd client && npm run build`
2. Express 加入靜態檔 serving + SPA fallback：
```javascript
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
```

### 重要
每次修改前端程式碼後，如果要透過 Cloudflare Tunnel 對外看到變更，需要重新 `npm run build`。本地開發用 Vite dev server (port 5173) 不需要。

---

## 5. Port 3000 被佔用（EADDRINUSE）

### 症狀
```
Error: listen EADDRINUSE: address already in use :::3000
```

### 修復
```bash
# 找出並終止佔用 port 的程序
lsof -i :3000 -t | xargs kill -9

# 重新啟動
cd server && npm run dev
```

---

## 6. Webhook 簽名驗證失敗（401 Invalid Signature）

### 症狀
- LINE Console Verify 失敗
- Server log 顯示 `Invalid LINE signature`

### 可能原因

| 原因 | 解法 |
|------|------|
| Channel Secret 未設定 | 在 Settings 頁面填入並儲存 |
| Channel Secret 不正確 | 重新從 LINE Developers Console 複製 |
| Body parsing 衝突 | Webhook route 使用 `express.raw()` 取得原始 body，全域 `express.json()` 必須跳過 webhook 路徑 |

### Body parsing 機制
```javascript
// index.js — webhook 路徑跳過 JSON parsing
app.use((req, res, next) => {
  if (req.path === '/api/webhook/line') {
    next();  // 不做 JSON parse
  } else {
    express.json()(req, res, next);
  }
});

// webhook.routes.js — 自行處理 raw body
router.post('/line', express.raw({ type: '*/*' }), ...);
```

> `express.raw` 的 content-type 必須設為 `'*/*'`，不能用 `'application/json'`，因為 LINE 有時候的 content-type 不完全是 `application/json`。

---

## 7. LLM 不回覆（無 AI 回應）

### 除錯步驟

1. **檢查 server log**：是否有 `LLM error:` 開頭的錯誤
2. **測試 LLM 連線**：Settings 頁面點「測試 LLM 連線」
3. **確認 API Key**：
   - Gemini：需要有效的 Google AI API Key
   - OpenAI：需要有效的 OpenAI API Key
   - Claude：需要有效的 Anthropic API Key
4. **確認模型名稱**：
   - Gemini：`gemini-2.5-flash`、`gemini-2.5-pro`
   - OpenAI：`gpt-4o`、`gpt-4o-mini`
   - Claude：`claude-sonnet-4-20250514`

### Gemini 特別注意
Gemini 使用 OpenAI 相容端點（`openai.provider.js`），base URL 為：
```
https://generativelanguage.googleapis.com/v1beta/openai/
```
如果 Google AI API Key 無效或配額用盡，會在 `openai.provider.js` 拋出錯誤。

---

## 8. 設定修改後沒有生效

### 原因
`settings.service.js` 有 60 秒記憶體快取。正常情況下，透過 API 更新設定時會自動 invalidate 快取。

### 但如果直接改 DB…
直接用 SQL 改 `system_settings` 表的值，快取不會更新，需要等 60 秒或重啟 server。

---

## 9. 知識庫上傳中文檔名失敗

### 根因
Google Gemini File Upload API 不接受 HTTP Header 中的非 ASCII 字元。

### 已內建解法
上傳前自動將檔案複製到 `/tmp/` 並改為 ASCII 安全檔名（`upload_<timestamp>.pdf`），上傳完成後刪除暫存檔。

---

## 10. 登入被鎖定（429 Too Many Requests）

### 症狀
- 登入時顯示「登入嘗試過多，請 15 分鐘後再試」
- API 回傳 429 狀態碼

### 根因
`express-rate-limit` 偵測到同一 IP 在 15 分鐘內嘗試登入超過 10 次。

### 解法
1. **等待 15 分鐘**後重試
2. **重啟 server**（速率限制使用記憶體儲存，重啟後計數器重設）：
   ```bash
   # Ctrl+C 停止 server，然後重新啟動
   cd server && npm run dev
   ```

### 相關 Log
Server log 會記錄速率限制觸發事件：
```
warn: Login rate limit exceeded: ip=::1, email=admin@example.com
```

---

## 11. LINE 用戶被速率限制

### 症狀
- LINE 用戶傳訊後 Bot 回覆「您發送訊息太頻繁，請 X 分鐘後再試」

### 根因
該用戶在時間窗口內的 AI 回覆數達到上限。

### 解法
1. 在管理後台 **系統設定** → **對話設定** → **速率限制** 調整上限
2. 設為 0 則完全不限制

### 相關 Log
```
info: Rate limit hit: user=Uxxxxx, used=10/10 in 5min
```

---

## 12. 密碼修改後舊密碼仍可登入

### 根因
瀏覽器快取了舊的 JWT Token（7 天有效期）。在 Token 過期前，已登入的 Session 仍然有效。

### 解法
1. 在前端**登出**（清除 Token）
2. 用新密碼重新登入

> 這不是安全漏洞 — 密碼修改會立即生效於新的登入嘗試，但不會撤銷已發出的 JWT Token。

---

## 13. 開發環境常用指令

```bash
# 查看 server 是否運行
curl http://localhost:3000/health

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

# 清除快取（重啟 server）
# nodemon 會在檔案變動時自動重啟，或手動 Ctrl+C 後重新 npm run dev
```
