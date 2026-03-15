# API 端點

所有 API 以 `/api` 為前綴。除 auth、webhook、setup/status 外，其餘端點需要 JWT Bearer Token。

## 初始設定

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/setup/status` | 系統設定狀態檢查（無需登入） |
| POST | `/api/setup/initialize` | 批次儲存設定（需登入） |

`GET /api/setup/status` 回傳：
```json
{
  "database": true,
  "admin": true,
  "line": false,
  "llm": true,
  "setupComplete": false
}
```

## 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 管理員註冊 |
| POST | `/api/auth/login` | 管理員登入，回傳 JWT |
| GET | `/api/auth/me` | 取得目前登入者資訊 |

## LINE Webhook

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/webhook/line` | 健康檢查（瀏覽器 / LINE Verify） |
| POST | `/api/webhook/line` | LINE Webhook 事件接收（HMAC-SHA256 驗簽） |

## LINE 用戶管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/line-users` | 用戶列表（支援分頁、搜尋） |
| GET | `/api/line-users/:id` | 用戶詳情 |
| PATCH | `/api/line-users/:id/mode` | 切換 AI / manual 模式 |
| PATCH | `/api/line-users/:id/note` | 更新備註 |

## 訊息

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/messages` | 訊息列表（支援 line_user_id、日期、類型篩選） |
| GET | `/api/messages/export` | 匯出 CSV |
| GET | `/api/messages/dashboard` | 儀表板統計（今日訊息量、AI 回覆率、7 日趨勢） |

## 系統設定

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/settings` | 取得所有設定（加密欄位隱藏值） |
| PATCH | `/api/settings/:key` | 更新單一設定（加密欄位自動加密） |
| GET | `/api/settings/llm/test` | 測試 LLM 連線 |
| GET | `/api/settings/line/test` | 測試 LINE 連線（回傳 Bot 資訊） |

## 排程

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/schedules` | 排程列表 |
| POST | `/api/schedules` | 建立排程規則 |
| PATCH | `/api/schedules/:id` | 更新排程規則 |
| DELETE | `/api/schedules/:id` | 刪除排程規則 |

## 知識庫檔案

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/files` | 檔案列表 |
| POST | `/api/files` | 上傳檔案（multipart/form-data） |
| DELETE | `/api/files/:id` | 刪除檔案 |

---

## 管理後台頁面

| 路由 | 功能 |
|------|------|
| `/setup` | 初次啟動安裝精靈（未設定完成時自動導向） |
| `/login` | 管理員登入 |
| `/dashboard` | 訊息量統計儀表板 |
| `/users` | LINE 用戶列表、AI 模式切換 |
| `/messages` | 訊息紀錄查詢、CSV 匯出 |
| `/schedules` | 排程管理 |
| `/knowledge` | 知識庫 PDF 上傳管理 |
| `/settings` | LLM / RAG / LINE 串接設定 |
