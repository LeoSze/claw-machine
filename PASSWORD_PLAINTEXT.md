# 密碼明文儲存說明

## ⚠️ 重要變更

系統已從加密密碼改為**明文密碼儲存**。

## 修改內容

### 1. 資料庫結構 (schema.sql)
```sql
-- 原本
password_hash VARCHAR(255) NOT NULL

-- 現在
password VARCHAR(255) NOT NULL  -- 明文密碼
```

### 2. 後端代碼 (server.js)
- 移除 `bcrypt` 模組
- 註冊時直接儲存明文密碼
- 登入時使用 `===` 比對密碼

### 3. 資料庫遷移

**如果您已經有現有用戶資料**，需要重建資料庫：

```bash
# 連接到 PostgreSQL
psql -U postgres -d project

# 刪除所有表格
DROP TABLE IF EXISTS token_transactions;
DROP TABLE IF EXISTS login_logs;
DROP TABLE IF EXISTS users;

# 退出 psql
\q

# 重新初始化資料庫
psql -U postgres -d project -f schema.sql
```

**注意：這會刪除所有現有的用戶資料和代幣記錄！**

## 優點

1. **簡單直觀**：管理員可以直接查看密碼
2. **開發方便**：測試時不需記憶加密後的密碼
3. **性能略好**：不需要 bcrypt 運算

## 缺點 & 風險

1. ❌ **資料庫洩露**：如果資料庫被攻擊，所有密碼一覽無遺
2. ❌ **不符合資安標準**：違反大部分資安規範
3. ❌ **密碼重用風險**：使用者可能在其他網站使用相同密碼

## 適用情境

✅ **適合使用明文密碼的情境**：
- 家庭內部網路的娛樂系統
- 公司內網的遊戲機台
- 開發/測試環境
- 不涉及金錢交易的系統
- 不存儲個人敏感資訊

❌ **不適合使用明文密碼的情境**：
- 可從公網訪問的網站
- 涉及金錢交易
- 儲存個人敏感資訊
- 需要符合 GDPR、PCI DSS 等規範

## 查看用戶密碼

管理員可以直接查詢資料庫查看所有密碼：

```sql
-- 查看所有用戶的密碼
SELECT username, password, email, tokens FROM users;

-- 查看特定用戶的密碼
SELECT password FROM users WHERE username = 'user123';
```

## 如何改回加密密碼

如果未來需要改回加密密碼：

### 1. 還原 server.js
```javascript
// 在 server.js 開頭加回
const bcrypt = require('bcrypt');

// 註冊時
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// 登入時
const passwordMatch = await bcrypt.compare(password, user.password_hash);
```

### 2. 修改 schema.sql
```sql
password_hash VARCHAR(255) NOT NULL  -- 改回加密欄位名稱
```

### 3. 重建資料庫
```bash
psql -U postgres -d project -f schema.sql
```

## 安全建議

即使使用明文密碼，仍建議：

1. **限制網路訪問**：只允許內網訪問
2. **使用 HTTPS**：避免網路傳輸時被攔截
3. **限制資料庫訪問**：只有必要的帳號可以訪問
4. **定期備份**：防止資料遺失
5. **監控登入記錄**：使用 login_logs 表追蹤異常登入
6. **不要重複使用密碼**：提醒使用者不要使用其他網站的密碼

## 測試用帳號範例

註冊後，資料庫中會像這樣：

```sql
id | username | email           | password  | tokens
---+----------+-----------------+-----------+-------
1  | ming     | ming@test.com   | 12345678  | 100
2  | alice    | alice@test.com  | password  | 95
3  | bob      | bob@test.com    | test123   | 50
```

所有密碼都可以直接看到！
