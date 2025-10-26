# 公網 IP 訪問設定指南

## 問題說明

當從公網 IP 訪問監控系統時，WebSocket 連接失敗，因為瀏覽器無法從公網訪問內網 IP `192.168.50.161:8080`。

## 已完成的修復

### 1. 自動 IP 偵測
修改了 `index.html`，現在系統會自動偵測訪問方式：

- **內網訪問** (192.168.x.x, localhost)
  - WebSocket: `ws://192.168.50.161:8080`
  - WebRTC: `http://192.168.50.177:8889/tapo/whep`

- **公網訪問** (任何其他 IP)
  - WebSocket: `ws://[當前主機名]:8080`
  - WebRTC: `http://[當前主機名]:8889/tapo/whep`

### 2. 連接狀態檢查
所有按鍵發送邏輯都會先檢查 WebSocket 連接狀態，避免在未連接時拋出錯誤。

## Raspberry Pi 伺服器設定

### Resperrypi.js 代碼檢查

✅ **好消息**: `Resperrypi.js` 不需要修改！

代碼中的 WebSocket 伺服器已經正確配置：
```javascript
const wss = new WebSocketServer({ port: PORT });
```

這會監聽所有網路介面 (0.0.0.0)，可以接受來自內網和公網的連接。

### 確認 Raspberry Pi 設定

在 Raspberry Pi 上執行以下命令確認服務正在運行：

```bash
# 檢查 WebSocket 伺服器是否在運行
ps aux | grep Resperrypi.js

# 檢查端口 8080 是否在監聽
sudo netstat -tuln | grep 8080
# 或
sudo ss -tuln | grep 8080

# 應該看到類似輸出:
# tcp   0   0   0.0.0.0:8080   0.0.0.0:*   LISTEN
```

如果看到 `0.0.0.0:8080`，表示伺服器正在監聽所有介面 ✅

## 需要的網路設定

### 路由器端口轉發設定

要讓公網訪問能夠正常工作，需要在路由器上設定以下端口轉發：

#### 1. HTTP 伺服器 (監控頁面)
```
外部端口: 8080 (或您選擇的端口)
內部 IP: 192.168.50.177 (Node.js server)
內部端口: 3000
協議: TCP
```

#### 2. MediaMTX WebRTC (視訊串流)
```
外部端口: 8889
內部 IP: 192.168.50.177 (MediaMTX server)
內部端口: 8889
協議: TCP
```

#### 3. 繼電器 WebSocket (按鍵控制)
```
外部端口: 8080
內部 IP: 192.168.50.161 (Raspberry Pi)
內部端口: 8080
協議: TCP
```

### 注意事項

⚠️ **端口衝突問題**
- HTTP 伺服器和繼電器都需要使用 8080 端口
- 解決方案：
  1. **選項 A**: 修改其中一個服務的端口號
  2. **選項 B**: 使用不同的外部端口，例如：
     - HTTP 伺服器: 外部 8080 → 內部 192.168.50.177:3000
     - 繼電器: 外部 8081 → 內部 192.168.50.161:8080

### 建議的設定方案

```
服務                外部端口    內部 IP              內部端口
---------------------------------------------------------------
HTTP 伺服器        3000      192.168.50.177        3000
MediaMTX WebRTC    8889      192.168.50.177        8889
繼電器 WebSocket   8080      192.168.50.161        8080
```

## 修改代碼使用不同端口

如果採用選項 B（使用不同外部端口），需要修改 `index.html`:

```javascript
// 在 getRelayWebSocketUrl() 函數中
function getRelayWebSocketUrl() {
  const hostname = window.location.hostname;

  if (hostname.startsWith('192.168.') || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://192.168.50.161:8080';
  }

  // 公網訪問使用不同的端口 8081
  return `ws://${hostname}:8081`;
}
```

## 測試步驟

### 內網測試
1. 訪問: `http://192.168.50.177:3000`
2. 檢查控制台輸出：
   ```
   🔌 嘗試連接繼電器 WebSocket: ws://192.168.50.161:8080
   Connected to relay server
   ```

### 公網測試
1. 訪問: `http://[您的公網IP]:8080` (或您設定的端口)
2. 檢查控制台輸出：
   ```
   🔌 嘗試連接繼電器 WebSocket: ws://[您的公網IP]:8081
   Connected to relay server
   ```

## 防火牆設定

### Windows Firewall (如果服務器在 Windows)
```powershell
# 允許端口 3000
netsh advfirewall firewall add rule name="HTTP Server" dir=in action=allow protocol=TCP localport=3000

# 允許端口 8889
netsh advfirewall firewall add rule name="MediaMTX WebRTC" dir=in action=allow protocol=TCP localport=8889
```

### Raspberry Pi (如果繼電器在 Linux)
```bash
# 允許端口 8080
sudo ufw allow 8080/tcp
```

## 安全建議

1. **使用 HTTPS/WSS**: 考慮使用 SSL 證書加密連接
2. **認證機制**: 添加用戶認證，避免未授權訪問
3. **IP 白名單**: 限制只允許特定 IP 訪問
4. **更改預設端口**: 使用非標準端口增加安全性

## 故障排除

### WebSocket 連接失敗
1. 檢查路由器端口轉發是否正確設定
2. 檢查防火牆是否允許相應端口
3. 確認 Raspberry Pi 上的 WebSocket 伺服器正在運行
4. 使用瀏覽器開發者工具查看詳細錯誤訊息

### WebRTC 視訊無法播放
1. 檢查 MediaMTX 是否正在運行
2. 確認端口 8889 已正確轉發
3. 檢查攝影機 RTSP 串流是否正常

### 按鍵控制無反應
1. 檢查 WebSocket 連接狀態（查看頁面上的連線狀態指示）
2. 打開瀏覽器控制台，查看是否有警告訊息
3. 確認繼電器伺服器正在運行並監聽 8080 端口
