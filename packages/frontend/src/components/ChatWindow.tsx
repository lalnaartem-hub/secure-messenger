import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { encryptFor, decryptFrom } from '@msg/shared';
import { api } from '../api';
import { useAuth } from '../store';
import { useSocket } from '../useSocket';

interface LocalMsg {
  id: string;
  clientMsgId: string;
  senderId: string;
  text: string;             // decrypted, in-memory only
  status: 'pending' | 'sent' | 'read';
}

export function ChatWindow({ chatId }: { chatId: string }) {
  const { userId, privateKey } = useAuth();
  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState('');
  const peerPubKey = useRef<string | null>(null);

  // Incoming ciphertext -> decrypt locally -> render.
  const socketRef = useSocket(async (m) => {
    if (m.chatId !== chatId) return;
    const text = privateKey
      ? await decryptFrom(privateKey, m.ciphertext, m.cryptoEnvelope)
      : '🔒';
    setMessages((prev) => {
      // reconcile optimistic message by clientMsgId
      const idx = prev.findIndex((x) => x.clientMsgId === m.clientMsgId);
      const next: LocalMsg = {
        id: m.id,
        clientMsgId: m.clientMsgId,
        senderId: m.senderId,
        text,
        status: 'sent',
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
  });

  // Infinite scroll history (keyset pagination via TanStack Query).
  const { data } = useInfiniteQuery({
    queryKey: ['history', chatId],
    queryFn: ({ pageParam }) => api.history(chatId, pageParam as any),
    initialPageParam: undefined,
    getNextPageParam: (last: any[]) =>
      last.length
        ? { beforeAt: last[last.length - 1].createdAt, beforeId: last[last.length - 1].id }
        : undefined,
  });

  useEffect(() => {
    socketRef.current?.emit('chat:join', { chatId });
  }, [chatId]);

  async function send() {
    if (!draft.trim() || !peerPubKey.current) return;
    const clientMsgId = uuidv4();
    // Optimistic update: show instantly with hourglass status.
    setMessages((prev) => [
      ...prev,
      { id: clientMsgId, clientMsgId, senderId: userId!, text: draft, status: 'pending' },
    ]);
    const { ciphertext, envelope } = await encryptFor(peerPubKey.current, draft);
    setDraft('');
    socketRef.current?.emit(
      'message:send',
      { chatId, clientMsgId, ciphertext, cryptoEnvelope: envelope },
      (ack: { id: string; clientMsgId: string }) => {
        setMessages((prev) =>
          prev.map((x) =>
            x.clientMsgId === ack.clientMsgId ? { ...x, id: ack.id, status: 'sent' } : x,
          ),
        );
      },
    );
  }

  function onType() {
    socketRef.current?.emit('typing', { chatId });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
        {messages.map((m) => (
          <div
            key={m.clientMsgId}
            className={`max-w-md px-3 py-2 rounded-lg ${
              m.senderId === userId ? 'ml-auto bg-blue-600 text-white' : 'bg-white border'
            }`}
          >
            <div>{m.text}</div>
            {m.senderId === userId && (
              <div className="text-[10px] opacity-70 text-right">
                {m.status === 'pending' ? '⏳' : m.status === 'read' ? '✓✓' : '✓'}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onType();
          }}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Сообщение (шифруется на устройстве)…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={send} className="px-4 py-2 rounded bg-blue-600 text-white">
          Отправить
        </button>
      </div>
    </>
  );
}
