# 遠程控制夾娃娃機系統 🎮

一個基於 WebRTC 和 WebSocket 的遠程控制夾娃娃機系統，支援多人排隊、即時影像串流和代幣管理。

## ✨ 功能特性

### 🎯 核心功能
- **手動加入遊戲模式** - 用戶需要主動點擊「開始遊玩」或「加入排隊」按鈕
- **單人遊玩排隊系統** - 同一時間只有一人可以控制，其他人自動排隊
- **閒置超時機制** - 玩家 1 分鐘無操作自動釋放控制權
- **代幣系統** - 每次按鍵操作扣除 1 代幣
- **即時狀態廣播** - 所有連接的玩家即時接收遊戲狀態更新

### 📹 影像串流
- **RTSP 串流支援** - 透過 MediaMTX 轉發攝影機畫面
- **WebRTC 即時影像** - 低延遲的即時視頻傳輸
- **HLS 備用方案** - 支援更廣泛的裝置相容性

### 📱 響應式設計
- **桌面版介面** - 完整功能的桌面控制面板
- **手機版介面** - 觸控優化的手機操作介面
- **Toast 提示系統** - 不影響視頻播放的提示訊息

### 👥 用戶系統
- **用戶註冊/登入** - Session 基礎的身份驗證
- **代幣管理** - 充值、扣除和交易記錄
- **遊玩歷史** - 記錄所有操作和交易

## 🏗️ 技術架構

### 後端技術
- **Node.js** - 後端運行環境
- **Express.js** - Web 框架
- **WebSocket (express-ws)** - 即時通訊
- **PostgreSQL** - 資料庫
- **Session 管理** - express-session

### 前端技術
- **HTML5 / CSS3** - 現代化介面
- **Vanilla JavaScript** - 無框架依賴
- **WebRTC API** - 即時視頻串流
- **Fetch API** - RESTful API 呼叫

### 硬體整合
- **RTSP Camera** - 即時影像來源
- **繼電器控制器** - WebSocket 通訊控制硬體
- **MediaMTX** - 串流媒體伺服器

## 📦 安裝步驟

### 1. 前置需求

```bash
# Node.js (v14 或以上)
node --version

# PostgreSQL (v12 或以上)
psql --version

# MediaMTX (用於 RTSP 轉 WebRTC)
# 下載: https://github.com/bluenviron/mediamtx/releases
```

### 2. 安裝相依套件

```bash
# 複製專案
git clone <your-repo-url>
cd RSTP

# 安裝 Node.js 套件
npm install
```

### 3. 設定資料庫

```bash
# 建立資料庫
createdb claw_machine

# 執行 schema
psql -d claw_machine -f schema.sql
```

### 4. 設定環境變數

創建 `.env` 文件：

```env
# 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=claw_machine

# Session 密鑰
SESSION_SECRET=your-super-secret-key-here

# 伺服器設定
PORT=3000

# RTSP 串流設定
RTSP_URL=rtsp://your-camera-ip:554/stream
```

### 5. 啟動 MediaMTX

```bash
# Windows
cd mediamtx_v*_windows_amd64
mediamtx.exe

# Linux
cd mediamtx_v*_linux_amd64
./mediamtx
```

### 6. 啟動應用程式

```bash
npm start
```

應用程式將在 `http://localhost:3000` 啟動

## 🎮 使用說明

### 第一次使用

1. **註冊帳號**
   - 訪問 `http://localhost:3000/register.html`
   - 填寫用戶名和密碼
   - 註冊時會獲得初始代幣

2. **登入系統**
   - 訪問 `http://localhost:3000/login.html`
   - 輸入帳號密碼登入

3. **開始遊玩**
   - 登入後會自動進入主頁面
   - 點擊「開始遊玩」按鈕獲得控制權
   - 使用鍵盤 W/A/S/D/Space 或手機觸控按鈕控制

### 遊戲狀態

- **🎮 正在遊玩中** - 您擁有控制權，可以操作夾娃娃機
- **⏳ 正在排隊等待** - 有人在玩，您在隊列中等待
- **👀 觀看模式** - 您在觀看但未加入排隊
- **🔄 連線中** - 正在連接到遊戲伺服器

### 控制說明

**桌面版（鍵盤）：**
- `W` - 向前
- `A` - 向左
- `S` - 向後
- `D` - 向右
- `Space` - 抓取

**手機版（觸控）：**
- 使用螢幕上的觸控按鈕控制

## 📁 專案結構

```
RSTP/
├── server.js                 # 主伺服器
├── database.js               # 資料庫連接
├── index.html                # 主遊戲介面
├── login.html                # 登入頁面
├── register.html             # 註冊頁面
├── schema.sql                # 資料庫結構
├── package.json              # Node.js 依賴
├── .gitignore                # Git 忽略規則
├── .env                      # 環境變數（需自行建立）
│
├── docs/                     # 文檔資料夾
│   ├── SETUP.md             # 詳細安裝指南
│   ├── SINGLE_PLAYER_QUEUE.md  # 排隊系統說明
│   ├── TOKEN_SYSTEM.md      # 代幣系統說明
│   └── WEBRTC-SETUP.md      # WebRTC 設定指南
│
└── Not using/               # 備用實作（HLS 等）
```

## 🔧 配置說明

### 繼電器控制器設定

在 `server.js` 中修改繼電器 WebSocket 地址：

```javascript
// server.js 第 369 行
currentPlayer.relayWs = new WebSocket('ws://192.168.50.161:8080');
```

### RTSP 串流設定

在 `server.js` 中修改 RTSP URL：

```javascript
// server.js 第 29 行
const rtspUrl = 'rtsp://your-camera-ip:554/stream';
```

### 超時時間調整

在 `server.js` 中修改閒置超時時間：

```javascript
// server.js 第 299 行
const INACTIVITY_TIMEOUT = 60000; // 毫秒（預設 1 分鐘）
```

## 🐛 已知問題與修復

### ✅ 已修復
- ✅ 手機版 alert 導致直播畫面停止
- ✅ 觀看模式玩家狀態不即時更新
- ✅ 觸控按鈕未檢查控制權
- ✅ 廣播邏輯遺漏觀看中的玩家

### ⚠️ 待改進
- 密碼採用明文儲存（建議改用 bcrypt）
- 缺少 HTTPS 支援
- 缺少速率限制（Rate Limiting）

## 📊 資料庫結構

### users 表
- `id` - 用戶 ID
- `username` - 用戶名
- `password` - 密碼（明文）
- `tokens` - 代幣餘額
- `created_at` - 建立時間

### token_transactions 表
- `id` - 交易 ID
- `user_id` - 用戶 ID
- `amount` - 金額變動
- `transaction_type` - 交易類型
- `description` - 描述
- `balance_after` - 交易後餘額
- `created_at` - 交易時間

## 🤝 貢獻指南

歡迎提交 Pull Request 或開啟 Issue！

### 開發流程

1. Fork 此專案
2. 創建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

此專案採用 MIT 授權 - 詳見 LICENSE 文件

## 👨‍💻 作者

- **Ming** - *Initial work*

## 🙏 致謝

- [MediaMTX](https://github.com/bluenviron/mediamtx) - RTSP 轉 WebRTC 串流伺服器
- [jsmpeg](https://github.com/phoboslab/jsmpeg) - JavaScript MPEG1 播放器
- Claude Code - 開發協助

---

**注意：** 此系統僅供教育和娛樂用途。請確保遵守當地法律法規。
