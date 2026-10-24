const jwt = require('jsonwebtoken');

/**
 * Socket.IO event handler
 * Each trip has its own room: `trip:${tripId}`
 * Clients join on connection and get real-time updates for:
 *  - itinerary_update
 *  - poll_update
 *  - expense_update
 *  - member_joined
 */
const initializeSocket = (io) => {
  // Middleware: authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} — user: ${socket.user?.name}`);

    // Join a trip room
    socket.on('join_trip', (tripId) => {
      socket.join(`trip:${tripId}`);
      console.log(`User ${socket.user?.name} joined trip room: ${tripId}`);
      socket.to(`trip:${tripId}`).emit('member_online', {
        userId: socket.user.id,
        name: socket.user.name,
      });
    });

    // Leave a trip room
    socket.on('leave_trip', (tripId) => {
      socket.leave(`trip:${tripId}`);
      socket.to(`trip:${tripId}`).emit('member_offline', {
        userId: socket.user.id,
      });
    });

    // Broadcast itinerary change to all trip members
    socket.on('itinerary_change', ({ tripId, data }) => {
      socket.to(`trip:${tripId}`).emit('itinerary_update', {
        ...data,
        updatedBy: { id: socket.user.id, name: socket.user.name },
      });
    });

    // Broadcast poll change
    socket.on('poll_change', ({ tripId, data }) => {
      socket.to(`trip:${tripId}`).emit('poll_update', {
        ...data,
        updatedBy: { id: socket.user.id, name: socket.user.name },
      });
    });

    // Broadcast expense change
    socket.on('expense_change', ({ tripId, data }) => {
      socket.to(`trip:${tripId}`).emit('expense_update', {
        ...data,
        updatedBy: { id: socket.user.id, name: socket.user.name },
      });
    });

    // Typing indicator for activity suggestions
    socket.on('typing', ({ tripId }) => {
      socket.to(`trip:${tripId}`).emit('user_typing', {
        userId: socket.user.id,
        name: socket.user.name,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initializeSocket };
