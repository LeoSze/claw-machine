# 單人遊玩排隊系統

## 功能說明

本系統確保**每次只有一個玩家可以控制夾公仔機**，其他玩家需要排隊等待。

### 核心機制

1. **單一控制權**: 同一時間只有一個玩家擁有控制權
2. **自動排隊**: 當有人正在遊玩時，其他連線的玩家會自動加入等待隊列
3. **閒置超時**: 玩家 1 分鐘沒有操作，自動釋放控制權給下一位等待者
4. **即時狀態**: 所有玩家都能即時看到當前遊玩者和排隊狀態

## 工作流程

### 1. 玩家連線時

- 如果沒有人在遊玩 → 立即獲得控制權
- 如果有人在遊玩 → 加入等待隊列

### 2. 遊玩中

- 每次按下按鍵 (W/A/S/D/Space) 會:
  - 扣除 1 個代幣
  - 更新最後操作時間
  - 轉發指令到繼電器

### 3. 閒置超時機制

系統每 5 秒檢查一次當前玩家的最後操作時間:

```javascript
// 超時時間: 60 秒 (1 分鐘)
const INACTIVITY_TIMEOUT = 60000;
```

如果玩家超過 1 分鐘沒有操作:
1. 釋放該玩家的控制權
2. 關閉與繼電器的連線
3. 通知該玩家已被超時
4. 自動將控制權給下一位排隊者

### 4. 玩家離開時

- 如果是當前玩家離開 → 釋放控制權，分配給下一位
- 如果是等待中的玩家離開 → 從隊列中移除

## 前端顯示

### 遊戲狀態面板

在右側面板的「遊戲狀態」區塊會顯示:

#### 可以遊玩時 (綠色)
```
🎮 您現在可以遊玩
按下 W/A/S/D/Space 控制夾公仔機
```

#### 正在排隊時 (黃色)
```
⏳ 正在排隊
當前玩家: [玩家名稱]
您的位置: 第 X 位
```

#### 連線中 (藍色)
```
連線中...
```

## 後端實作

### server.js 關鍵變數

```javascript
// 當前正在遊玩的玩家
let currentPlayer = {
  userId: 123,
  username: 'alice',
  ws: WebSocket,           // 玩家的 WebSocket 連線
  lastActionTime: Date.now(),  // 最後操作時間
  relayWs: WebSocket       // 與繼電器的 WebSocket 連線
};

// 等待中的玩家隊列
let waitingPlayers = [
  { userId, username, ws },
  { userId, username, ws },
  ...
];
```

### 主要函數

#### `checkPlayerTimeout()`
每 5 秒執行一次，檢查當前玩家是否超時:
```javascript
setInterval(checkPlayerTimeout, 5000);
```

#### `releaseControl()`
釋放當前玩家的控制權:
- 關閉與繼電器的連線
- 清空 `currentPlayer` 變數

#### `assignNextPlayer()`
將控制權分配給下一位排隊者:
- 從 `waitingPlayers` 取出第一位玩家
- 為該玩家建立繼電器連線
- 更新 `currentPlayer`
- 廣播狀態給所有連線的玩家

#### `broadcastPlayerStatus()`
向所有連線的玩家廣播當前狀態:
```javascript
{
  type: 'player_status',
  canPlay: true/false,
  currentPlayer: '玩家名稱',
  queuePosition: 0  // 排隊位置 (0-based)
}
```

## WebSocket 訊息格式

### 伺服器 → 前端

#### 玩家狀態更新
```json
{
  "type": "player_status",
  "canPlay": false,
  "currentPlayer": "alice",
  "queuePosition": 2
}
```

#### 超時通知
```json
{
  "type": "timeout",
  "message": "您已超過 1 分鐘沒有操作，控制權已轉移給下一位玩家"
}
```

#### 控制權轉移
```json
{
  "type": "player_status",
  "canPlay": true
}
```

#### 操作被拒絕 (沒有控制權)
```json
{
  "type": "error",
  "message": "您沒有控制權"
}
```

### 前端 → 伺服器

#### 遊戲操作
```
W_DOWN
W_UP
A_DOWN
A_UP
S_DOWN
S_UP
D_DOWN
D_UP
Space_DOWN
Space_UP
```

## 使用情境範例

### 情境 1: 兩位玩家
1. **Alice 先連線** → 立即獲得控制權
2. **Bob 後連線** → 進入排隊，位置第 1 位
3. Bob 看到: "⏳ 正在排隊，當前玩家: Alice"
4. Alice 遊玩了 2 分鐘後離開
5. Bob 自動獲得控制權 → "🎮 您現在可以遊玩"

### 情境 2: 超時機制
1. **Charlie 連線** → 獲得控制權
2. Charlie 玩了幾下後去上廁所，忘記關閉網頁
3. 60 秒後，系統自動偵測超時
4. Charlie 看到通知: "您已超過 1 分鐘沒有操作"
5. 下一位排隊者自動獲得控制權

### 情境 3: 多人排隊
1. **David** 正在遊玩
2. **Eve** 排隊中 (位置: 第 1 位)
3. **Frank** 排隊中 (位置: 第 2 位)
4. David 離開 → Eve 自動獲得控制權
5. Frank 的位置更新為: 第 1 位

## 安全性考量

### 防止濫用
- ✅ 只有當前玩家的操作會被轉發到繼電器
- ✅ 其他玩家的操作會被伺服器拒絕
- ✅ 每次操作都需要代幣，防止無限制使用

### 防止佔用
- ✅ 1 分鐘閒置超時機制
- ✅ 玩家離開自動釋放控制權
- ✅ 即時更新排隊狀態

## 調整超時時間

如果需要修改超時時間，編輯 `server.js`:

```javascript
// 預設: 60 秒 (1 分鐘)
const INACTIVITY_TIMEOUT = 60000;

// 改成 30 秒
const INACTIVITY_TIMEOUT = 30000;

// 改成 2 分鐘
const INACTIVITY_TIMEOUT = 120000;
```

## 測試建議

### 測試 1: 基本排隊
1. 開啟兩個瀏覽器視窗
2. 分別用不同帳號登入
3. 觀察排隊狀態顯示

### 測試 2: 超時機制
1. 登入並獲得控制權
2. 等待 60 秒不操作
3. 觀察是否自動釋放控制權

### 測試 3: 多人排隊
1. 開啟 3+ 個瀏覽器視窗
2. 分別登入不同帳號
3. 觀察排隊位置更新

## 故障排除

### 問題: 控制權沒有自動轉移
**檢查**: server.js 中的 `setInterval(checkPlayerTimeout, 5000)` 是否正常執行

### 問題: 排隊狀態不更新
**檢查**: WebSocket 連線是否正常，瀏覽器 Console 是否有錯誤訊息

### 問題: 超時時間不準確
**檢查**: 伺服器時間是否正確，`Date.now()` 回傳值是否正常

## 未來改進建議

- [ ] 增加「讓出控制權」按鈕
- [ ] 顯示當前玩家的遊玩時間
- [ ] 增加排隊人數上限
- [ ] 增加 VIP 優先權機制
- [ ] 記錄遊玩時間統計
