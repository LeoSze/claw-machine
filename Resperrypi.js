const { Chip, Line } = require('node-libgpiod');
const { WebSocketServer } = require('ws');

// --- 設定 ---
const PORT = 8080; // WebSocket 伺服器使用的端口
const GPIO_CHIP = 'gpiochip4'; // 根據你的 Raspberry Pi 型號可能需要調整 (例如 'gpiochip0')

// *** 請根據你的實際接線修改這些 GPIO 引腳編號 ***
const RELAY_PINS = {
  W: 17,     // 對應 'W' 鍵的繼電器通道 1
  A: 27,     // 對應 'A' 鍵的繼電器通道 2
  S: 22,     // 對應 'S' 鍵的繼電器通道 3
  D: 23,     // 對應 'D' 鍵的繼電器通道 4
  Space: 24  // 【新增】對應 'Space' 鍵的繼電器通道 5
};

// *** 重要：設定繼電器的觸發方式 ***
// 大多數繼電器模組是「低電位觸發」(Active-Low)
// 低電位觸發: RELAY_ON = 0, RELAY_OFF = 1
// 高電位觸發: RELAY_ON = 1, RELAY_OFF = 0
const RELAY_ON = 0;  // 繼電器合上 (通電) 的訊號
const RELAY_OFF = 1; // 繼電器斷開 (斷電) 的訊號

async function startServer() {
  const chip = new Chip(GPIO_CHIP);
  const relayLines = {};

  // --- GPIO 初始化 ---
  console.log('Initializing GPIO pins...');
  for (const key in RELAY_PINS) {
    const pin = RELAY_PINS[key];
    const line = new Line(chip, pin);
    await line.requestOutputMode();
    // 確保程式啟動時，所有繼電器電路都是斷開的
    await line.setValue(RELAY_OFF);
    relayLines[key] = line;
    console.log(`✅ Relay for key '${key}' on GPIO ${pin} is ready.`);
  }

  // --- 啟動 WebSocket 伺服器 ---
  const wss = new WebSocketServer({ port: PORT });
  console.log(`\n✅ WebSocket server started on ws://<YOUR_PI_IP>:${PORT}`);
  console.log('Waiting for client connection...');

  wss.on('connection', ws => {
    console.log('🔗 Client connected.');

    // 監聽來自客戶端的訊息
    ws.on('message', async (message) => {
      const msg = message.toString();
      // 訊息格式應為 "KEY_STATE", 例如 "W_DOWN", "A_UP", "Space_DOWN"
      const [key, state] = msg.split('_');

      // 檢查是否是我們定義的按鍵
      if (relayLines[key]) {
        const line = relayLines[key];
        if (state === 'DOWN') {
          console.log(`Received: ${msg} -> 繼電器 ${key} 電路合上 (ON)`);
          await line.setValue(RELAY_ON); // 合上電路
        } else if (state === 'UP') {
          console.log(`Received: ${msg} -> 繼電器 ${key} 電路斷開 (OFF)`);
          await line.setValue(RELAY_OFF); // 斷開電路
        }
      } else {
        console.warn(`⚠️ Received unknown key in message: ${msg}`);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Client disconnected.');
    });
  });

  // --- 程式結束時的清理工作 ---
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    wss.close(); // 關閉 WebSocket 伺服器

    for (const key in relayLines) {
      await relayLines[key].setValue(RELAY_OFF); // 確保繼電器斷電
      relayLines[key].release();
    }
    chip.close();
    console.log('GPIO and server cleaned up. Exiting.');
    process.exit(0);
  });
}

startServer().catch(error => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
