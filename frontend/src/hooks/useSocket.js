import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Join a trip's socket room when a trip page mounts.
 * Automatically leaves when unmounting.
 */
export function useSocket(tripId) {
  useEffect(() => {
    if (!tripId) return;
    const socket = getSocket();
    socket.emit('join_trip', tripId);
    return () => {
      socket.emit('leave_trip', tripId);
    };
  }, [tripId]);
}

/**
 * Subscribe to a Socket.IO event.
 * The callback is stable-ref'd so re-renders don't cause resubscription.
 */
export function useSocketEvent(event, callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const socket = getSocket();
    const handler = (...args) => cbRef.current(...args);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event]);
}
