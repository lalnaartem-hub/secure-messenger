import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth, useUi } from './store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

/**
 * Custom hook owning the single Socket.IO connection.
 * JWT is sent in the handshake auth payload (validated server-side on connect).
 */
export function useSocket(
  onMessage: (m: any) => void,
  onReaction?: (data: { chatId: string; messageId: string; reactions: Record<string, string[]> }) => void,
  onEdit?: (m: any) => void,
  onDelete?: (data: { chatId: string; messageId: string }) => void,
) {
  const token = useAuth((s) => s.accessToken);
  const setTyping = useUi((s) => s.setTyping);
  const setOnline = useUi((s) => s.setOnline);
  const ref = useRef<Socket | null>(null);

  // Keep a mutable ref of the latest callbacks to avoid stale closures
  const callbacksRef = useRef({ onMessage, onReaction, onEdit, onDelete });
  
  useEffect(() => {
    callbacksRef.current = { onMessage, onReaction, onEdit, onDelete };
  }, [onMessage, onReaction, onEdit, onDelete]);

  useEffect(() => {
    if (!token) return;
    const socket = io(BACKEND_URL, { auth: { token }, transports: ['websocket'] });
    ref.current = socket;

    socket.on('message:new', (m) => {
      callbacksRef.current.onMessage(m);
    });

    socket.on('message:reaction', (data) => {
      callbacksRef.current.onReaction?.(data);
    });

    socket.on('message:edit', (m) => {
      callbacksRef.current.onEdit?.(m);
    });

    socket.on('message:delete', (data) => {
      callbacksRef.current.onDelete?.(data);
    });
    
    socket.on('typing', ({ chatId, userId }) => setTyping(chatId, userId));
    socket.on('presence:update', ({ userId, online }) => setOnline(userId, online));

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
