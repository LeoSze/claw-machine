# 修正：失去控制權後狀態未更新

## 問題描述

玩家超過 1 分鐘沒有操作後，控制權被自動釋放，但前端的遊戲狀態沒有更新，仍然顯示「正在遊玩中」。

## 根本原因

### 原始邏輯問題

當玩家超時失去控制權時：

1. `checkPlayerTimeout()` 檢測到超時
2. 呼叫 `releaseControl()` 釋放控制權
3. `releaseControl()` 設置 `currentPlayer = null`
4. `broadcastPlayerStatus()` 被呼叫

**問題**: 此時被釋放的玩家已經不是 `currentPlayer` 了，也不在 `waitingPlayers` 陣列中，所以 `broadcastPlayerStatus()` 不會發送訊息給他！

```javascript
// 原始的 broadcastPlayerStatus()
function broadcastPlayerStatus() {
  // 發送給當前玩家
  if (currentPlayer && currentPlayer.ws.readyState === 1) {
    currentPlayer.ws.send(...);  // ← 但 currentPlayer 已經是 null 了！
  }

  // 發送給等待中的玩家
  waitingPlayers.forEach(player => {
    player.ws.send(...);  // ← 被釋放的玩家也不在這裡！
  });
}
```

## 解決方案

### 1. 在釋放控制權前通知玩家

修改 `checkPlayerTimeout()` 函數，在釋放控制權**之前**先保存玩家資訊並通知他：

```javascript
// server.js:301-334
function checkPlayerTimeout() {
  if (currentPlayer) {
    const timeSinceLastAction = Date.now() - currentPlayer.lastActionTime;
    if (timeSinceLastAction >= INACTIVITY_TIMEOUT) {
      console.log(`⏰ ${currentPlayer.username} 超過 1 分鐘無操作，釋放控制權`);

      const timeoutPlayer = currentPlayer;  // ← 保存玩家資訊

      // 通知當前玩家控制權已被釋放
      if (timeoutPlayer.ws && timeoutPlayer.ws.readyState === 1) {
        timeoutPlayer.ws.send(JSON.stringify({
          type: 'timeout',
          message: '您已超過 1 分鐘沒有操作，控制權已轉移'
        }));
      }

      // 釋放控制權
      releaseControl();

      // 將超時的玩家重新加入排隊
      if (timeoutPlayer.ws && timeoutPlayer.ws.readyState === 1) {
        waitingPlayers.push({
          userId: timeoutPlayer.userId,
          username: timeoutPlayer.username,
          ws: timeoutPlayer.ws
        });
        console.log(`⏳ ${timeoutPlayer.username} 重新加入排隊 (位置: ${waitingPlayers.length})`);
      }

      // 嘗試給予下一位等待的玩家
      assignNextPlayer();
    }
  }
}
```

### 2. releaseControl() 也加入通知

為了保險起見，在 `releaseControl()` 中也加入通知邏輯：

```javascript
// server.js:337-356
function releaseControl() {
  if (currentPlayer) {
    // 先通知該玩家失去控制權
    if (currentPlayer.ws && currentPlayer.ws.readyState === 1) {
      currentPlayer.ws.send(JSON.stringify({
        type: 'player_status',
        canPlay: false,
        message: '您已失去控制權'
      }));
    }

    // 關閉繼電器連線
    if (currentPlayer.relayWs) {
      currentPlayer.relayWs.close();
    }
  }

  currentPlayer = null;
  broadcastPlayerStatus();
}
```

### 3. 前端處理超時訊息

在前端的 WebSocket `onmessage` 處理器中加入對 `timeout` 類型的處理：

```javascript
// index.html:2014-2024
} else if (data.type === 'timeout') {
  // 超時失去控制權
  console.warn('⏰', data.message);
  alert(data.message);
} else if (data.type === 'control_granted') {
  // 獲得控制權
  console.log('🎮', data.message);
} else if (data.type === 'waiting') {
  // 加入排隊
  console.log('⏳', data.message);
}
```

## 新增功能：自動重新排隊

