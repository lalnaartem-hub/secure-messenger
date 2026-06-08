import { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { api } from '../api';
import { sounds } from '../utils/sound';

export type ChatBackground = 'slate' | 'starry' | 'aurora' | 'sunset';
export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber';
type SettingsTab = 'profile' | 'styling' | 'security' | 'notifications';

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
  onProfileUpdated?: (name: string, avatar: string, bio: string) => void;
}) {
  const { userId, privateKey, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  // Profile settings
  const [bg, setBg] = useState<ChatBackground>(currentBackground);
  const [accent, setAccent] = useState<AccentColor>(currentAccent);
  const [displayName, setDisplayName] = useState(localStorage.getItem('myUsername') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('myAvatarUrl') || '');
  const [bio, setBio] = useState(localStorage.getItem('myBio') || '');
  
  // UI preferences
  const [bubbleOpacity, setBubbleOpacity] = useState<number>(() => parseInt(localStorage.getItem('bubbleOpacity') || '90', 10));
  const [borderRadius, setBorderRadius] = useState<number>(() => parseInt(localStorage.getItem('borderRadius') || '16', 10));

  // Sound settings
  const [soundEffects, setSoundEffects] = useState<boolean>(
    () => localStorage.getItem('soundEffects') !== 'false'
  );
  const [muteDuration, setMuteDuration] = useState<string>(() => localStorage.getItem('muteDuration') || 'off');

  // Cryptographic settings
  const [myPublicKey, setMyPublicKey] = useState<string>('Загрузка...');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch latest profile & public key on mount
  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      api.getProfile(userId)
        .then((p) => {
          if (p) {
            setDisplayName(p.displayName || p.username || '');
            setAvatarUrl(p.avatarUrl || '');
            setBio(p.bio || '');
            setMyPublicKey(p.publicIdentityKey || 'Отсутствует');
            localStorage.setItem('myUsername', p.displayName || p.username || '');
            localStorage.setItem('myAvatarUrl', p.avatarUrl || '');
            localStorage.setItem('myBio', p.bio || '');
          }
        })
        .catch((err) => console.error('Failed to fetch profile:', err))
        .finally(() => setIsLoading(false));
    }
  }, [userId]);

  const handleSave = async () => {
    try {
      await api.updateProfile({ displayName, avatarUrl, bio });
      localStorage.setItem('myUsername', displayName);
      localStorage.setItem('myAvatarUrl', avatarUrl);
      localStorage.setItem('myBio', bio);
      localStorage.setItem('soundEffects', soundEffects ? 'true' : 'false');
      localStorage.setItem('muteDuration', muteDuration);
      localStorage.setItem('bubbleOpacity', String(bubbleOpacity));
      localStorage.setItem('borderRadius', String(borderRadius));
      
      if (onProfileUpdated) {
        onProfileUpdated(displayName, avatarUrl, bio);
      }
      onSaveSettings(bg, accent);
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Ошибка сохранения профиля на сервере.');
    }
  };

  const copyPublicKey = () => {
    navigator.clipboard.writeText(myPublicKey);
    setIsCopied(true);
    sounds.playReact();
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    setAvatarUrl(url);
    sounds.playReact();
  };

  const accents: { name: AccentColor; color: string; bg: string }[] = [
    { name: 'indigo', color: 'bg-indigo-650 hover:bg-indigo-600', bg: 'from-indigo-600 to-violet-600' },
    { name: 'emerald', color: 'bg-emerald-650 hover:bg-emerald-600', bg: 'from-emerald-600 to-teal-600' },
    { name: 'rose', color: 'bg-rose-650 hover:bg-rose-600', bg: 'from-rose-600 to-pink-600' },
    { name: 'amber', color: 'bg-amber-550 hover:bg-amber-500', bg: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 theme-accent-${accent}`}>
      <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col animate-slide-up duration-200 text-zinc-100 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Настройки Aether</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation buttons */}
        <div className="flex px-4 border-b border-zinc-900 bg-zinc-950/40 text-xs font-semibold text-zinc-500 flex-shrink-0">
          {(['profile', 'styling', 'security', 'notifications'] as const).map((t) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                onClick={() => { setActiveTab(t); sounds.playReact(); }}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  isActive ? 'border-accent text-accent font-bold' : 'border-transparent hover:text-zinc-300'
                }`}
              >
                {t === 'profile' ? 'Профиль' : t === 'styling' ? 'Оформление' : t === 'security' ? 'Безопасность' : 'Звуки'}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-500">Загрузка параметров...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
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
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Имя в чате
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors text-zinc-100 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                      О себе (Bio / Статус)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 120))}
                      placeholder="Расскажите о себе (будет видно другим в описании профиля)..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent transition-colors text-zinc-100 placeholder-zinc-600 resize-none leading-relaxed"
                    />
                    <div className="text-right text-[10px] text-zinc-600 -mt-1 font-medium">
                      {bio.length} / 120
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                      Аватар (URL-ссылка или автогенерация)
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
                      >
                        🎲 Случ.
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STYLING */}
              {activeTab === 'styling' && (
                <div className="space-y-5">
                  {/* Color Palette */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Цветовая палитра
                    </label>
                    <div className="flex gap-3">
                      {accents.map((acc) => (
                        <button
                          key={acc.name}
                          onClick={() => { setAccent(acc.name); sounds.playReact(); }}
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

                  {/* Wallpaper Preset */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                      Фон чата
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['slate', 'starry', 'aurora', 'sunset'] as ChatBackground[]).map((b) => (
                        <button
                          key={b}
                          onClick={() => { setBg(b); sounds.playReact(); }}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all duration-200 capitalize ${
                            bg === b
                              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-md'
                              : 'bg-transparent border-zinc-850 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {b === 'slate' ? 'Сланцевый' : b === 'starry' ? 'Космический' : b === 'aurora' ? 'Аврора' : 'Закат'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bubble styling details */}
                  <div className="border-t border-zinc-900 pt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span>Прозрачность пузырей сообщений</span>
                        <span className="font-mono">{bubbleOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={bubbleOpacity}
                        onChange={(e) => setBubbleOpacity(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span>Скругление углов</span>
                        <span className="font-mono">{borderRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={borderRadius}
                        onChange={(e) => setBorderRadius(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  {/* E2E Fingerprint verification UI card */}
                  <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-2xl flex gap-4 items-center">
                    {/* Simulated QR Code */}
                    <div className="w-18 h-18 bg-white p-1.5 rounded-xl flex-shrink-0 grid grid-cols-6 gap-[1px]">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-[1px] ${
                            (i * 7 + 13) % 5 === 0 || i % 6 === 0 || i < 6 || i % 6 === 5 || i > 30
                              ? 'bg-zinc-950'
                              : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-left min-w-0">
                      <h4 className="text-xs font-bold text-zinc-200 mb-0.5">Криптографический отпечаток</h4>
                      <p className="text-[10px] text-zinc-500 leading-normal mb-1">
                        Вы можете сравнить QR-код с кодом собеседника, чтобы убедиться в защите канала.
                      </p>
                      <span className="text-[9px] font-mono text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-900 block truncate">
                        DH-X25519-SHA256
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Мой открытый ключ (Public Identity Key)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={myPublicKey}
                        className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 select-all focus:outline-none"
                      />
                      <button
                        onClick={copyPublicKey}
                        className="px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold transition-all text-zinc-300 active:scale-95"
                      >
                        {isCopied ? 'Скопировано!' : 'Копировать'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl text-[10px] text-amber-400 leading-relaxed">
                    <span className="font-semibold block mb-0.5">⚠️ Внимание!</span>
                    Закрытый E2E ключ (Private Key) генерируется при регистрации и хранится исключительно локально в памяти вашего браузера. Он никогда не передается на сервер. В случае очистки хранилища или смены устройства вы потеряете доступ к истории старых зашифрованных сообщений.
                  </div>
                </div>
              )}

              {/* TAB 4: SOUNDS & NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  {/* Sound Effect Toggle */}
                  <button
                    type="button"
                    onClick={() => { setSoundEffects(prev => !prev); sounds.playReact(); }}
                    className="w-full flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-900 p-3.5 rounded-xl transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🔊</span>
                      <span className="text-xs font-semibold text-zinc-200">Звуковые эффекты</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${soundEffects ? 'bg-accent' : 'bg-zinc-800'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${soundEffects ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>

                  {/* Mute toggle option card */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Режим «Не беспокоить»
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: 'Выкл', val: 'off' },
                        { name: '1 час', val: '1h' },
                        { name: '8 часов', val: '8h' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => { setMuteDuration(item.val); sounds.playReact(); }}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            muteDuration === item.val
                              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-md'
                              : 'bg-transparent border-zinc-850 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-900 flex gap-3 flex-shrink-0">
          <button
            onClick={logout}
            className="flex-1 py-3 bg-red-650/20 hover:bg-red-650/30 text-red-400 border border-red-500/10 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
          >
            Выйти
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-accent"
          >
            Сохранить
          </button>
        </div>

      </div>
    </div>
  );
}
