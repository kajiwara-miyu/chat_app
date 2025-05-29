// server.js

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
  console.log('A client connected');

  // ウェルカムメッセージを JSON 形式で送る
  ws.send(JSON.stringify({
    type: 'system',
    content: 'Welcome to WebSocket chat!'
  }));

  // メッセージを全クライアントにブロードキャスト
  ws.on('message', (message) => {
    console.log('Received message:', message);

    // クライアント全員にメッセージを転送
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);  // クライアントが JSON.stringify して送っている前提
      }
    });
  });
});

console.log('WebSocket server running on ws://localhost:8081');
