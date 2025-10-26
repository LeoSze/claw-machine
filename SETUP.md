# 安裝指南 - 註冊與登入功能

本專案已整合 PostgreSQL 資料庫的註冊和登入功能。

## 前置需求

1. **PostgreSQL 資料庫**
   - 下載並安裝 PostgreSQL: https://www.postgresql.org/download/
   - 記住您設定的 postgres 使用者密碼

## 設定步驟

### 1. 建立資料庫

開啟終端機或 PowerShell，執行以下命令：

```bash
# 登入 PostgreSQL (Windows)
psql -U postgres

# 在 psql 中建立資料庫
CREATE DATABASE rstp_db;

# 退出 psql
\q
```

### 2. 初始化資料表

執行 SQL schema 檔案來建立資料表：

```bash
# Windows
psql -U postgres -d rstp_db -f schema.sql

# 或者在 psql 中執行
psql -U postgres -d rstp_db
\i schema.sql
```

### 3. 設定環境變數

編輯 `.env` 檔案，填入您的資料庫設定：

```env
# PostgreSQL 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rstp_db
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD_HERE  # 改成您的 postgres 密碼

# Session 密鑰 (請更改為隨機字串以提高安全性)
SESSION_SECRET=change_this_to_random_string_for_security

# 伺服器設定
PORT=3000
```

### 4. 安裝依賴套件

```bash
npm install
```

### 5. 啟動伺服器

```bash
node server.js
```

## 使用方式

### ⚠️ 重要：代幣系統

**本系統已啟用代幣機制，需要登入並擁有代幣才能遊玩！**

- **訪客無法遊玩**：未登入的訪客只能觀看影像，無法控制夾公仔機
- **每次操作扣除 1 個代幣**：每按下一個按鍵（W/A/S/D/Space）會扣除 1 個代幣
- **新用戶贈送 100 代幣**：註冊即可獲得 100 個免費代幣

### 註冊與登入（必須）

1. **註冊新帳號**
   - 瀏覽器開啟 `http://localhost:3000/register.html`
   - 填寫使用者名稱、電子郵件和密碼
   - 點擊「註冊」按鈕
   - **註冊成功後將獲得 100 個代幣**

2. **登入**
   - 瀏覽器開啟 `http://localhost:3000/login.html`
   - 輸入使用者名稱（或電子郵件）和密碼
   - 登入成功後會自動導向主頁面
   - 右上角會顯示：
     - **💰 代幣餘額**：即時顯示剩餘代幣數量
     - **👤 使用者名稱**：您的帳號名稱
     - **登出按鈕**：點擊登出

3. **遊玩**
   - 使用鍵盤 W/A/S/D/Space 控制夾公仔機
   - 或使用螢幕右下角的觸控按鈕（手機/平板）
   - **每按下一個按鍵扣除 1 個代幣**
   - 代幣餘額會即時更新
   - 當代幣不足時會跳出提示

4. **登出**
   - 在主頁面右上角點擊「登出」按鈕
   - 登出後無法繼續遊玩，需重新登入

## 功能說明

### 已實作功能

✅ **代幣系統**：每次操作扣除 1 個代幣，新用戶註冊贈送 100 代幣
✅ **即時代幣顯示**：右上角即時顯示剩餘代幣數量
✅ **代幣交易記錄**：所有代幣增減都會記錄到資料庫
✅ **使用者註冊**：簡單註冊流程，註冊即贈送初始代幣
✅ **使用者登入/登出**：Session 管理
✅ **遊戲控制限制**：只有登入且擁有代幣的使用者才能遊玩
✅ **WebSocket 中繼**：透過 server 中繼處理代幣扣除後轉發到繼電器
✅ **明文密碼儲存**：密碼以明文方式儲存（適用於內部系統）
✅ **使用者名稱顯示**：登入後顯示在右上角
✅ **最後登入時間記錄**：追蹤使用者活動
✅ **代幣不足提示**：當代幣不足時自動彈出提示視窗
✅ **用戶選單**：點擊用戶名顯示下拉選單，包含代幣資訊和登出按鈕

### 資料庫結構

**users 資料表**
- `id`: 使用者 ID (主鍵)
- `username`: 使用者名稱 (唯一)
- `email`: 電子郵件 (唯一)
- `password`: 明文密碼
- `tokens`: 代幣餘額 (預設 100)
- `created_at`: 建立時間
- `last_login`: 最後登入時間

**token_transactions 資料表**
- `id`: 交易 ID (主鍵)
- `user_id`: 使用者 ID (外鍵)
- `amount`: 代幣數量 (正數為增加，負數為扣除)
- `transaction_type`: 交易類型 (initial, game_action, purchase, admin_grant 等)
- `description`: 交易描述 (例如：W_DOWN, A_UP, Space_DOWN)
- `balance_after`: 交易後的餘額
- `created_at`: 交易時間

**login_logs 資料表** (可選)
- `id`: 記錄 ID
- `user_id`: 使用者 ID
- `login_time`: 登入時間
- `ip_address`: IP 位址
- `user_agent`: 瀏覽器資訊

## API 端點

### POST `/api/register`
註冊新使用者

**請求 Body:**
```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/login`
使用者登入

**請求 Body:**
```json
{
  "username": "username",
  "password": "password123"
}
```

### POST `/api/logout`
使用者登出

### GET `/api/check-auth`
檢查登入狀態（包含代幣餘額）

### GET `/api/tokens`
獲取當前使用者的代幣餘額

### GET `/api/token-history`
獲取當前使用者的代幣交易記錄（最近 50 筆）

### WebSocket `/api/relay-control`
遊戲控制 WebSocket（含代幣扣除機制）
- 只有已登入使用者可連接
- 每次按下操作（_DOWN）扣除 1 個代幣
- 即時回傳剩餘代幣數量
- 代幣不足時拒絕操作

## 故障排除

### 資料庫連線錯誤
- 確認 PostgreSQL 服務已啟動
- 檢查 `.env` 檔案中的資料庫密碼是否正確
- 確認資料庫 `rstp_db` 已建立

### 無法啟動伺服器
- 檢查 port 3000 是否被其他程式佔用
- 確認所有 npm 套件已安裝 (`npm install`)

### 登入後自動登出
- 檢查瀏覽器 Cookie 設定是否允許
- 確認 SESSION_SECRET 已設定

## ⚠️ 安全性警告

**本系統目前使用明文密碼儲存，僅適用於以下情境：**
- 內部網路環境
- 測試/開發環境
- 不涉及敏感資料的系統

**不建議用於：**
- 公開網路環境
- 包含個人敏感資訊的系統
- 需要符合資安規範的正式環境

## 安全性建議

1. **生產環境部署時**：
   - ⚠️ **強烈建議改用加密密碼** (bcrypt, argon2 等)
   - 將 `.env` 加入 `.gitignore`，避免密碼外洩
   - 啟用 HTTPS (將 server.js 中的 `secure: false` 改為 `true`)
   - 設定防火牆規則，限制只有內網可訪問
   - 定期備份資料庫

2. **密碼要求**：
   - 目前最少 6 個字元
   - 如改用加密，建議增加複雜度要求（大小寫、數字、特殊字元）

3. **Session 安全**：
   - SESSION_SECRET 請使用隨機產生的長字串
   - 可使用 `require('crypto').randomBytes(64).toString('hex')` 產生

4. **如需改回加密密碼**：
   - 取消註解 server.js 中的 bcrypt 相關代碼
   - 修改 schema.sql，將 `password` 改回 `password_hash`
   - 重新初始化資料庫
