import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  // E2E private key lives ONLY in memory / secure storage, never sent to server.
  privateKey: string | null;
  setAuth: (t: { accessToken: string; userId: string }) => void;
  setPrivateKey: (k: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('accessToken'),
  userId: localStorage.getItem('userId'),
  privateKey: localStorage.getItem('privateKey'),
  setAuth: ({ accessToken, userId }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('userId', userId);
    set({ accessToken, userId });
  },
  setPrivateKey: (privateKey) => {
    localStorage.setItem('privateKey', privateKey);
    set({ privateKey });
  },
  logout: () => {
    localStorage.clear();
    set({ accessToken: null, userId: null, privateKey: null });
  },
}));

interface UiState {
  activeChatId: string | null;
  typingByChat: Record<string, Set<string>>;
  onlineUsers: Set<string>;
  setActiveChat: (id: string) => void;
  setTyping: (chatId: string, userId: string) => void;
  setOnline: (userId: string, online: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  activeChatId: null,
  typingByChat: {},
  onlineUsers: new Set(),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  setTyping: (chatId, userId) =>
    set((s) => {
      const next = { ...s.typingByChat };
      const set2 = new Set(next[chatId] ?? []);
      set2.add(userId);
      next[chatId] = set2;
      // auto-clear after 5s (mirrors server TTL)
      setTimeout(() => {
        set((state) => {
          const currentTyping = { ...state.typingByChat };
          const set3 = new Set(currentTyping[chatId] ?? []);
          set3.delete(userId);
          currentTyping[chatId] = set3;
          return { typingByChat: currentTyping };
        });
      }, 5000);
      return { typingByChat: next };
    }),
  setOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      if (online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { onlineUsers: next };
    }),
}));
