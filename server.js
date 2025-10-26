const express = require('express');
const app = express();
const server = require('http').createServer(app);
const session = require('express-session');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
require('dotenv').config();

// 導入資料庫連線
const pool = require('./database');

// 導入並設定 express-ws (WebSocket)
// 這會讓 express app 能夠處理 WebSocket 連線
require('express-ws')(app, server);

// 導入 rtsp-relay，並傳入 express app
const { proxy } = require('rtsp-relay')(app);

const port = process.env.PORT || 3000; // 你的 Node.js 伺服器將運行的埠號

// 中間件設定
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session 設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在生產環境使用 HTTPS 時設為 true
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 小時
  }
}));

// 認證中間件
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// --- !! 這裡是關鍵 !! ---
//
// 你必須將 'rtspUrl' 換成你攝影機的 *完整* RTSP 網址
// 根據你的圖片，IP 應該是 192.168.50.106
// 你需要填入正確的 [username], [password], [port] 和 [stream_path]
//
// stream1 = 高品質 (較卡)
// stream2 = 低品質 (流暢，類似 Tapo app)
const rtspUrl = 'rtsp://crushcookie0204:3515343Yes@192.168.50.106:554/stream2';
//
// --- !! 務必修改上面這行 !! ---


// 建立一個 WebSocket 代理
// 'proxy' 函數會回傳一個處理 WebSocket 連線的 handler
// 當瀏覽器連線到 /api/stream 時，這個 handler 會被觸發
const streamProxy = proxy({
  url: rtspUrl,
  verbose: false,      // 關閉日誌以提升性能
  transport: 'tcp',    // 強制使用 TCP，通常在內網更穩定

  // 步驟1: 基本編碼優化 ✅
  // 步驟2: 緩衝優化 ❌ (導致畫面消失，已移除)
  // 步驟4A: 降低幀率 ❌ (Tapo app 幀率高，錯誤方向)
  // 步驟4B: 降低解析度（保持高幀率）✅
  // 步驟4C: 降低碼率（確保高幀率不卡頓）✅
  // 步驟5: 極致流暢度優化（追求最高幀率）
  additionalFlags: [
    '-preset', 'ultrafast',    // 最快編碼速度
    '-tune', 'zerolatency',    // 零延遲調優
    '-vf', 'scale=480:270',    // 降低到 270p（給幀率更多空間）
    '-b:v', '500k',            // 更低碼率 500kbps（優先幀率）
    '-maxrate', '700k',        // 最大碼率 700kbps
    '-bufsize', '300k',        // 更小緩衝區
    '-g', '30',                // GOP 30（更頻繁的關鍵幀）
    '-keyint_min', '15',       // 最小關鍵幀間隔
  ],
});

// 將 WebSocket 路由掛載到 /api/stream (需要認證)
// 這表示我們的網頁前端將會連線到 ws://[server_ip]:2000/api/stream
app.ws('/api/stream', streamProxy);

// ========== API 路由 ==========

// 註冊 API
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  // 驗證輸入
  if (!username || !email || !password) {
    return res.status(400).json({ message: '請填寫所有欄位' });
  }

  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: '使用者名稱長度必須在 3-50 字元之間' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '密碼長度至少需要 6 個字元' });
  }

  try {
    // 檢查使用者名稱或 email 是否已存在
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      if (userCheck.rows[0].username === username) {
        return res.status(400).json({ message: '此使用者名稱已被使用' });
      }
      if (userCheck.rows[0].email === email) {
        return res.status(400).json({ message: '此電子郵件已被註冊' });
      }
    }

    // 插入新使用者（預設給予 100 個代幣）- 密碼明文儲存
    const result = await pool.query(
      'INSERT INTO users (username, email, password, tokens) VALUES ($1, $2, $3, 100) RETURNING id, username, email, tokens',
      [username, email, password]
    );

    const newUser = result.rows[0];

    // 記錄初始代幣交易
    await pool.query(
      'INSERT INTO token_transactions (user_id, amount, transaction_type, description, balance_after) VALUES ($1, $2, $3, $4, $5)',
      [newUser.id, 100, 'initial', '新用戶註冊贈送', 100]
    );

    console.log(`✅ 新使用者註冊成功: ${username} (初始代幣: 100)`);
    res.status(201).json({
      message: '註冊成功！您獲得了 100 個代幣',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        tokens: newUser.tokens
      }
    });

  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
});

