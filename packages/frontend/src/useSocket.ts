import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth, useUi } from './store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

/**
 * Custom hook owning the single Socket.IO connection.
 * JWT is sent in the handshake auth payload (validated server-side on connect).
 */
export function useSocket(onMessage: (m: any) => void) {
  const token = useAuth((s) => s.accessToken);
  const setTyping = useUi((s) => s.setTyping);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(BACKEND_URL, { auth: { token }, transports: ['websocket'] });
    ref.current = socket;

    socket.on('message:new', onMessage);
    socket.on('typing', ({ chatId, userId }) => setTyping(chatId, userId));

    // heartbeat keeps presence TTL alive
    const hb = setInterval(() => socket.emit('heartbeat'), 15_000);

    return () => {
      clearInterval(hb);
      socket.disconnect();
      ref.current = null;
    };
  }, [token]);

  return ref;
}
