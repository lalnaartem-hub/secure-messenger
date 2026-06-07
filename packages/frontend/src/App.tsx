import { useEffect, useState } from 'react';
import { useAuth } from './store';
import { ChatWindow } from './components/ChatWindow';
import { ChatList } from './components/ChatList';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export function App() {
  const { accessToken, setAuth } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Capture OAuth tokens from the redirect fragment (#accessToken=...&refreshToken=...).
  useEffect(() => {
    if (location.hash.includes('accessToken=')) {
      const params = new URLSearchParams(location.hash.slice(1));
      const accessToken = params.get('accessToken');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        setAuth({ accessToken, userId: payload.sub });
        history.replaceState(null, '', location.pathname);
      }
    }
  }, []);

  if (!accessToken) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
        <h1 className="text-2xl font-semibold">Secure Messenger</h1>
        <p className="text-slate-500">Сквозное шифрование · вход через OAuth</p>
        <div className="flex gap-3">
          <a className="px-4 py-2 rounded bg-slate-900 text-white" href={`${BACKEND_URL}/auth/google`}>
            Войти через Google
          </a>
          <a className="px-4 py-2 rounded bg-slate-700 text-white" href={`${BACKEND_URL}/auth/github`}>
            Войти через GitHub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <aside className="w-72 border-r bg-white overflow-y-auto">
        <ChatList activeChatId={activeChatId} onSelect={setActiveChatId} />
      </aside>
      <main className="flex-1 flex flex-col">
        {activeChatId ? (
          <ChatWindow chatId={activeChatId} />
        ) : (
          <div className="flex-1 grid place-items-center text-slate-400">Выберите чат</div>
        )}
      </main>
    </div>
  );
}
