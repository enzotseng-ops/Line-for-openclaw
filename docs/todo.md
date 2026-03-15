# 功能狀態

## 已完成

- [x] LINE Webhook 接收與驗簽（非同步，DB 讀取 channel secret）
- [x] AI 自動回覆（LLM Factory 支援 Gemini / OpenAI / Claude / Custom）
- [x] RAG 知識庫（Google Gemini File Search，支援 PDF 上傳）
- [x] 人工客服切換（per-user AI/人工模式）
- [x] 訊息紀錄查詢與 CSV 匯出
- [x] 排程自動傳訊（cron 語法，全域開關）
- [x] 管理員 JWT 登入
- [x] 系統設定 UI（LLM / RAG / LINE 串接）
- [x] 設定敏感欄位 AES-256-GCM 加密儲存
- [x] settings.service.js DB-first 快取（60s，update 後自動 invalidate）

## 待完成 / 已知問題

- [ ] **JWT_SECRET 安全性**：目前 `.env` 中為弱 default 值，上線前必須替換為強隨機字串
- [ ] **LINE Channel Secret/Token 尚未設定**：需在 Settings 頁面填入真實值才能收發 LINE 訊息
- [ ] **手動回覆功能**：人工客服模式下管理員在後台主動傳訊功能尚未實作
- [ ] **WebSocket 即時更新**：訊息列表目前需手動重整，未實作 WebSocket 推送
- [ ] **多管理員支援**：目前無角色/權限系統，所有管理員同等權限
- [ ] **舊知識庫記錄清理**：Knowledge 頁面有 ID 1–5 的 error/processing 舊紀錄待刪除
- [ ] **生產環境部署**：尚無 Docker / CI-CD 設定
