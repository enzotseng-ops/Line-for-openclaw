# 資料庫 Schema

## 6 張表

| 表名 | 說明 |
|------|------|
| `users` | 管理員帳號（email、password hash、name） |
| `line_users` | LINE 用戶（userId、displayName、ai_mode、blocked） |
| `messages` | 訊息紀錄（userId、role、content、contentType、createdAt） |
| `schedule_rules` | 排程規則（name、cron、message、enabled） |
| `system_settings` | 系統設定鍵值表（key、value，敏感欄位 AES-256 加密） |
| `uploaded_files` | 已上傳知識庫檔案（filename、fileId、status、storeId） |

---

## 目前 DB 設定狀態（2026-03-15）

| 鍵（key） | 狀態 | 說明 |
|-----------|------|------|
| `llm_provider` | ✅ 已設定（`gemini`） | LLM 供應商 |
| `llm_model` | ✅ 已設定（`gemini-2.5-flash`） | 使用的模型 |
| `llm_api_key` | ✅ 已設定（加密） | Gemini API Key |
| `llm_system_prompt` | ✅ 已設定 | AI 客服系統提示詞 |
| `rag_enabled` | ✅ 已設定（`true`） | 已啟用 RAG |
| `rag_store_id` | ✅ 已設定 | `fileSearchStores/lineknowledgebase-cxle7z1swdtb` |
| `google_file_search_api_key` | ✅ 已設定（加密） | Google RAG API Key |
| `line_channel_secret` | ❌ 未設定 | 需在 Settings 頁面填入 |
| `line_channel_access_token` | ❌ 未設定 | 需在 Settings 頁面填入 |

---

## 知識庫已上傳文件（4 筆 ready）

| ID | 檔案名稱 | 狀態 |
|----|--------|------|
| 6 | 無毒農常見問題文件 | ready |
| 7 | 產品說明文件 | ready |
| 8 | 退換貨政策文件 | ready |
| 9 | 客服 SOP 文件 | ready |

（ID 1–5 為舊測試紀錄，狀態為 error/processing，可在 Knowledge 頁面刪除）