作為額外改進，超時的玩家現在會**自動重新加入排隊**，不需要重新連線！

### 流程

1. Alice 正在遊玩
2. Alice 超過 1 分鐘沒有操作
3. 伺服器偵測超時
4. **發送 timeout 訊息給 Alice** ← 新增
5. Alice 看到彈窗：「您已超過 1 分鐘沒有操作，控制權已轉移」
6. **Alice 自動加入排隊隊列** ← 新增
7. 下一位玩家 (Bob) 獲得控制權
8. Alice 的狀態更新為「⏳ 排隊中」
9. `broadcastPlayerStatus()` 發送狀態給 Alice (因為她現在在 waitingPlayers 中)

## 訊息類型整理

### 後端發送的訊息類型

| 類型 | 何時發送 | 內容 | 目的 |
|------|----------|------|------|
| `timeout` | 玩家超時 | `{ type: 'timeout', message: '...' }` | 通知玩家失去控制權 |
| `control_granted` | 獲得控制權 | `{ type: 'control_granted', message: '...' }` | 通知玩家可以開始遊玩 |
| `waiting` | 加入排隊 | `{ type: 'waiting', message: '...', position: 1, currentPlayer: 'Alice' }` | 通知玩家排隊狀態 |
| `player_status` | 狀態變更 | `{ type: 'player_status', canPlay: true/false, queuePosition: 0, ... }` | 更新玩家狀態顯示 |
| `control_lost` | 失去控制權 | `{ type: 'control_lost', message: '...' }` | 通用的失去控制權通知 |

## 測試情境

### 情境 1: 超時自動重新排隊

1. Alice 連線 → 獲得控制權 (綠色狀態)
2. Bob 連線 → 自動排隊 (黃色狀態，位置第 1 位)
3. Alice 玩了 30 秒後停止操作
4. 等待 60 秒
5. **預期結果**:
   - Alice 看到彈窗: "您已超過 1 分鐘沒有操作，控制權已轉移"
   - Alice 狀態變為黃色「排隊中」，位置第 2 位
   - Bob 狀態變為綠色「正在遊玩中」
   - Bob 看到: "🎮 您現在可以遊玩"

### 情境 2: 手動離開

1. Alice 正在遊玩 (綠色)
2. Bob 在排隊 (黃色，第 1 位)
3. Alice 關閉瀏覽器
4. **預期結果**:
   - Bob 自動獲得控制權
   - Bob 狀態變為綠色「正在遊玩中」

## 修改檔案摘要

**server.js**
- 301-334行: 修改 `checkPlayerTimeout()` - 保存玩家資訊，發送通知，重新加入排隊
- 337-356行: 修改 `releaseControl()` - 在釋放前發送通知

**index.html**
- 2014-2024行: 增加 `timeout`, `control_granted`, `waiting` 訊息處理

## 技術要點

### 為什麼要保存 timeoutPlayer?

```javascript
const timeoutPlayer = currentPlayer;  // 保存引用
releaseControl();  // 這裡會把 currentPlayer 設為 null
// 但我們還需要 timeoutPlayer 來重新加入排隊
waitingPlayers.push(timeoutPlayer);
```

### 為什麼要重新加入排隊?

這樣用戶體驗更好：
- ❌ 舊邏輯: 超時後變成孤兒狀態，需要重新整理頁面
- ✅ 新邏輯: 超時後自動排隊，可以繼續等待下一輪

### WebSocket readyState 檢查

```javascript
if (timeoutPlayer.ws && timeoutPlayer.ws.readyState === 1) {
  // readyState === 1 表示 OPEN 狀態
  // 確保 WebSocket 還連接著才發送訊息
}
```

## 已知限制

1. 如果玩家在超時瞬間斷線，可能會收不到通知
2. 彈窗 (alert) 是阻塞式的，可以考慮改為非阻塞的通知

## 未來改進

- [ ] 將 alert 改為更友善的 Toast 通知
- [ ] 增加「續玩」按鈕，讓玩家可以延長時間
- [ ] 顯示倒數計時器，提醒玩家還有多少時間
- [ ] 增加聲音提示
