import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { encryptFor, decryptFrom } from '@msg/shared';
import { api } from '../api';
import { useAuth, useUi } from '../store';
import { useSocket } from '../useSocket';

interface LocalMsg {
  id: string;
  clientMsgId: string;
  senderId: string;
  text: string;             // decrypted
  status: 'pending' | 'sent' | 'read';
  createdAt: string;
}

export function ChatWindow({ chatId }: { chatId: string }) {
  const { userId, privateKey } = useAuth();
  const onlineUsers = useUi((s) => s.onlineUsers);
  const typingByChat = useUi((s) => s.typingByChat);

  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [peerKeyStatus, setPeerKeyStatus] = useState<'loading' | 'active' | 'missing'>('loading');
  const peerPubKey = useRef<string | null>(null);
  const decryptedIds = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Retrieve chat list from react-query cache to find participant details
  const { data: chats = [] } = useQuery<any[]>({
    queryKey: ['chats'],
  });

  const chat = chats.find((c: any) => c.id === chatId);
  const peer = chat?.type === 'direct'
    ? chat.participants.find((p: any) => p.id !== userId)
    : null;
  const isPeerOnline = peer ? onlineUsers.has(peer.id) : false;

  // Retrieve typing status for this specific chat
  const typingUsers = typingByChat[chatId];
  const isPeerTyping = typingUsers && typingUsers.size > 0;

  // 1. Reset state on chat change & fetch peer key bundle
  useEffect(() => {
    setMessages([]);
    decryptedIds.current = new Set();
    peerPubKey.current = null;
    setPeerKeyStatus('loading');

    if (!peer) {
      setPeerKeyStatus('missing'); // Group chats or no peer
      return;
    }

    // Load peer key bundle from backend
    api.keyBundle(peer.id)
      .then((bundle) => {
        if (bundle.identityKey) {
          peerPubKey.current = bundle.identityKey;
          setPeerKeyStatus('active');
        } else {
          setPeerKeyStatus('missing');
        }
      })
      .catch((e) => {
        console.error('Error loading peer key bundle:', e);
        setPeerKeyStatus('missing');
      });
  }, [chatId, peer]);

  // 2. Incoming real-time message handler
  const socketRef = useSocket(async (m) => {
    if (m.chatId !== chatId) return;
    
    // Skip if we already rendered this message through cache
    if (decryptedIds.current.has(m.id)) return;

    let text = '🔒 Сообщение зашифровано';
    try {
      text = privateKey
        ? await decryptFrom(privateKey, m.ciphertext, m.cryptoEnvelope)
        : '🔒';
    } catch (e) {
      console.error('Failed to decrypt real-time message:', e);
    }

    const next: LocalMsg = {
      id: m.id,
      clientMsgId: m.clientMsgId,
      senderId: m.senderId,
      text,
      status: 'sent',
      createdAt: m.createdAt,
    };

    setMessages((prev) => {
      // Reconcile optimistic update
      const idx = prev.findIndex((x) => x.clientMsgId === m.clientMsgId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });

    decryptedIds.current.add(m.id);
    scrollToBottom();
  });

  // 3. Keyset pagination for infinite scrolling history
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['history', chatId],
    queryFn: ({ pageParam }) => api.history(chatId, pageParam as any),
    initialPageParam: undefined,
    getNextPageParam: (last: any[]) =>
      last.length
        ? { beforeAt: last[last.length - 1].createdAt, beforeId: last[last.length - 1].id }
        : undefined,
  });

  // 4. Asynchronously decrypt loaded history pages
  useEffect(() => {
    if (!data || !privateKey) return;

    (async () => {
      const allHistRaw = data.pages.flat();
      const decryptedHist: LocalMsg[] = [];

      for (const m of allHistRaw) {
        if (decryptedIds.current.has(m.id)) continue;

        let text = '🔒 Сообщение зашифровано';
        try {
          text = await decryptFrom(privateKey, m.ciphertext, m.cryptoEnvelope);
        } catch (e) {
          console.error('Decryption failed for historical message:', m.id, e);
        }

        decryptedHist.push({
          id: m.id,
          clientMsgId: m.clientMsgId,
          senderId: m.senderId,
          text,
          status: 'sent',
          createdAt: m.createdAt,
        });
        decryptedIds.current.add(m.id);
      }

      if (decryptedHist.length > 0) {
        setMessages((prev) => {
          // Prepend history, keep real-time messages at the end
          const merged = [...decryptedHist, ...prev];
          // Sort by creation time (ascending) to render chronologically
          return merged.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    })();
  }, [data, privateKey]);

  // 5. Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [chatId]);

  // 6. Send message
  async function send() {
    if (!draft.trim()) return;
    if (peerKeyStatus === 'missing' || !peerPubKey.current) {
      alert('Невозможно отправить E2E сообщение: у собеседника отсутствуют ключи шифрования.');
      return;
    }

    const clientMsgId = uuidv4();
    const currentDraft = draft;
    setDraft('');

    // Prepend optimistic message
    const optimisticMsg: LocalMsg = {
      id: clientMsgId,
      clientMsgId,
      senderId: userId!,
      text: currentDraft,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const { ciphertext, envelope } = await encryptFor(peerPubKey.current, currentDraft);
      socketRef.current?.emit(
        'message:send',
        { chatId, clientMsgId, ciphertext, cryptoEnvelope: envelope },
        (ack: { id: string; clientMsgId: string; createdAt: string }) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.clientMsgId === ack.clientMsgId
                ? { ...x, id: ack.id, status: 'sent', createdAt: ack.createdAt }
                : x
            )
          );
          decryptedIds.current.add(ack.id);
        }
      );
    } catch (e) {
      console.error('Failed to encrypt/send message:', e);
      // Mark as error
      setMessages((prev) =>
        prev.map((x) => (x.clientMsgId === clientMsgId ? { ...x, status: 'pending' } : x))
      );
    }
  }

  function onType() {
    socketRef.current?.emit('typing', { chatId });
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0c0e]">
      {/* Active Chat Header */}
      <div className="h-16 border-b border-zinc-900/80 px-6 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
              {peer ? (peer.displayName || peer.username).slice(0, 2).toUpperCase() : '👤'}
            </div>
            {peer && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                  isPeerOnline ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
              />
            )}
          </div>
          <div>
            <div className="font-semibold text-zinc-100 text-sm">
              {peer ? (peer.displayName || peer.username) : 'Загрузка...'}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              {isPeerOnline ? (
                <span className="text-emerald-400 font-medium">В сети</span>
              ) : (
                <span>Не в сети</span>
              )}
            </div>
          </div>
        </div>

        {/* E2E Shield Info */}
        <div className="flex items-center gap-2">
          {peerKeyStatus === 'active' ? (
            <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              E2E Зашифровано
            </span>
          ) : peerKeyStatus === 'loading' ? (
            <span className="text-xs text-zinc-500">Проверка ключей...</span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-medium">
              🔑 Ключи отсутствуют
            </span>
          )}
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {/* Load older messages button */}
        {hasNextPage && (
          <div className="text-center py-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Загрузка...' : 'Загрузить более старые сообщения'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
            <svg className="w-12 h-12 text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="text-sm font-medium text-zinc-400">Нет сообщений</div>
            <div className="text-xs text-zinc-600 mt-1">Отправьте первое зашифрованное сообщение!</div>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === userId;
            return (
              <div
                key={m.clientMsgId || m.id}
                className={`flex flex-col max-w-[70%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-lg ${
                    isMe
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-indigo-600/10'
                      : 'bg-zinc-900 border border-zinc-800/80 text-zinc-100 rounded-tl-none shadow-black/20'
                  }`}
                >
                  <div>{m.text}</div>
                </div>
                
                {/* Time & Delivery Checkmark */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-zinc-600">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <span className="text-[10px]">
                      {m.status === 'pending' ? (
                        <span className="text-zinc-600 animate-spin">⏳</span>
                      ) : (
                        <span className="text-indigo-400 font-bold">✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator state */}
      {isPeerTyping && (
        <div className="px-6 py-1 text-xs text-indigo-400/80 italic flex items-center gap-1.5 animate-pulse bg-zinc-950/10">
          <div className="flex gap-0.5">
            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{peer ? peer.displayName || peer.username : 'Собеседник'} печатает...</span>
        </div>
      )}

      {/* Input Box Area */}
      <div className="p-4 border-t border-zinc-900/80 bg-zinc-950/20 backdrop-blur-md">
        <div className="flex gap-2 max-w-5xl mx-auto relative">
          <input
            value={draft}
            disabled={peerKeyStatus === 'missing'}
            onChange={(e) => {
              setDraft(e.target.value);
              onType();
            }}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={
              peerKeyStatus === 'missing'
                ? 'Диалог заблокирован: отсутствуют E2E ключи собеседника'
                : 'Сообщение (шифруется на устройстве)…'
            }
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || peerKeyStatus === 'missing'}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:transform-none flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            <span>Отправить</span>
            <svg className="w-4 h-4 transform rotate-45 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
