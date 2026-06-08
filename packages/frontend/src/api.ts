import { useAuth } from './store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

async function req(path: string, init: RequestInit = {}) {
  const token = useAuth.getState().accessToken;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  phoneAuth: (phone: string, code: string) =>
    req('/auth/phone', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  updateProfile: (body: { displayName?: string; avatarUrl?: string; bio?: string }) =>
    req('/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  getProfile: (id: string) => req(`/users/${id}`),
  listChats: () => req('/chats'),
  createChat: (body: { type: string; title?: string; memberIds: string[] }) =>
    req('/chats', { method: 'POST', body: JSON.stringify(body) }),
  listUsers: () => req('/users'),
  history: (chatId: string, cursor?: { beforeAt: string; beforeId: string }) => {
    const q = cursor ? `?beforeAt=${cursor.beforeAt}&beforeId=${cursor.beforeId}` : '';
    return req(`/chats/${chatId}/messages${q}`);
  },
  keyBundle: (peerId: string) => req(`/crypto/bundle/${peerId}`),
  publishIdentityKey: (publicIdentityKey: string) =>
    req('/crypto/identity-key', { method: 'POST', body: JSON.stringify({ publicIdentityKey }) }),
};
