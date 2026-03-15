# 功能狀態

## 已完成

- [x] LINE Webhook 接收與驗簽（HMAC-SHA256，DB 讀取 channel secret）
- [x] AI 自動回覆（LLM Factory 支援 Gemini / OpenAI / Claude / Custom）
- [x] RAG 知識庫（Google Gemini File Search，支援 PDF 上傳）
- [x] 人工客服切換（per-user AI / manual 模式）
- [x] 訊息紀錄查詢與 CSV 匯出
- [x] 排程時段管理（無規則時預設 24/7）
- [x] 管理員 JWT 登入
- [x] 系統設定 UI（LLM / RAG / LINE 串接）
- [x] 設定敏感欄位 AES-256-GCM 加密儲存
- [x] settings.service.js DB-first 快取（60s，update 後自動 invalidate）
- [x] Cloudflare Tunnel 對外固定網址
- [x] Express 提供 React SPA 靜態檔（前後端共用 port 3000）
- [x] LINE 連線測試功能（Settings 頁面）
- [x] LINE Messaging API 串接教學（Settings 頁面展開式教學）
- [x] 多媒體訊息儲存（image / video / audio / file）
- [x] 初次啟動安裝精靈（6 步驟：環境檢查、管理員、LINE、LLM、完成）
- [x] 登入 DDoS 防護（express-rate-limit，IP 層級速率限制）
- [x] 註冊速率限制（每 IP 每小時 3 次）
- [x] LINE 用戶 AI 回覆速率限制（DB-based，可在後台設定）
- [x] 管理員密碼修改功能（Settings 頁面）
- [x] 可設定 CORS（支援萬用字元子網域）
- [x] 登入失敗 IP 記錄（Winston logger）
- [x] ENCRYPTION_KEY 變更後優雅降級（解密失敗不崩潰）

## 待完成

- [ ] **手動回覆功能**（P1）：人工客服模式下管理員在後台主動傳訊
- [ ] **WebSocket 即時更新**（P2）：訊息列表即時推送，不需手動重整
- [ ] **多管理員支援**（P3）：角色 / 權限系統
- [ ] **生產環境部署**（P4）：Docker / CI-CD 設定
