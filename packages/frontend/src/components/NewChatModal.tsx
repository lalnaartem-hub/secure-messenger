import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export function NewChatModal({
  onClose,
  onChatCreated,
}: {
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: api.listUsers,
  });

  // Create chat mutation
  const createChatMutation = useMutation({
    mutationFn: (peerId: string) =>
      api.createChat({
        type: 'direct',
        memberIds: [peerId],
      }),
    onSuccess: (newChat) => {
      // Invalidate chats query to reload sidebar
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      onChatCreated(newChat.id);
      onClose();
    },
  });

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800/80 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-zinc-100">Новый диалог</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Поиск по имени или логину..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="absolute left-3 top-3.5 text-zinc-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2 pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-8 text-zinc-500">Загрузка пользователей...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">Пользователи не найдены</div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => !createChatMutation.isPending && createChatMutation.mutate(u.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/50 cursor-pointer transition-all duration-200"
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.username}
                    className="w-10 h-10 rounded-full border border-zinc-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                    {u.displayName ? u.displayName.slice(0, 2) : u.username.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-100 truncate">
                    {u.displayName || u.username}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">@{u.username}</div>
                </div>
                <div className="text-zinc-500">
                  {u.publicIdentityKey ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      E2E Ready
                    </span>
                  ) : (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      No key
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
