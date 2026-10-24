require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initializeSocket } = require('./socket/socketHandler');

const httpServer = http.createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store io on app so middleware can attach req.io
app.set('io', io);

// Initialize Socket.IO event handlers
initializeSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 TripSync server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
});
