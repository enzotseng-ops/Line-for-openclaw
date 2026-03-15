# 資料庫 Schema

PostgreSQL 14+，使用 Knex.js ORM。Migration 檔案位於 `server/src/migrations/`。

## 6 張表總覽

| 表名 | 說明 | Migration |
|------|------|-----------|
| `users` | 管理員帳號 | `20260314_01` |
| `line_users` | LINE 用戶（Bot 互動對象） | `20260314_02` |
| `messages` | 訊息紀錄（進出雙向） | `20260314_03` |
| `schedule_rules` | AI 服務時間排程 | `20260314_04` |
| `system_settings` | 系統設定 KV 表 | `20260314_05` |
| `uploaded_files` | 知識庫上傳檔案 | `20260314_06` |

---

## 完整欄位定義

### 1. `users`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | - | 登入帳號 |
| `password_hash` | VARCHAR(255) | NOT NULL | - | bcrypt 密碼雜湊 |
| `name` | VARCHAR(100) | | NULL | 管理員名稱 |
| `created_at` | TIMESTAMP | | `NOW()` | 建立時間 |
| `updated_at` | TIMESTAMP | | `NOW()` | 更新時間 |

Seed 預設管理員：`admin@example.com` / `admin123456`

---

### 2. `line_users`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `line_user_id` | VARCHAR(255) | UNIQUE, NOT NULL | - | LINE User ID（U 開頭） |
| `display_name` | VARCHAR(255) | | NULL | LINE 顯示名稱 |
| `picture_url` | TEXT | | NULL | LINE 頭像 URL |
| `mode` | VARCHAR(20) | | `'ai'` | 對話模式：`ai` / `manual` |
| `is_active` | BOOLEAN | | `true` | 是否啟用 AI 回覆 |
| `note` | TEXT | | NULL | 管理員備註 |
| `first_message_at` | TIMESTAMP | | NULL | 首條訊息時間 |
| `last_message_at` | TIMESTAMP | | NULL | 最後訊息時間 |
| `created_at` | TIMESTAMP | | `NOW()` | 建立時間 |
| `updated_at` | TIMESTAMP | | `NOW()` | 更新時間 |

---

### 3. `messages`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `line_user_id` | VARCHAR(255) | NOT NULL | - | LINE User ID |
| `direction` | VARCHAR(10) | NOT NULL | - | `inbound`（用戶→Bot）/ `outbound`（Bot→用戶） |
| `message_type` | VARCHAR(20) | NOT NULL | - | `text` / `image` / `video` / `audio` / `sticker` / `file` |
| `content` | TEXT | | NULL | 文字內容（text 類型） |
| `media_url` | TEXT | | NULL | 多媒體儲存路徑（`/uploads/media/{userId}/...`） |
| `reply_source` | VARCHAR(20) | | NULL | 回覆來源：`ai` / `manual` / `system` |
| `ai_model_used` | VARCHAR(50) | | NULL | AI 模型名稱（如 `gemini-2.5-flash`） |
| `line_message_id` | VARCHAR(255) | | NULL | LINE 訊息 ID（僅 inbound） |
| `created_at` | TIMESTAMP | | `NOW()` | 建立時間 |

---

### 4. `schedule_rules`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `day_of_week` | INTEGER | NOT NULL | - | 星期幾：`0`=Sun, `1`=Mon, ..., `6`=Sat |
| `start_time` | TIME | NOT NULL | - | 開始時間（HH:MM:SS） |
| `end_time` | TIME | NOT NULL | - | 結束時間（HH:MM:SS） |
| `is_enabled` | BOOLEAN | | `true` | 規則是否啟用 |
| `created_at` | TIMESTAMP | | `NOW()` | 建立時間 |

> **行為**：沒有任何排程規則時，AI 預設 24/7 全時段回覆。新增規則後，AI 僅在規則涵蓋的時段內回覆。

---

### 5. `system_settings`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `key` | VARCHAR(100) | UNIQUE, NOT NULL | - | 設定鍵名 |
| `value` | TEXT | NOT NULL | - | 設定值 |
| `description` | TEXT | | NULL | 描述 |
| `updated_at` | TIMESTAMP | | `NOW()` | 更新時間 |

#### 已知設定鍵

| key | 說明 | 加密 |
|-----|------|------|
| `global_ai_enabled` | AI 總開關（`'true'` / `'false'`） | |
| `llm_provider` | LLM 供應商：`gemini` / `openai` / `claude` / `custom` | |
| `llm_api_key` | LLM API Key | AES-256-GCM |
| `llm_model` | 模型名稱 | |
| `system_prompt` | AI 客服系統提示詞 | |
| `google_file_search_api_key` | Google AI API Key（RAG 用） | AES-256-GCM |
| `google_assistant_id` | File Search Store 名稱 | |
| `custom_llm_base_url` | 自訂 LLM Base URL | |
| `line_channel_secret` | LINE Channel Secret | AES-256-GCM |
| `line_channel_access_token` | LINE Channel Access Token | AES-256-GCM |

---

### 6. `uploaded_files`

| 欄位 | 型別 | 約束 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | - | 主鍵 |
| `original_name` | VARCHAR(255) | NOT NULL | - | 原始檔案名稱 |
| `stored_path` | TEXT | NOT NULL | - | 儲存路徑 |
| `file_size` | INTEGER | | NULL | 檔案大小（bytes） |
| `mime_type` | VARCHAR(100) | | NULL | MIME 類型 |
| `google_file_id` | VARCHAR(255) | | NULL | Google File Search 檔案 ID |
| `status` | VARCHAR(20) | | `'processing'` | 狀態：`processing` / `ready` / `error` |
| `uploaded_by` | INTEGER | FK → users(id) ON DELETE SET NULL | NULL | 上傳者 |
| `created_at` | TIMESTAMP | | `NOW()` | 建立時間 |

---

## 資料庫管理指令

```bash
cd server

# 執行所有未執行的 migration
npm run migrate

# 回滾最近一次 migration
npx knex migrate:rollback

# 查看 migration 狀態
npx knex migrate:status
```
