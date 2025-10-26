# WebRTC 低延遲串流設置指南

## ⚡ WebRTC 優勢

✅ **超低延遲**：<500ms（比 JSMpeg 還低！）
✅ **極致流暢**：GPU 硬體解碼（跟 HLS 一樣順！）
✅ **最佳方案**：同時達到低延遲 + 高流暢度

---

## 📦 步驟 1: 下載 MediaMTX

### Windows:

1. 前往 https://github.com/bluenviron/mediamtx/releases
2. 下載最新版本的 `mediamtx_vX.X.X_windows_amd64.zip`
3. 解壓縮到你的專案資料夾：`C:\Users\Ming\Desktop\Project\RSTP\`
4. 你應該會看到 `mediamtx.exe` 檔案

---

## ⚙️ 步驟 2: 配置 MediaMTX

配置檔案 `mediamtx.yml` 已經為你準備好了！

檢查配置內容：
- ✅ WebRTC 已啟用（port 8889）
- ✅ RTSP 來源已設定（你的 Tapo 攝影機）
- ✅ 使用 TCP 傳輸（更穩定）

---

## 🚀 步驟 3: 啟動 MediaMTX

### 方法 1: 雙擊執行
直接雙擊 `mediamtx.exe`

### 方法 2: 命令列
```bash
cd C:\Users\Ming\Desktop\Project\RSTP
.\mediamtx.exe
```

看到以下訊息表示成功：
```
INF [WebRTC] listener opened on :8889
INF [path tapo] ready (RTSP source)
```

---

## 🎬 步驟 4: 開啟播放器

用瀏覽器開啟：
```
C:\Users\Ming\Desktop\Project\RSTP\index-webrtc.html
```

或使用任何 Web 伺服器（如果需要）：
```bash
npx serve .
```

---

## 📊 三種方案比較

| 方案 | 延遲 | 流暢度 | 使用情境 |
|------|------|--------|---------|
| **WebRTC** | ⚡ <500ms | ⭐⭐⭐⭐⭐ 極高 | **最佳選擇！低延遲+流暢** |
| HLS | 🐢 4-8秒 | ⭐⭐⭐⭐⭐ 極高 | 需要穩定但不在乎延遲 |
| JSMpeg | ⚡ 1-2秒 | ⭐⭐⭐ 中等 | 簡單部署但效能一般 |

---

## 🔧 故障排除

### 問題 1: "連接錯誤"
- 確認 MediaMTX 正在運行
- 檢查 `http://localhost:8889/tapo/whep` 是否可訪問

### 問題 2: "RTSP 連接失敗"
- 確認攝影機 IP: 192.168.50.106
- 確認帳號密碼正確
- 確認攝影機在線

### 問題 3: "黑畫面"
- 等待 5-10 秒讓連接建立
- 檢查瀏覽器 Console 是否有錯誤
- 重新整理頁面

---

## 🎯 下一步

WebRTC 方案已經是最優解！
- ✅ 延遲最低
- ✅ 流暢度最高
- ✅ CPU 使用率低
- ✅ 支援所有現代瀏覽器

享受超低延遲 + 超流暢的監控體驗！ 🚀
