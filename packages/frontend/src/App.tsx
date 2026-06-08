import { useEffect, useState } from 'react';
import { useAuth } from './store';
import { ChatWindow } from './components/ChatWindow';
import { ChatList } from './components/ChatList';
import { generateIdentityKeyPair } from '@msg/shared';
import { api } from './api';
import { SettingsModal, ChatBackground, AccentColor } from './components/SettingsModal';
import { ParticleCanvas } from './components/ParticleCanvas';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

export function App() {
  const { accessToken, userId, setAuth, privateKey, setPrivateKey, logout } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(() => localStorage.getItem('myAvatarUrl'));
  
  // Settings & Theme states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeBackground, setThemeBackground] = useState<ChatBackground>(
    () => (localStorage.getItem('themeBackground') as ChatBackground) || 'slate'
  );
  const [themeAccent, setThemeAccent] = useState<AccentColor>(
    () => (localStorage.getItem('themeAccent') as AccentColor) || 'indigo'
  );

  // Phone Auth State
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [loginStep, setLoginStep] = useState<'phone' | 'sms'>('phone');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Timer countdown for resending SMS code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSaveSettings = (bg: ChatBackground, accent: AccentColor) => {
    setThemeBackground(bg);
    setThemeAccent(accent);
    localStorage.setItem('themeBackground', bg);
    localStorage.setItem('themeAccent', accent);

    const opacity = localStorage.getItem('bubbleOpacity') || '90';
    const radius = localStorage.getItem('borderRadius') || '16';
    document.documentElement.style.setProperty('--bubble-opacity', `${opacity}%`);
    document.documentElement.style.setProperty('--bubble-radius', `${radius}px`);
  };

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setPhoneError('Введите номер телефона');
      return;
    }
    setPhoneError(null);
    setLoginStep('sms');
    setCountdown(60);
  };

  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode.trim()) {
      setSmsError('Введите код подтверждения');
      return;
    }
    setSmsError(null);
    setIsLoadingPhone(true);
    try {
      const tokens = await api.phoneAuth(phone, smsCode);
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      setAuth({ accessToken: tokens.accessToken, userId: payload.sub });
      setMyUsername(payload.username || null);
      localStorage.setItem('myUsername', payload.username || '');
      const avatar = payload.avatarUrl || '';
      setMyAvatarUrl(avatar);
      localStorage.setItem('myAvatarUrl', avatar);
    } catch (err: any) {
      console.error('[PhoneAuth] Verification failed:', err);
      setSmsError('Неверный код. Попробуйте 1234');
    } finally {
      setIsLoadingPhone(false);
    }
  };

  // Capture OAuth tokens from the redirect fragment (#accessToken=...&refreshToken=...) and load custom properties.
  useEffect(() => {
    const opacity = localStorage.getItem('bubbleOpacity') || '90';
    const radius = localStorage.getItem('borderRadius') || '16';
    document.documentElement.style.setProperty('--bubble-opacity', `${opacity}%`);
    document.documentElement.style.setProperty('--bubble-radius', `${radius}px`);

    if (location.hash.includes('accessToken=')) {
      const params = new URLSearchParams(location.hash.slice(1));
      const token = params.get('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAuth({ accessToken: token, userId: payload.sub });
        setMyUsername(payload.username || null);
        localStorage.setItem('myUsername', payload.username || '');
        const avatar = payload.avatarUrl || '';
        setMyAvatarUrl(avatar);
        localStorage.setItem('myAvatarUrl', avatar);
        history.replaceState(null, '', location.pathname);
      }
    } else {
      const savedUser = localStorage.getItem('myUsername');
      if (savedUser) setMyUsername(savedUser);
      const savedAvatar = localStorage.getItem('myAvatarUrl');
      if (savedAvatar) setMyAvatarUrl(savedAvatar);
    }
  }, []);

  // Auto-generate and publish E2E identity keys on first login
  useEffect(() => {
    if (accessToken && !privateKey) {
      (async () => {
        try {
          const { publicKey, privateKey: privKey } = await generateIdentityKeyPair();
          await api.publishIdentityKey(publicKey);
          setPrivateKey(privKey);
          console.log('[E2E] Identity key pair generated and published.');
        } catch (e) {
          console.error('[E2E] Failed to generate/publish identity keys:', e);
        }
      })();
    }
  }, [accessToken, privateKey]);

  if (!accessToken) {
    return (
      <div className={`h-full flex flex-col items-center justify-center bg-[#070709] relative overflow-hidden select-none theme-accent-${themeAccent}`}>
        {/* Dynamic Abstract Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Login Glassmorphic Box */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-xl z-10 flex flex-col items-center animate-slide-up duration-500">
          
          {/* Animated Shield/Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-accent-gradient flex items-center justify-center shadow-accent mb-6 relative">
            <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>

          {/* Typography */}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 text-center mb-1">
            AETHER MESSENGER
          </h1>
          <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mb-6">
            Сквозное E2E Шифрование
          </p>

          {loginStep === 'phone' ? (
            <form onSubmit={handleSendSms} className="w-full flex flex-col animate-fade-in">
              <p className="text-sm text-zinc-400 text-center mb-6 leading-relaxed">
                Введите номер телефона для входа или регистрации в системе.
              </p>

              <div className="mb-4">
                <input
                  type="tel"
                  placeholder="+7 (999) 999-99-99"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent transition-colors"
                />
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{phoneError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-sm transition-all duration-300 transform active:scale-[0.98] shadow-accent flex items-center justify-center gap-2"
              >
                Продолжить
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySms} className="w-full flex flex-col animate-fade-in">
              <p className="text-sm text-zinc-400 text-center mb-2 leading-relaxed">
                Мы отправили код подтверждения на номер:
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="font-semibold text-sm text-zinc-200">{phone}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('phone');
                    setSmsCode('');
                    setSmsError(null);
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Изменить
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Код из SMS (например, 1234)"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  maxLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 text-center tracking-widest font-semibold focus:outline-none focus:border-accent transition-colors"
                />
                {smsError && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium text-center">{smsError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoadingPhone}
                className="w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-sm transition-all duration-300 transform active:scale-[0.98] shadow-accent flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingPhone ? 'Проверка...' : 'Подтвердить'}
              </button>

              <div className="text-center mt-4 text-xs text-zinc-500">
                {countdown > 0 ? (
                  <span>Отправить код повторно через {countdown}с</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown(60);
                      setSmsError(null);
                    }}
                    className="text-accent hover:underline font-medium"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="w-full flex items-center gap-3 my-6">
            <span className="h-[1px] bg-zinc-800/80 flex-1" />
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">или войти через</span>
            <span className="h-[1px] bg-zinc-800/80 flex-1" />
          </div>

          {/* OAuth Login Buttons */}
          <div className="w-full flex gap-3">
            <a
              href={`${BACKEND_URL}/auth/google`}
              className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold text-sm text-zinc-100 flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] hover:border-zinc-700"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </a>

            <a
              href={`${BACKEND_URL}/auth/github`}
              className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold text-sm text-zinc-100 flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] hover:border-zinc-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex bg-[#070709] select-none text-zinc-100 overflow-hidden theme-accent-${themeAccent}`}>
      {/* Sidebar Area */}
      <aside className="w-80 border-r border-zinc-900 flex flex-col h-full bg-zinc-950/40">
        <div className="flex-1 overflow-y-auto">
          <ChatList activeChatId={activeChatId} onSelect={setActiveChatId} />
        </div>

        {/* Current User Card at bottom */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              {myAvatarUrl ? (
                <img
                  src={myAvatarUrl}
                  alt="My Avatar"
                  className="w-9 h-9 rounded-xl object-cover border border-zinc-800"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-accent-gradient text-white flex items-center justify-center font-bold text-xs shadow-accent">
                  {myUsername ? myUsername.slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-100 text-xs truncate">
                {myUsername || 'Пользователь'}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                E2E запущен
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all duration-300"
              title="Настройки"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={logout}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all duration-300"
              title="Выйти из системы"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#0c0c0e]">
        {activeChatId ? (
          <ChatWindow chatId={activeChatId} themeBackground={themeBackground} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none relative">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-6 shadow-xl relative animate-bounce">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-lg font-bold text-zinc-100 mb-1.5 tracking-tight">
              Выберите или начните беседу
            </h2>
            <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed">
              Все ваши сообщения шифруются перед отправкой на сервер. Никто кроме вас и вашего собеседника не может их прочесть.
            </p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          currentBackground={themeBackground}
          currentAccent={themeAccent}
          onSaveSettings={handleSaveSettings}
          onProfileUpdated={(name, avatar) => {
            setMyUsername(name);
            setMyAvatarUrl(avatar);
          }}
        />
      )}
      <ParticleCanvas />
    </div>
  );
}
