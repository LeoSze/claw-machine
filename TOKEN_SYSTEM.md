# 代幣系統說明

## 🎮 系統概述

本夾公仔機已整合完整的代幣系統，使用者必須登入並擁有代幣才能遊玩。

## 💰 代幣機制

### 獲得代幣
- **註冊贈送**：新用戶註冊即獲得 100 個代幣
- **未來擴充**：可加入購買、每日簽到、活動贈送等功能

### 消耗代幣
- **遊戲操作**：每按下一個按鍵（W/A/S/D/Space）扣除 1 個代幣
- **只扣按下**：只有按下（_DOWN）扣代幣，放開（_UP）不扣
- **即時扣除**：操作時立即從資料庫扣除並更新顯示

### 代幣不足
- 當代幣 < 1 時，無法進行任何操作
- 自動彈出提示視窗提醒使用者充值
- 繼續嘗試操作會重複提示

## 🔧 技術實現

### 資料庫設計

**users 表新增欄位**：
```sql
tokens INTEGER DEFAULT 100 NOT NULL
```

**token_transactions 交易記錄表**：
```sql
CREATE TABLE token_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### WebSocket 中繼架構

```
前端 ←→ Node.js Server (代幣檢查) ←→ 繼電器 (192.168.50.161:8080)
      ws://localhost:3000/api/relay-control
```

**流程**：
1. 前端發送操作指令（例如：W_DOWN）
2. Server 檢查使用者登入狀態
3. Server 檢查代幣是否足夠
4. Server 扣除 1 個代幣並記錄到資料庫
5. Server 轉發指令到實際的繼電器
6. Server 回傳新的代幣餘額給前端
7. 前端更新代幣顯示

### 關鍵 API

**檢查認證並獲取代幣**：
```javascript
GET /api/check-auth
Response: {
  authenticated: true,
  user: {
    id: 1,
    username: "user",
    tokens: 95
  }
}
```

**代幣交易記錄**：
```javascript
GET /api/token-history
Response: {
  transactions: [
    {
      id: 123,
      amount: -1,
      transaction_type: "game_action",
      description: "W_DOWN",
      balance_after: 95,
      created_at: "2025-01-15T10:30:00Z"
    },
    ...
  ]
}
```

## 📊 代幣消耗統計

假設一局遊戲：
- 前進 5 次（W）：5 代幣
- 左移 3 次（A）：3 代幣
- 後退 2 次（S）：2 代幣
- 右移 4 次（D）：4 代幣
- 抓取 1 次（Space）：1 代幣

**一局消耗**：約 15 代幣
**100 代幣可玩**：約 6-7 局

## 🎯 未來擴充建議

### 1. 代幣充值系統
```javascript
POST /api/purchase-tokens
Body: {
  package: "basic",  // basic: 100, premium: 500, vip: 1000
  payment_method: "credit_card"
}
```

### 2. 每日簽到贈送
```javascript
POST /api/daily-checkin
Response: {
  tokens_earned: 10,
  streak: 7
}
```

### 3. 成就系統
- 首次抓取成功：贈送 20 代幣
- 連續 3 天遊玩：贈送 30 代幣
- 累計遊玩 100 次：贈送 50 代幣

### 4. 推薦獎勵
- 邀請新用戶註冊：雙方各得 50 代幣

### 5. VIP 會員
- 月費制：每月固定贈送 1000 代幣
- 操作折扣：每次只扣 0.5 代幣

### 6. 代幣排行榜
```sql
SELECT username, tokens
FROM users
ORDER BY tokens DESC
LIMIT 10;
```

### 7. 退款機制
- 遊戲異常斷線：自動退還該局代幣
- 操作失敗：可申請退款審核

## 🔒 安全性考量

### 防止刷代幣
1. **資料庫層級約束**：代幣不可為負數
   ```sql
   ALTER TABLE users ADD CONSTRAINT tokens_non_negative CHECK (tokens >= 0);
   ```

2. **交易原子性**：使用資料庫事務確保扣除和記錄同時成功
   ```javascript
   BEGIN;
   UPDATE users SET tokens = tokens - 1 WHERE id = $1 AND tokens >= 1;
   INSERT INTO token_transactions (...);
   COMMIT;
   ```

3. **Server 端驗證**：所有代幣操作都在 server 端進行，前端無法偽造

4. **WebSocket 認證**：每個 WebSocket 連線都需要驗證 session

5. **操作頻率限制**：可加入 rate limiting 防止惡意快速操作

## 📝 日誌與監控

### 代幣消耗日誌
```javascript
console.log(`💰 ${username} 使用操作 ${command}，代幣: ${before} → ${after}`);
```

### 監控指標
- 每日代幣消耗總量
- 平均每用戶遊玩次數
- 代幣餘額分布
- 充值轉換率（未來）

### SQL 查詢範例

**今日代幣消耗統計**：
```sql
SELECT
  SUM(ABS(amount)) as total_consumed,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT user_id) as active_users
FROM token_transactions
WHERE transaction_type = 'game_action'
  AND created_at >= CURRENT_DATE;
```

**用戶代幣消耗排行**：
```sql
SELECT
  u.username,
  COUNT(*) as play_count,
  SUM(ABS(t.amount)) as total_tokens_used
FROM token_transactions t
JOIN users u ON t.user_id = u.id
WHERE t.transaction_type = 'game_action'
  AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY u.username
ORDER BY total_tokens_used DESC
LIMIT 10;
```

## 🎨 UI/UX 優化建議

### 代幣顯示
- ✅ 已實現：右上角即時顯示
- 建議：代幣 < 10 時變紅色（已實現）
- 建議：代幣 = 0 時顯示「立即充值」按鈕

### 動畫效果
- 代幣扣除時數字跳動動畫
- 代幣增加時金幣掉落特效
- 代幣不足時震動提示

### 提示訊息
- 首次登入：「歡迎！您有 100 個代幣可以使用」
- 代幣剩餘 10：「代幣即將用完，請注意」
- 代幣用完：「代幣已用完，請充值後繼續遊玩」

## 📞 客服與支援

### 常見問題

**Q: 代幣會過期嗎？**
A: 不會，代幣永久有效。

**Q: 可以退款嗎？**
A: 未使用的代幣可以申請退款（需實現退款功能）。

**Q: 誤操作扣除的代幣可以退還嗎？**
A: 可以聯繫客服，提供交易記錄申請退款。

**Q: 如何查看代幣消費記錄？**
A: 透過 API `/api/token-history` 查詢（需實現前端頁面）。

## 🚀 部署檢查清單

- [ ] 資料庫已執行 schema.sql
- [ ] .env 檔案已設定資料庫連線
- [ ] 已安裝所有 npm 套件（包括 ws）
- [ ] PostgreSQL 服務已啟動
- [ ] 繼電器 WebSocket (192.168.50.161:8080) 可連線
- [ ] 測試註冊功能並確認獲得 100 代幣
- [ ] 測試遊戲操作並確認代幣正確扣除
- [ ] 測試代幣不足時的提示功能
