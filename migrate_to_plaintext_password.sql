-- 資料庫遷移：將密碼欄位從 password_hash 改為明文 password
-- ⚠️ 警告：這會刪除所有現有用戶資料！

-- 方案一：刪除舊表並重建（會清空所有用戶資料）
DROP TABLE IF EXISTS token_transactions;
DROP TABLE IF EXISTS login_logs;
DROP TABLE IF EXISTS users;

-- 重新執行 schema.sql 即可

-- 方案二：只修改欄位名稱（保留用戶資料，但密碼會是加密的，無法登入）
-- ALTER TABLE users RENAME COLUMN password_hash TO password;

-- 建議：使用方案一，刪除所有資料後重新執行 schema.sql
