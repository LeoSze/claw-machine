# 手機版玩家狀態顯示

## 問題
手機版無法看到遊戲狀態，因為控制面板 (`#control-panel`) 在手機版被隱藏了。

## 解決方案
在手機版的左下角連線狀態區域 (`#mobile-status`) 下方增加玩家狀態顯示。

## 實作內容

### 1. HTML 結構 (index.html:1399-1403)

在 `#mobile-status` 容器內新增：

```html
<!-- 玩家狀態 (手機版) -->
<div class="mobile-status-title" style="margin-top: 15px;">遊戲狀態</div>
<div id="mobile-player-status" class="mobile-player-status">
  <div class="mobile-player-status-text">連線中...</div>
</div>
```

### 2. CSS 樣式 (index.html:811-864)

針對手機版設計的簡潔樣式：

```css
/* 手機版玩家狀態 */
.mobile-player-status {
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-size: 0.8em;
  font-weight: 600;
  transition: all 0.3s ease;
}

/* 綠色 - 正在遊玩 */
.mobile-player-status.can-play {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1));
  border: 2px solid #22c55e;
  color: #22c55e;
  animation: pulse-green 2s ease-in-out infinite;
}

/* 黃色 - 正在排隊 */
.mobile-player-status.waiting {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.1));
  border: 2px solid #fbbf24;
  color: #fbbf24;
}

/* 灰色 - 觀看模式 */
.mobile-player-status.not-in-queue {
  background: rgba(156, 163, 175, 0.2);
  border: 2px solid #9ca3af;
  color: #9ca3af;
}

/* 藍色 - 連線中 */
.mobile-player-status.connecting {
  background: rgba(96, 165, 250, 0.2);
  border: 2px solid #60a5fa;
  color: #60a5fa;
}
```

### 3. JavaScript 更新 (index.html:1854-1945)

修改 `updatePlayerStatus()` 函數，增加手機版狀態更新：

```javascript
// 更新手機版狀態
if (mobilePlayerStatus) {
  mobilePlayerStatus.className = 'mobile-player-status';

  if (statusData.canPlay) {
    // 正在遊玩
    mobilePlayerStatus.classList.add('can-play');
    mobilePlayerStatus.innerHTML = `
      <div class="mobile-player-status-text">🎮 正在遊玩<br>${currentUsername}</div>
      <div class="mobile-player-status-detail">✨ 您擁有控制權</div>
    `;
  } else if (statusData.queuePosition !== undefined) {
    // 正在排隊
    mobilePlayerStatus.classList.add('waiting');
    mobilePlayerStatus.innerHTML = `
      <div class="mobile-player-status-text">⏳ 排隊中</div>
      <div class="mobile-player-status-name">${currentPlayerName}</div>
      <div class="mobile-player-status-detail">📍 第 ${statusData.queuePosition + 1} 位</div>
    `;
  }
  // ... 其他狀態
}
```

## 顯示位置

### 手機版布局

```
┌─────────────────────────────┐
│         Header              │
├─────────────────────────────┤
│                             │
│      Video Player           │
│                             │
├─────────────────────────────┤
│  [連線狀態]    [觸控按鈕]    │
│  📹 影像串流   [W]          │
│  ⚡ 繼電器     [A][S][D]     │
│                [SPACE]       │
│  [遊戲狀態]                  │
│  🎮 正在遊玩                │
│     Alice                   │
└─────────────────────────────┘
```

左下角的 `#mobile-status` 容器現在包含：
1. 連線狀態 (影像串流、繼電器)
2. **遊戲狀態** ← 新增

## 手機版顯示內容

### 狀態 1: 正在遊玩 (綠色，發光)
```
┌─────────────────┐
│ 🎮 正在遊玩      │
│    Alice        │
│ ✨ 您擁有控制權 │
└─────────────────┘
```

### 狀態 2: 正在排隊 (黃色)
```
┌─────────────────┐
│ ⏳ 排隊中       │
│    Bob          │
│ 📍 第 2 位      │
└─────────────────┘
```

### 狀態 3: 觀看模式 (灰色)
```
┌─────────────────┐
│ 👀 觀看模式     │
│    Charlie      │
└─────────────────┘
```

### 狀態 4: 連線中 (藍色)
```
┌─────────────────┐
│ 🔄 連線中...    │
└─────────────────┘
```

## 設計考量

### 簡潔性
- 手機螢幕空間有限，文字更簡短
- 桌面版: "正在遊玩中" → 手機版: "正在遊玩"
- 桌面版: "您的排隊位置: 第 X 位" → 手機版: "第 X 位"

### 可讀性
- 字體大小: `0.8em` (適合小螢幕)
- 行高: `1.3` (避免文字過於擁擠)
- Padding: `10px` (足夠的觸控區域)

### 動畫效果
- 保留綠色發光動畫 (`pulse-green`)
- 確保在手機上也能看到「正在遊玩」的視覺回饋

## 響應式設計

狀態框會根據 `#mobile-status` 容器大小自動調整：

- **平板 (768px-1024px)**: `max-width: 42%`
- **手機 (480px-767px)**: `max-width: 40%`
- **小螢幕手機 (<480px)**: `max-width: 35%`

## 測試檢查清單

- [x] 手機版能看到遊戲狀態
- [x] 綠色狀態有發光動畫
- [x] 顯示玩家名稱
- [x] 顯示排隊位置
- [x] 文字大小適中，不會太小
- [x] 不會遮擋影像或按鈕
- [x] 狀態即時更新

## 與桌面版的差異

| 功能 | 桌面版 | 手機版 |
|------|--------|--------|
| 位置 | 右側控制面板 | 左下角狀態區 |
| 文字詳細度 | 詳細說明 | 簡短描述 |
| 排隊按鈕 | 有 | 無 (空間限制) |
| 字體大小 | 較大 | 較小 |
| Padding | 15px | 10px |
| 邊框粗細 | 3px | 2px |

## 未來改進

- [ ] 增加手機版的排隊按鈕 (可能需要調整布局)
- [ ] 支援橫向模式時調整位置
- [ ] 增加震動回饋 (輪到您時)
- [ ] 優化極小螢幕的顯示

## 使用效果

現在無論是在桌面或手機上，玩家都能清楚看到：
- ✅ 誰正在遊玩
- ✅ 自己是否在遊玩
- ✅ 自己的排隊位置
- ✅ 即時狀態更新

手機玩家體驗得到顯著改善！🎉
