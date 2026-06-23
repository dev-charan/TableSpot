import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io('http://localhost:5000', { autoConnect: false });
  }
  return socketInstance;
};

export const useSocket = (restaurantId, onBookingUpdate) => {
  const socket = useRef(getSocket());

  useEffect(() => {
    const s = socket.current;
    s.connect();
    if (restaurantId) s.emit('join_restaurant', restaurantId);
    if (onBookingUpdate) s.on('booking_update', onBookingUpdate);

    return () => {
      if (restaurantId) s.emit('leave_restaurant', restaurantId);
      if (onBookingUpdate) s.off('booking_update', onBookingUpdate);
    };
  }, [restaurantId, onBookingUpdate]);

  return socket.current;
};
