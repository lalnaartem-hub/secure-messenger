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
  editedAt?: string;
  reactions?: Record<string, string[]>;
}

export function ChatWindow({ chatId, themeBackground }: { chatId: string; themeBackground: string }) {
  const { userId, privateKey } = useAuth();
  const onlineUsers = useUi((s) => s.onlineUsers);
  const typingByChat = useUi((s) => s.typingByChat);

  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [peerKeyStatus, setPeerKeyStatus] = useState<'loading' | 'active' | 'missing'>('loading');
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);

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
    setEditingMessage(null);
    setDraft('');

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
  const socketRef = useSocket(
    async (m) => {
      if (m.chatId !== chatId) return;
      
      // Skip if we already rendered this message through cache
      if (decryptedIds.current.has(m.id)) return;

      let text = '🔒 Сообщение зашифровано';
      try {
        text = privateKey && peerPubKey.current
          ? await decryptFrom(privateKey, peerPubKey.current, m.ciphertext, m.cryptoEnvelope)
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
        editedAt: m.editedAt,
        reactions: m.reactions,
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
    },
    // onReaction
    (data) => {
      if (data.chatId !== chatId) return;
      setMessages((prev) =>
        prev.map((x) => (x.id === data.messageId ? { ...x, reactions: data.reactions } : x))
      );
    },
    // onEdit
    async (editedMsg) => {
      if (editedMsg.chatId !== chatId) return;
      let text = '🔒 Сообщение зашифровано';
      try {
        text = privateKey && peerPubKey.current
          ? await decryptFrom(privateKey, peerPubKey.current, editedMsg.ciphertext, editedMsg.cryptoEnvelope)
          : '🔒';
      } catch (e) {
        console.error('Failed to decrypt edited message:', e);
      }
      setMessages((prev) =>
        prev.map((x) =>
          x.id === editedMsg.id
            ? { ...x, text, editedAt: editedMsg.editedAt, reactions: editedMsg.reactions }
            : x
        )
      );
    },
    // onDelete
    (data) => {
      if (data.chatId !== chatId) return;
      setMessages((prev) => prev.filter((x) => x.id !== data.messageId));
    }
  );

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

  // 4. Asynchronously decrypt loaded history pages (triggers when keys become active)
  useEffect(() => {
    if (!data || !privateKey || peerKeyStatus !== 'active' || !peerPubKey.current) return;

    (async () => {
      const allHistRaw = data.pages.flat();
      const decryptedHist: LocalMsg[] = [];

      for (const m of allHistRaw) {
        if (decryptedIds.current.has(m.id)) continue;

        let text = '🔒 Сообщение зашифровано';
        try {
          text = await decryptFrom(privateKey, peerPubKey.current, m.ciphertext, m.cryptoEnvelope);
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
          editedAt: m.editedAt,
          reactions: m.reactions,
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
  }, [data, privateKey, peerKeyStatus]);

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

  // 6. Send / Edit message
  async function send() {
    if (!draft.trim()) return;
    if (peerKeyStatus === 'missing' || !peerPubKey.current) {
      alert('Невозможно отправить E2E сообщение: у собеседника отсутствуют ключи шифрования.');
      return;
    }

    const currentDraft = draft;
    setDraft('');

    if (editingMessage) {
      const targetId = editingMessage.id;
      setEditingMessage(null);
      try {
        const { ciphertext, envelope } = await encryptFor(peerPubKey.current, currentDraft, privateKey!);
        socketRef.current?.emit('message:edit', {
          chatId,
          messageId: targetId,
          ciphertext,
          cryptoEnvelope: envelope,
        });
      } catch (e) {
        console.error('Failed to encrypt/edit message:', e);
      }
      return;
    }

    const clientMsgId = uuidv4();
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
      const { ciphertext, envelope } = await encryptFor(peerPubKey.current, currentDraft, privateKey!);
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

  function toggleReaction(messageId: string, reaction: string) {
    socketRef.current?.emit('message:react', {
      chatId,
      messageId,
      reaction,
    });
  }

  function deleteMsg(messageId: string) {
    if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
      socketRef.current?.emit('message:delete', {
        chatId,
        messageId,
      });
    }
  }

  function startEdit(m: LocalMsg) {
    setEditingMessage({ id: m.id, text: m.text });
    setDraft(m.text);
  }

  function cancelEdit() {
    setEditingMessage(null);
    setDraft('');
  }

  function onType() {
    socketRef.current?.emit('typing', { chatId });
  }

  return (
    <div className={`flex-1 flex flex-col h-full theme-bg-${themeBackground} animate-chat-fade`}>
      {/* Active Chat Header */}
      <div className="h-16 border-b border-zinc-900/85 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-accent-gradient text-white flex items-center justify-center font-bold text-sm shadow-accent/10">
              {peer ? (peer.displayName || peer.username).slice(0, 2).toUpperCase() : '👤'}
            </div>
            {peer && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                  isPeerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar z-0">
        {/* Load older messages button */}
        {hasNextPage && (
          <div className="text-center py-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-accent hover:text-accent/90 font-semibold bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-xl transition-all duration-300 disabled:opacity-50"
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
            const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

            return (
              <div
                key={m.clientMsgId || m.id}
                className={`flex w-full group relative items-end ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Editing / Deleting tools (My messages only) */}
                {isMe && m.status !== 'pending' && (
                  <div className="hidden group-hover:flex items-center gap-1 mr-2 self-center transition-all duration-200">
                    <button
                      onClick={() => startEdit(m)}
                      className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                      title="Редактировать"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteMsg(m.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-all duration-200"
                      title="Удалить"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Main Message Bubble Layout */}
                <div className="relative flex flex-col max-w-[70%]">
                  {/* Floating Reaction Emojis list on hover */}
                  {m.status !== 'pending' && (
                    <div className={`absolute bottom-full mb-1.5 flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-full p-0.5 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-20 scale-90 group-hover:scale-100 origin-bottom ${isMe ? 'right-0' : 'left-0'}`}>
                      {['👍', '❤️', '🔥', '😂', '😮', '😢'].map((emoji) => {
                        const hasReacted = m.reactions?.[emoji]?.includes(userId!);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-all duration-150 hover:scale-125 ${
                              hasReacted ? 'bg-accent/20 hover:bg-accent/30' : 'hover:bg-zinc-800'
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bubble content */}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-lg animate-message-pop ${
                      isMe
                        ? 'bg-accent-gradient text-white rounded-tr-none message-bubble-me'
                        : 'bg-zinc-900/90 backdrop-blur-sm border border-zinc-800/60 text-zinc-100 rounded-tl-none message-bubble-peer'
                    }`}
                  >
                    <div>{m.text}</div>

                    {/* Reactions Pill Display */}
                    {hasReactions && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-white/10">
                        {Object.entries(m.reactions!).map(([emoji, userIds]) => {
                          if (!userIds || userIds.length === 0) return null;
                          const hasReacted = userIds.includes(userId!);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(m.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all duration-250 ${
                                hasReacted
                                  ? 'bg-white/20 border-white/30 text-white'
                                  : 'bg-zinc-850/60 border-zinc-750/50 text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-semibold">{userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Time & Delivery Checkmark */}
                  <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {m.editedAt && (
                      <span className="text-[9px] text-zinc-500 font-normal ml-0.5">(ред.)</span>
                    )}
                    {isMe && (
                      <span className="text-[10px]">
                        {m.status === 'pending' ? (
                          <span className="text-zinc-600 animate-spin">⏳</span>
                        ) : (
                          <span className="text-accent font-bold">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Deleting/Editing tools (Peer messages - Delete only) */}
                {!isMe && m.status !== 'pending' && (
                  <div className="hidden group-hover:flex items-center gap-1 ml-2 self-center transition-all duration-200">
                    <button
                      onClick={() => deleteMsg(m.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-all duration-200"
                      title="Удалить"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator state */}
      {isPeerTyping && (
        <div className="px-6 py-1.5 text-xs text-accent italic flex items-center gap-1.5 animate-pulse bg-zinc-955/20 backdrop-blur-sm z-10">
          <div className="flex gap-0.5">
            <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{peer ? peer.displayName || peer.username : 'Собеседник'} печатает...</span>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div className="px-6 py-2 bg-zinc-900/90 border-t border-zinc-800/60 flex items-center justify-between animate-slide-up z-15">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div className="text-xs min-w-0">
              <div className="font-semibold text-accent">Редактирование сообщения</div>
              <div className="text-zinc-400 truncate max-w-lg">{editingMessage.text}</div>
            </div>
          </div>
          <button
            onClick={cancelEdit}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Box Area */}
      <div className="p-4 border-t border-zinc-900/80 bg-zinc-950/40 backdrop-blur-md z-10">
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
                : editingMessage
                ? 'Редактировать сообщение…'
                : 'Сообщение (шифруется на устройстве)…'
            }
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent disabled:opacity-50 transition-colors"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || peerKeyStatus === 'missing'}
            className="px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:transform-none flex items-center justify-center gap-1.5 shadow-accent hover:shadow-accent/40"
          >
            <span>{editingMessage ? 'Сохранить' : 'Отправить'}</span>
            <svg className="w-4 h-4 transform rotate-45 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
