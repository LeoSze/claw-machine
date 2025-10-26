const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const rtspUrl = 'rtsp://crushcookie0204:3515343Yes@192.168.50.106:554/stream2';
const hlsPath = path.join(__dirname, 'hls');

// 創建 HLS 目錄
if (!fs.existsSync(hlsPath)) {
  fs.mkdirSync(hlsPath);
  console.log('✅ 創建 HLS 目錄');
}

// 提供 HLS 文件
app.use('/hls', express.static(hlsPath));

console.log('🎬 使用 FFmpeg 路徑:', ffmpegPath);
console.log('📁 HLS 輸出目錄:', hlsPath);

// 使用 FFmpeg 將 RTSP 轉成 HLS (保持 H.264，不轉碼)
const ffmpegArgs = [
  '-rtsp_transport', 'tcp',
  '-i', rtspUrl,
  '-c:v', 'copy',                    // 不轉碼！直接複製 H.264
  '-an',                             // 禁用音頻
  '-f', 'hls',
  '-hls_time', '4',                  // 4 秒一個片段（更穩定）
  '-hls_list_size', '10',            // 保留 10 個片段（更大緩衝）
  '-hls_flags', 'delete_segments',   // 自動刪除舊片段
  '-hls_allow_cache', '1',           // 允許緩存
  '-hls_segment_filename', path.join(hlsPath, 'segment%03d.ts'),
  path.join(hlsPath, 'stream.m3u8')
];

console.log('🚀 啟動 FFmpeg...');
const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

ffmpeg.stdout.on('data', (data) => {
  console.log('📺 FFmpeg 輸出:', data.toString());
});

ffmpeg.stderr.on('data', (data) => {
  const msg = data.toString();
  // 只顯示重要訊息
  if (msg.includes('error') || msg.includes('Error')) {
    console.error('❌ FFmpeg 錯誤:', msg);
  } else if (msg.includes('Opening')) {
    console.log('✅ 正在連線 RTSP...');
  } else if (msg.includes('Stream') || msg.includes('Video')) {
    console.log('📹 串流資訊:', msg.trim());
  }
});

ffmpeg.on('error', (err) => {
  console.error('❌ FFmpeg 啟動失敗:', err);
});

ffmpeg.on('close', (code) => {
  console.log(`⚠️ FFmpeg 程序結束，代碼: ${code}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-hls.html'));
});

app.listen(2000, () => {
  console.log('');
  console.log('🎉 HLS 伺服器啟動成功！');
  console.log('📺 播放頁面: http://localhost:2000');
  console.log('📁 HLS 串流: http://localhost:2000/hls/stream.m3u8');
  console.log('');
  console.log('⏳ 等待 HLS 片段生成中（約 5-10 秒）...');
});
