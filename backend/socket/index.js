const setupSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_restaurant', (restaurantId) => {
      socket.join(`restaurant_${restaurantId}`);
    });

    socket.on('leave_restaurant', (restaurantId) => {
      socket.leave(`restaurant_${restaurantId}`);
    });

    socket.on('disconnect', () => {});
  });
};

module.exports = setupSocket;
