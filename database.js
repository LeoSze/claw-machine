const { Pool } = require('pg');
require('dotenv').config();

// 建立 PostgreSQL 連線池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'project',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 測試資料庫連線
pool.on('connect', () => {
  console.log('✅ 已連接到 PostgreSQL 資料庫');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 資料庫錯誤:', err);
});

module.exports = pool;