// 登入 API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '請填寫所有欄位' });
  }

  try {
    // 查詢使用者 (可以使用 username 或 email 登入)
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '帳號或密碼錯誤' });
    }

    const user = result.rows[0];

    // 驗證密碼（明文比對）
    if (password !== user.password) {
      return res.status(401).json({ message: '帳號或密碼錯誤' });
    }

    // 更新最後登入時間
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // 建立 session
    req.session.userId = user.id;
    req.session.username = user.username;

    console.log(`✅ 使用者登入成功: ${user.username} (代幣: ${user.tokens})`);
    res.json({
      message: '登入成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tokens: user.tokens
      }
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
  }
});

// 登出 API
app.post('/api/logout', (req, res) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) {
      console.error('登出錯誤:', err);
      return res.status(500).json({ message: '登出失敗' });
    }
    console.log(`✅ 使用者登出: ${username}`);
    res.json({ message: '登出成功' });
  });
});

// 檢查登入狀態 API
app.get('/api/check-auth', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      // 查詢最新的代幣餘額
      const result = await pool.query(
        'SELECT id, username, email, tokens FROM users WHERE id = $1',
        [req.session.userId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        res.json({
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            tokens: user.tokens
          }
        });
      } else {
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error('檢查認證錯誤:', error);
      res.json({ authenticated: false });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// 獲取代幣餘額 API
app.get('/api/tokens', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: '請先登入' });
  }

  try {
    const result = await pool.query(
      'SELECT tokens FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length > 0) {
      res.json({ tokens: result.rows[0].tokens });
    } else {
      res.status(404).json({ message: '使用者不存在' });
    }
  } catch (error) {
    console.error('獲取代幣錯誤:', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 代幣交易記錄 API
app.get('/api/token-history', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: '請先登入' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM token_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.session.userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('獲取交易記錄錯誤:', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// ========== 遊戲控制權管理 ==========
let currentPlayer = null; // 當前遊玩的玩家 { userId, username, ws, lastActionTime }
let waitingPlayers = []; // 等待中的玩家列表
let connectedClients = []; // 所有連接的客戶端 { userId, username, ws }
const INACTIVITY_TIMEOUT = 60000; // 1 分鐘無操作時間 (60000ms)

// 檢查玩家是否超時
function checkPlayerTimeout() {
  if (currentPlayer) {
    const timeSinceLastAction = Date.now() - currentPlayer.lastActionTime;
    if (timeSinceLastAction >= INACTIVITY_TIMEOUT) {
      console.log(`⏰ ${currentPlayer.username} 超過 1 分鐘無操作，釋放控制權`);

      const timeoutPlayer = {
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        ws: currentPlayer.ws
      };

      // 釋放控制權（這會關閉繼電器連接並廣播狀態）
      releaseControl();

      // 超時後不自動重新排隊，讓玩家手動選擇是否繼續
      console.log(`⏰ ${timeoutPlayer.username} 已超時，需要手動重新加入遊戲`);

      // 明確通知該玩家超時（在 releaseControl 之後）
      if (timeoutPlayer.ws && timeoutPlayer.ws.readyState === 1) {
        timeoutPlayer.ws.send(JSON.stringify({
          type: 'timeout',
          message: '您已超過 1 分鐘沒有操作，控制權已轉移'
        }));
      }

      // 嘗試給予下一位等待的玩家
      assignNextPlayer();
    }
  }
}

// 釋放當前玩家的控制權
function releaseControl() {
  if (currentPlayer) {
    const releasedPlayer = currentPlayer;

    // 先通知該玩家失去控制權
    if (releasedPlayer.ws && releasedPlayer.ws.readyState === 1) {
      releasedPlayer.ws.send(JSON.stringify({
        type: 'control_lost',
        message: '您已失去控制權'
      }));
    }

    // 關閉繼電器連線
    if (releasedPlayer.relayWs) {
      releasedPlayer.relayWs.close();
    }
  }

  currentPlayer = null;
  broadcastPlayerStatus();
}

// 分配控制權給下一位玩家
function assignNextPlayer() {
  if (waitingPlayers.length > 0 && !currentPlayer) {
    const nextPlayer = waitingPlayers.shift();

    // 檢查 WebSocket 是否還連接
    if (nextPlayer.ws.readyState === 1) {
      currentPlayer = nextPlayer;
      currentPlayer.lastActionTime = Date.now();

      // 連接到繼電器
      currentPlayer.relayWs = new WebSocket('ws://192.168.50.161:8080');
      setupRelayConnection(currentPlayer);

      console.log(`🎮 ${currentPlayer.username} 獲得控制權`);

      // 通知玩家獲得控制權
      currentPlayer.ws.send(JSON.stringify({
        type: 'control_granted',
        message: '您已獲得控制權！'
      }));

      broadcastPlayerStatus();
    } else {
      // 該玩家已斷線，嘗試下一位
      assignNextPlayer();
    }
  }
}

// 廣播當前遊玩狀態給所有連接的客戶端
function broadcastPlayerStatus() {
  // 向所有連接的客戶端發送狀態更新
  connectedClients.forEach((client) => {
    if (client.ws.readyState !== 1) return; // 跳過已斷線的客戶端

    // 檢查該客戶端的狀態
    const isCurrentPlayer = currentPlayer && currentPlayer.userId === client.userId;
    const queueIndex = waitingPlayers.findIndex(p => p.userId === client.userId);
    const isInQueue = queueIndex !== -1;

    if (isCurrentPlayer) {
      // 當前玩家：擁有控制權
      client.ws.send(JSON.stringify({
        type: 'player_status',
        canPlay: true,
        currentPlayer: currentPlayer.username,
        waitingCount: waitingPlayers.length
      }));
    } else if (isInQueue) {
      // 排隊中的玩家
      client.ws.send(JSON.stringify({
        type: 'player_status',
        canPlay: false,
        queuePosition: queueIndex,
        currentPlayer: currentPlayer ? currentPlayer.username : null,
        waitingCount: waitingPlayers.length
      }));
    } else {
      // 觀看模式的玩家
      client.ws.send(JSON.stringify({
        type: 'player_status',
        canPlay: false,
        currentPlayer: currentPlayer ? currentPlayer.username : null,
        waitingCount: waitingPlayers.length
      }));
    }
  });
}

// 設定繼電器連接
function setupRelayConnection(player) {
  player.relayWs.on('open', () => {
    console.log(`✅ ${player.username} 已連接到繼電器`);
    player.ws.send(JSON.stringify({
      type: 'relay_connected',  // 改用不同的類型，避免覆蓋初始連接狀態
      message: '已連接到遊戲控制器'
    }));
  });

  player.relayWs.on('error', (error) => {
    console.error('繼電器連線錯誤:', error);
    player.ws.send(JSON.stringify({
      type: 'error',
      message: '無法連接到遊戲控制器'
    }));
  });

  player.relayWs.on('close', () => {
    console.log(`❌ ${player.username} 與繼電器斷開連線`);
  });

  // 轉發來自繼電器的訊息到前端
  player.relayWs.on('message', (message) => {
    if (player.ws.readyState === 1) {
      player.ws.send(message);
    }
  });
}

// 每 5 秒檢查一次超時
setInterval(checkPlayerTimeout, 5000);

// ========== WebSocket 繼電器控制（含代幣扣除）==========
// 這個 WebSocket 會作為中繼，連接到實際的繼電器並處理代幣扣除
app.ws('/api/relay-control', async (ws, req) => {
  console.log('🎮 新的遊戲連線');

  // 從 session 獲取使用者資訊
  const userId = req.session?.userId;
  const username = req.session?.username || '訪客';

  // 檢查是否已登入
  if (!userId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '請先登入才能遊玩'
    }));
    ws.close();
    return;
  }

  // 建立玩家物件（但不自動加入遊戲）
  const player = {
    userId,
    username,
    ws,
    lastActionTime: Date.now(),
    relayWs: null
  };

  // 添加到連接客戶端列表
  connectedClients.push({
    userId,
    username,
    ws
  });

  // 發送當前遊戲狀態，讓前端決定是否顯示按鈕
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已連接到遊戲伺服器',
    hasCurrentPlayer: currentPlayer !== null,
    currentPlayer: currentPlayer ? currentPlayer.username : null,
    waitingCount: waitingPlayers.length
  }));

  console.log(`👀 ${username} 連線成功，等待加入遊戲 (目前 ${connectedClients.length} 人在線)`)

  // 處理來自前端的訊息（遊戲操作）
  ws.on('message', async (message) => {
    try {
      const command = message.toString();

      // 處理加入遊戲請求
      if (command === 'JOIN_QUEUE') {
        // 檢查是否已經在遊玩中
        if (currentPlayer && currentPlayer.userId === userId) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '您已經在遊玩中'
          }));
          return;
        }

        // 檢查是否已經在排隊中
        const alreadyInQueue = waitingPlayers.some(p => p.userId === userId);
        if (alreadyInQueue) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '您已經在排隊中'
          }));
          return;
        }

        // 如果沒有人在玩，直接給予控制權
        if (!currentPlayer) {
          currentPlayer = {
            userId,
            username,
            ws,
            lastActionTime: Date.now(),
            relayWs: new WebSocket('ws://192.168.50.161:8080')
          };

          setupRelayConnection(currentPlayer);
          console.log(`🎮 ${username} 獲得控制權`);

          // 發送控制權獲得通知
          ws.send(JSON.stringify({
            type: 'control_granted',
            message: '您已獲得控制權！'
          }));

          // 發送玩家狀態更新
          ws.send(JSON.stringify({
            type: 'player_status',
            canPlay: true,
            currentPlayer: username,
            waitingCount: 0
          }));

          // 廣播給其他玩家
          broadcastPlayerStatus();
        } else {
          // 有人在玩，加入排隊
          waitingPlayers.push({
            userId,
            username,
            ws
          });

          console.log(`⏳ ${username} 加入排隊 (位置: ${waitingPlayers.length})`);

          ws.send(JSON.stringify({
            type: 'joined_queue',
            message: `已加入排隊，您的位置是第 ${waitingPlayers.length} 位`,
            queuePosition: waitingPlayers.length - 1
          }));

          broadcastPlayerStatus();
        }
        return;
      }

      // 只有當前玩家可以操作
      if (!currentPlayer || currentPlayer.userId !== userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: '您沒有控制權'
        }));
        return;
      }

      // 更新最後操作時間
      currentPlayer.lastActionTime = Date.now();

      // 只對按下操作（_DOWN）扣除代幣，放開操作（_UP）不扣
      if (command.endsWith('_DOWN')) {
        // 檢查並扣除代幣
        const result = await pool.query(
          'SELECT tokens FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '使用者不存在'
          }));
          return;
        }

        const currentTokens = result.rows[0].tokens;

        // 檢查代幣是否足夠
        if (currentTokens < 1) {
          ws.send(JSON.stringify({
            type: 'insufficient_tokens',
            message: '代幣不足！請充值後再遊玩',
            tokens: 0
          }));
          return;
        }

        // 扣除 1 個代幣
        const updateResult = await pool.query(
          'UPDATE users SET tokens = tokens - 1 WHERE id = $1 RETURNING tokens',
          [userId]
        );

        const newBalance = updateResult.rows[0].tokens;

        // 記錄代幣交易
        await pool.query(
          'INSERT INTO token_transactions (user_id, amount, transaction_type, description, balance_after) VALUES ($1, $2, $3, $4, $5)',
          [userId, -1, 'game_action', command, newBalance]
        );

        console.log(`💰 ${username} 使用操作 ${command}，代幣: ${currentTokens} → ${newBalance}`);

        // 轉發指令到實際的繼電器
        if (currentPlayer.relayWs && currentPlayer.relayWs.readyState === WebSocket.OPEN) {
          currentPlayer.relayWs.send(command);
        }

        // 回傳新的代幣餘額給前端
        ws.send(JSON.stringify({
          type: 'token_deducted',
          command: command,
          tokens: newBalance,
          message: `操作成功！剩餘代幣: ${newBalance}`
        }));

      } else if (command.endsWith('_UP')) {
        // 放開操作不扣代幣，直接轉發
        if (currentPlayer.relayWs && currentPlayer.relayWs.readyState === WebSocket.OPEN) {
          currentPlayer.relayWs.send(command);
        }
      }

    } catch (error) {
      console.error('處理遊戲操作錯誤:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '操作失敗，請稍後再試'
      }));
    }
  });

  // 處理前端斷線
  ws.on('close', () => {
    console.log(`👋 ${username} 離開遊戲`);

    // 從連接客戶端列表中移除
    connectedClients = connectedClients.filter(c => c.userId !== userId);
    console.log(`📊 剩餘 ${connectedClients.length} 人在線`);

    // 如果是當前玩家離開
    if (currentPlayer && currentPlayer.userId === userId) {
      console.log(`🎮 當前玩家 ${username} 離開，釋放控制權`);
      releaseControl();
      assignNextPlayer();
    } else {
      // 如果是等待中的玩家離開，從隊列中移除
      waitingPlayers = waitingPlayers.filter(p => p.userId !== userId);
      console.log(`⏳ 等待中的玩家 ${username} 離開隊列，剩餘 ${waitingPlayers.length} 人等待`);
      broadcastPlayerStatus();
    }
  });
});

// 提供靜態檔案 (例如 jsmpeg.min.js)
app.use(express.static(__dirname));

// 建立一個 HTTP 路由，用來提供播放器網頁 (不需要認證，所有人都可以訪問)
app.get('/', (req, res) => {
  // 直接傳送 index.html 檔案
  res.sendFile(__dirname + '/index.html');
});

// 啟動伺服器
server.listen(port, () => {
  console.log(`Node.js 伺服器已啟動於 http://localhost:${port}`);
  console.log(`  > 播放頁面: http://localhost:${port}`);
  console.log(`  > 正在嘗試從 ${rtspUrl} 拉取 RTSP 串流...`);
  console.log(`  > (請確保 ffmpeg 已安裝並在系統 PATH 中)`);
});