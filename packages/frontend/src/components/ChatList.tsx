import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth, useUi } from '../store';
import { NewChatModal } from './NewChatModal';
import { useSocket } from '../useSocket';
import { decryptFrom } from '@msg/shared';
import { sounds } from '../utils/sound';

type ChatFolder = 'all' | 'direct' | 'group';

export function ChatList({
  activeChatId,
  onSelect,
}: {
  activeChatId: string | null;
  onSelect: (id: string) => void;
}) {
  const currentUserId = useAuth((s) => s.userId);
  const privateKey = useAuth((s) => s.privateKey);
  const onlineUsers = useUi((s) => s.onlineUsers);
  const typingByChat = useUi((s) => s.typingByChat);
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolder] = useState<ChatFolder>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [decryptedSnippets, setDecryptedSnippets] = useState<Record<string, string>>({});

  const { data: chats = [], isLoading } = useQuery<any[]>({
    queryKey: ['chats'],
    queryFn: api.listChats,
    refetchInterval: 12000, // Polling fallback
  });

  // 1. Asynchronously decrypt last message ciphertext snippets on list load
  useEffect(() => {
    if (!chats.length || !privateKey) return;

    (async () => {
      const newSnippets = { ...decryptedSnippets };
      let updated = false;

      for (const c of chats) {
        if (newSnippets[c.id]) continue; // already decrypted
        if (c.last_message_content && c.last_message_envelope) {
          const peer = c.participants?.find((p: any) => p.id !== currentUserId);
          const peerPubKey = peer?.publicIdentityKey;
          if (peerPubKey) {
            try {
              const text = await decryptFrom(privateKey, peerPubKey, c.last_message_content, c.last_message_envelope);
              // Handle sticker format in snippet
              newSnippets[c.id] = text.startsWith('[sticker:') ? '🎨 Стикер' : text;
              updated = true;
            } catch (e) {
              console.error('[Sidebar] Failed to decrypt last message:', e);
            }
          }
        }
      }

      if (updated) {
        setDecryptedSnippets(newSnippets);
      }
    })();
  }, [chats, privateKey]);

  // 2. Listen to real-time incoming messages to instantly decrypt and update sidebar
  useSocket(
    async (m) => {
      // Play notification sound if message is from another user
      if (m.senderId !== currentUserId) {
        sounds.playReceive();
      }

      const targetChat = chats.find((c) => c.id === m.chatId);
      if (!targetChat) {
        // If chat isn't in our sidebar list, reload chat list
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        return;
      }

      const peer = targetChat.participants?.find((p: any) => p.id !== currentUserId);
      const peerPubKey = peer?.publicIdentityKey;

      let text = '🔒 Сообщение';
      if (privateKey && peerPubKey) {
        try {
          text = await decryptFrom(privateKey, peerPubKey, m.ciphertext, m.cryptoEnvelope);
          if (text.startsWith('[sticker:')) {
            text = '🎨 Стикер';
          }
        } catch (e) {
          console.error('[SidebarRealtime] Failed to decrypt:', e);
        }
      }

      setDecryptedSnippets((prev) => ({
        ...prev,
        [m.chatId]: text,
      }));

      // Invalidate query to trigger cache refresh and re-order chat lists
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    // onReaction
    (data) => {
      sounds.playReact();
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    // onEdit
    async (editedMsg) => {
      const targetChat = chats.find((c) => c.id === editedMsg.chatId);
      if (!targetChat) return;

      const peer = targetChat.participants?.find((p: any) => p.id !== currentUserId);
      const peerPubKey = peer?.publicIdentityKey;

      let text = '🔒 Сообщение';
      if (privateKey && peerPubKey) {
        try {
          text = await decryptFrom(privateKey, peerPubKey, editedMsg.ciphertext, editedMsg.cryptoEnvelope);
          if (text.startsWith('[sticker:')) {
            text = '🎨 Стикер';
          }
        } catch (e) {
          console.error('[SidebarRealtimeEdit] Failed to decrypt:', e);
        }
      }

      setDecryptedSnippets((prev) => ({
        ...prev,
        [editedMsg.chatId]: text,
      }));

      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    // onDelete
    (deleteData) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  );

  const getPeerInfo = (chat: any) => {
    if (chat.type !== 'direct' || !chat.participants) return null;
    return chat.participants.find((p: any) => p.id !== currentUserId) ?? null;
  };

  // Filter chats by search query AND active folder tab
  const filteredChats = chats.filter((chat) => {
    const peer = getPeerInfo(chat);
    const title = peer ? (peer.displayName || peer.username) : (chat.title ?? 'Групповой чат');
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFolder === 'direct') {
      return chat.type === 'direct';
    } else if (activeFolder === 'group') {
      return chat.type === 'group' || chat.type === 'channel';
    }
    return true; // 'all'
  });

  // Count helper for folder badges
  const getFolderCount = (folder: ChatFolder) => {
    if (folder === 'direct') {
      return chats.filter((c) => c.type === 'direct').length;
    } else if (folder === 'group') {
      return chats.filter((c) => c.type === 'group' || c.type === 'channel').length;
    }
    return chats.length;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 border-r border-zinc-900">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Telegram style paper plane SVG */}
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-accent/20">
            <svg className="w-4 h-4 text-white transform rotate-45 -translate-x-0.5 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-wide bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Aether
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-xl transition-all duration-300 transform active:scale-95"
          title="Новый диалог"
        >
          {/* Plus icon SVG */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Folders Tab Menu */}
      <div className="px-3 pt-2 border-b border-zinc-900/30 flex text-xs font-semibold text-zinc-400 relative">
        {(['all', 'direct', 'group'] as const).map((folder) => {
          const isActive = activeFolder === folder;
          const count = getFolderCount(folder);
          return (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`flex-1 py-2.5 text-center transition-all duration-300 border-b-2 relative ${
                isActive ? 'border-accent text-accent font-bold' : 'border-transparent hover:text-zinc-200'
              }`}
            >
              <span className="capitalize">
                {folder === 'all' ? 'Все' : folder === 'direct' ? 'Личные' : 'Группы'}
              </span>
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive ? 'bg-accent/20 text-accent' : 'bg-zinc-900 text-zinc-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-zinc-900/50">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/70 border border-zinc-850 rounded-xl py-2 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent transition-colors"
          />
          <div className="absolute left-3 top-2.5 text-zinc-500">
            {/* Search icon SVG */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-zinc-500">Загрузка...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs leading-relaxed">
            {searchQuery ? 'Ничего не найдено' : 'Нет чатов в этой категории'}
          </div>
        ) : (
          filteredChats.map((c: any) => {
            const peer = getPeerInfo(c);
            const title = peer ? (peer.displayName || peer.username) : (c.title ?? 'Групповой чат');
            const isPeerOnline = peer ? onlineUsers.has(peer.id) : false;
            
            // Check typing status
            const typingUsers = typingByChat[c.id];
            const isTyping = typingUsers && typingUsers.size > 0;

            const snippet = decryptedSnippets[c.id] || c.lastMessageText || (peer ? `🔒 E2E Шифрование` : `Групповой чат`);

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left border ${
                  activeChatId === c.id
                    ? 'bg-zinc-900 border-zinc-800 shadow-md shadow-black/30'
                    : 'bg-transparent border-transparent hover:bg-zinc-900/40 hover:border-zinc-900/50'
                }`}
              >
                {/* Avatar with Presence Indicator */}
                <div className="relative flex-shrink-0">
                  {peer?.avatarUrl ? (
                    <img
                      src={peer.avatarUrl}
                      alt={title}
                      className="w-11 h-11 rounded-xl object-cover border border-zinc-800"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-accent-gradient text-white flex items-center justify-center font-bold text-base shadow-inner animate-in fade-in duration-300">
                      {title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {peer && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
                        isPeerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                  )}
                </div>

                {/* Chat Metadata & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-zinc-100 truncate text-[14px]">
                      {title}
                    </span>
                    {c.last_message_at && (
                      <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                        {new Date(c.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Typing Indicator / Subtitle */}
                  {isTyping ? (
                    <div className="text-xs text-accent font-medium animate-pulse flex items-center gap-1.5">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>печатает...</span>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 truncate font-normal">
                      {snippet}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Active Modal */}
      {isModalOpen && (
        <NewChatModal
          onClose={() => setIsModalOpen(false)}
          onChatCreated={(chatId) => onSelect(chatId)}
        />
      )}
    </div>
  );
}
