import { useState } from 'react';
import { useAuth } from '../store';
import { api } from '../api';

export type ChatBackground = 'slate' | 'starry' | 'aurora' | 'sunset';
export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber';

export function SettingsModal({
  onClose,
  currentBackground,
  currentAccent,
  onSaveSettings,
  onProfileUpdated,
}: {
  onClose: () => void;
  currentBackground: ChatBackground;
  currentAccent: AccentColor;
  onSaveSettings: (bg: ChatBackground, accent: AccentColor) => void;
  onProfileUpdated?: (name: string, avatar: string) => void;
}) {
  const { logout } = useAuth();
  const [bg, setBg] = useState<ChatBackground>(currentBackground);
  const [accent, setAccent] = useState<AccentColor>(currentAccent);
  const [displayName, setDisplayName] = useState(localStorage.getItem('myUsername') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('myAvatarUrl') || '');

  const handleSave = async () => {
    try {
      await api.updateProfile({ displayName, avatarUrl });
      localStorage.setItem('myUsername', displayName);
      localStorage.setItem('myAvatarUrl', avatarUrl);
      if (onProfileUpdated) {
        onProfileUpdated(displayName, avatarUrl);
      }
      onSaveSettings(bg, accent);
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Ошибка сохранения профиля на сервере.');
    }
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    setAvatarUrl(url);
  };

  const accents: { name: AccentColor; color: string; bg: string }[] = [
    { name: 'indigo', color: 'bg-indigo-600', bg: 'from-indigo-600 to-violet-600' },
    { name: 'emerald', color: 'bg-emerald-600', bg: 'from-emerald-600 to-teal-600' },
    { name: 'rose', color: 'bg-rose-600', bg: 'from-rose-600 to-pink-600' },
    { name: 'amber', color: 'bg-amber-600', bg: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 theme-accent-${accent}`}>
      <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col animate-slide-up duration-200 text-zinc-100">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight">Настройки аккаунта</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-2xl object-cover border border-zinc-800 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-accent-gradient text-white flex items-center justify-center font-bold text-xl shadow-accent">
                  {(displayName || 'ME').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Имя пользователя
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Ссылка на аватарку
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors text-zinc-100 placeholder-zinc-600"
              />
              <button
                type="button"
                onClick={generateRandomAvatar}
                className="px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold transition-colors text-zinc-300 transform active:scale-95"
                title="Сгенерировать случайный аватар"
              >
                🎲 Случ.
              </button>
            </div>
          </div>
        </div>

        {/* Accent Color Customization */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
            Цветовая тема
          </label>
          <div className="flex gap-3">
            {accents.map((acc) => (
              <button
                key={acc.name}
                onClick={() => setAccent(acc.name)}
                className={`w-10 h-10 rounded-xl ${acc.color} transition-all duration-300 transform active:scale-90 flex items-center justify-center shadow-lg relative ${
                  accent === acc.name ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950 scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {accent === acc.name && (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Background Choice */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
            Фон чата
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['slate', 'starry', 'aurora', 'sunset'] as ChatBackground[]).map((b) => (
              <button
                key={b}
                onClick={() => setBg(b)}
                className={`py-3 rounded-xl border text-sm font-semibold transition-all duration-200 capitalize ${
                  bg === b
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-md shadow-black/30'
                    : 'bg-transparent border-zinc-850 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {b === 'slate' ? 'Сланцевый' : b === 'starry' ? 'Космический' : b === 'aurora' ? 'Аврора' : 'Закат'}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={logout}
            className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/10 font-semibold rounded-xl text-sm transition-all duration-200 active:scale-[0.98]"
          >
            Выйти
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-accent"
          >
            Сохранить
          </button>
        </div>

      </div>
    </div>
  );
}
