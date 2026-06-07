import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function ChatList({
  activeChatId,
  onSelect,
}: {
  activeChatId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: api.listChats,
  });

  if (isLoading) return <div className="p-4 text-slate-400">Загрузка…</div>;

  return (
    <ul>
      {chats.map((c: any) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
              activeChatId === c.id ? 'bg-slate-100' : ''
            }`}
          >
            <div className="font-medium">{c.title ?? '(прямой чат)'}</div>
            <div className="text-xs text-slate-400 uppercase">{c.type}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
