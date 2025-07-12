const socket = new WebSocket('https://test-y778.onrender.com');

socket.addEventListener('open', () => {
  const data = { type: 'message', content: 'Hello from Node.js!' };
  socket.send(JSON.stringify(data));
});

