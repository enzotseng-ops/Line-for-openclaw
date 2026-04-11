# 功能狀態

## 已完成

- [x] LINE Webhook 接收與驗簽（HMAC-SHA256，DB 讀取 channel secret）
- [x] AI 自動回覆（LLM Factory 支援 Gemini / OpenAI / Claude / Custom）
- [x] RAG 知識庫（Google Gemini File Search，支援 PDF 上傳）
- [x] 人工客服切換（per-user AI / manual 模式）
- [x] 訊息紀錄查詢與 CSV 匯出
- [x] 排程時段管理（無規則時預設 24/7）
- [x] 管理員 JWT 登入
- [x] 首次登入強制密碼變更
- [x] 系統設定 UI（LLM / RAG / LINE 串接）
- [x] 設定敏感欄位 AES-256-GCM 加密儲存
- [x] settings.service.js DB-first 快取（60s，update 後自動 invalidate）
- [x] Cloudflare Tunnel 對外固定網址
- [x] Express 提供 React SPA 靜態檔（前後端共用 port）
- [x] LINE 連線測試功能（Settings 頁面）
- [x] LINE Messaging API 串接教學（Settings 頁面展開式教學）
- [x] 多媒體訊息儲存（image / video / audio / file）
- [x] 初次啟動安裝精靈（6 步驟：資料庫設定、管理員、LINE、LLM、完成）
- [x] 零配置啟動（JWT_SECRET / ENCRYPTION_KEY 自動產生）
- [x] Web UI 設定 DATABASE_URL（Setup 精靈 + `POST /api/setup/database`）
- [x] Setup Mode 路由守衛（setupGuard middleware）
- [x] 啟動時自動執行 Migration
- [x] 登入 DDoS 防護（express-rate-limit，Setup 模式下跳過）
- [x] 註冊速率限制（每 IP 每小時 3 次，Setup 模式下跳過）
- [x] LINE 用戶 AI 回覆速率限制（DB-based，可在後台設定）
- [x] 管理員密碼修改功能（Settings 頁面）
- [x] CORS 開放（`cors()`）
- [x] Trust Proxy（Zeabur / Cloudflare 反向代理）
- [x] 登入失敗 IP 記錄（Winston logger）
- [x] ENCRYPTION_KEY 變更後優雅降級（解密失敗不崩潰）
- [x] MCP Server 管理（CRUD + 連線測試 + 工具發現）
- [x] MCP 認證支援（Bearer Token / X-Api-Key）
- [x] MCP 工具整合 LLM（Claude / OpenAI / Gemini 格式轉換）
- [x] Zeabur 部署支援（原生 Node.js，無 Docker）
- [x] 唯讀檔案系統支援（容器環境跳過 .env 寫入）

## 待完成

- [ ] **手動回覆功能**（P1）：人工客服模式下管理員在後台主動傳訊
- [ ] **WebSocket 即時更新**（P2）：訊息列表即時推送，不需手動重整
- [ ] **多管理員支援**（P3）：角色 / 權限系統
