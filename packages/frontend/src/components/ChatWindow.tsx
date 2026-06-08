import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { encryptFor, decryptFrom } from '@msg/shared';
import { api } from '../api';
import { useAuth, useUi } from '../store';
import { useSocket } from '../useSocket';
import { parseMarkdown } from '../utils/markdown';
import { sounds } from '../utils/sound';
import { StickerSvg, STICKER_LIST, StickerName } from './StickerSvg';
import { launchParticles } from './ParticleCanvas';
import { BotCalculator, BotCryptoChart, BotQuiz, BotWeather } from './BotWidgets';

interface LocalMsg {
  id: string;
  clientMsgId: string;
  senderId: string;
  ciphertext?: string;
  cryptoEnvelope?: any;
  text: string;             // decrypted
  status: 'pending' | 'sent' | 'read';
  createdAt: string;
  editedAt?: string;
  reactions?: Record<string, string[]>;
  replyToId?: string;
}

// ==========================================
// INTERACTIVE WIDGETS
// ==========================================

function SlotsWidget() {
  const [reels, setReels] = useState(['🍒', '🍋', '🍇']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const emojis = ['🍒', '🍋', '🍇', '💎', '🔔', '7️⃣'];

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    sounds.playSend();

    let count = 0;
    const interval = setInterval(() => {
      setReels([
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
      ]);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setIsSpinning(false);
        
        const finalReels = [
          emojis[Math.floor(Math.random() * emojis.length)],
          emojis[Math.floor(Math.random() * emojis.length)],
          emojis[Math.floor(Math.random() * emojis.length)],
        ];
        setReels(finalReels);

        if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
          setResult('🎉 ПОБЕДА! 🎉');
          sounds.playReact();
          launchParticles('💰');
          launchParticles('⭐');
          launchParticles(finalReels[0]);
        } else {
          setResult('Попробуйте еще раз! 🥺');
        }
      }
    }, 70);
  };

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-60 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto">
      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">СЛОТ-МАШИНА AETHER</div>
      <div className="flex justify-center gap-3 mb-4 bg-zinc-900 border border-zinc-800/80 p-3 rounded-xl">
        {reels.map((emoji, i) => (
          <div key={i} className={`text-2xl w-12 h-12 flex items-center justify-center bg-zinc-950 border border-zinc-850 rounded-lg shadow-inner ${isSpinning ? 'animate-pulse scale-95' : ''}`}>
            {emoji}
          </div>
        ))}
      </div>
      <button
        onClick={spin}
        disabled={isSpinning}
        className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-accent transition-all active:scale-[0.97]"
      >
        {isSpinning ? 'Крутим...' : 'ИСПЫТАТЬ УДАЧУ'}
      </button>
      {result && <div className="mt-2.5 text-[11px] font-semibold text-zinc-200 animate-bounce">{result}</div>}
    </div>
  );
}

function DiceWidget() {
  const [value, setValue] = useState(6);
  const [isRolling, setIsRolling] = useState(false);

  const roll = () => {
    if (isRolling) return;
    setIsRolling(true);
    sounds.playSend();

    let count = 0;
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setIsRolling(false);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setValue(finalVal);
        launchParticles('🎲');
        if (finalVal === 6) {
          sounds.playReact();
          launchParticles('🎉');
          launchParticles('⭐');
        }
      }
    }, 60);
  };

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-48 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto">
      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">ИГРАЛЬНЫЙ КУБИК</div>
      <div className="flex justify-center mb-3">
        <button
          onClick={roll}
          disabled={isRolling}
          className={`text-4xl w-14 h-14 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-accent rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${isRolling ? 'animate-spin' : ''}`}
        >
          {value === 1 ? '⚀' : value === 2 ? '⚁' : value === 3 ? '⚂' : value === 4 ? '⚃' : value === 5 ? '⚄' : '⚅'}
        </button>
      </div>
      <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Нажмите, чтобы бросить</div>
    </div>
  );
}

function VoicePlayer({ duration }: { duration: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'1x' | '1.5x' | '2x'>('1x');
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const speedMult = speed === '1x' ? 1 : speed === '1.5x' ? 1.5 : 2;
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (0.1 / duration) * speedMult;
          if (next >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    sounds.playReact();
  };

  const toggleSpeed = () => {
    setSpeed((s) => (s === '1x' ? '1.5x' : s === '1.5x' ? '2x' : '1x'));
    sounds.playReact();
  };

  const bars = [12, 18, 8, 24, 15, 30, 20, 10, 25, 14, 28, 16, 8, 22, 18, 26, 12, 20, 15, 28, 8, 14, 18, 10];

  return (
    <div className="flex items-center gap-3 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-900 w-64 md:w-72 my-1 select-none">
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all flex-shrink-0 shadow-md shadow-accent/20"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-[2px] h-8 relative">
        {bars.map((h, i) => {
          const barProgress = i / bars.length;
          const isActive = progress > barProgress;
          return (
            <div
              key={i}
              className="w-[3px] rounded-full transition-colors duration-200"
              style={{
                height: `${h}px`,
                backgroundColor: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <button
          onClick={toggleSpeed}
          className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-400 hover:text-accent transition-colors"
        >
          {speed}
        </button>
        <span className="text-[9px] text-zinc-500 font-mono">
          {isPlaying
            ? `${Math.floor(progress * duration)}s`
            : `0:${duration < 10 ? '0' : ''}${duration}`}
        </span>
      </div>
    </div>
  );
}

function VoiceRecordWaveform() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'var(--accent-primary)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 4 + phase;
        const y = mid + Math.sin(angle) * 7 * Math.sin(phase * 0.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.12;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={120} height={30} className="w-28 h-6 pointer-events-none opacity-80" />;
}

// ==========================================
// SELF DESTRUCTING BUBBLE WITH SVG CIRCLE
// ==========================================

function SelfDestructingBubble({
  message,
  burnTime,
  onBurn,
  children,
}: {
  message: LocalMsg;
  burnTime: number;
  onBurn: () => void;
  children: React.ReactNode;
}) {
  const [timeLeft, setTimeLeft] = useState(burnTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message.status === 'pending') return;

    // Calculate actual elapsed seconds to handle history reloads correctly
    const elapsedMs = Date.now() - new Date(message.createdAt).getTime();
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const initialTimeLeft = Math.max(0, burnTime - elapsedSeconds);

    setTimeLeft(initialTimeLeft);

    if (initialTimeLeft <= 0) {
      onBurn();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onBurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [message.id, burnTime, message.createdAt, message.status]);

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / burnTime) * circumference;

  return (
    <div className="relative group/burn select-none">
      {children}
      {timeLeft > 0 && (
        <div 
          className="absolute -top-2 -right-2 bg-zinc-950/90 border border-red-500/20 text-red-400 rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-20"
          title={`Удалится через ${timeLeft} сек.`}
        >
          <svg className="w-6 h-6 transform -rotate-90">
            <circle
              cx="12"
              cy="12"
              r={radius}
              className="stroke-zinc-850"
              strokeWidth="2"
              fill="transparent"
            />
            <circle
              cx="12"
              cy="12"
              r={radius}
              className="stroke-red-500 transition-all duration-1000 ease-linear"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className="absolute text-[8px] font-bold font-mono text-zinc-200 leading-none">
            {timeLeft}
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// INTERACTIVE BOT COMMAND HELPER WIDGET
// ==========================================

function HelpWidget({ onSelectCommand }: { onSelectCommand: (cmd: string) => void }) {
  const commands = [
    { cmd: '/slots', desc: '🎰 Слоты', color: 'hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-400' },
    { cmd: '/dice', desc: '🎲 Кости', color: 'hover:bg-indigo-500/10 hover:border-indigo-500/30 text-indigo-400' },
    { cmd: '/calc', desc: '🧮 Калькулятор', color: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400' },
    { cmd: '/crypto', desc: '📈 Крипта', color: 'hover:bg-violet-500/10 hover:border-violet-500/30 text-violet-400' },
    { cmd: '/weather', desc: '☀️ Погода', color: 'hover:bg-sky-500/10 hover:border-sky-500/30 text-sky-400' },
    { cmd: '/quiz', desc: '🧠 Викторина', color: 'hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400' },
  ];

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-60 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100 animate-message-pop">
      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Команды AetherBot</div>
      <p className="text-[10px] text-zinc-400 mb-3 leading-normal">
        Нажмите на команду ниже, чтобы отправить её в чат и запустить интерактивный виджет:
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {commands.map(({ cmd, desc, color }) => (
          <button
            key={cmd}
            onClick={() => onSelectCommand(cmd)}
            className={`p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] font-semibold text-left transition-all active:scale-[0.97] flex flex-col gap-0.5 ${color}`}
          >
            <span>{desc}</span>
            <span className="text-[8px] text-zinc-500 font-mono font-normal">{cmd}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ChatWindow({ chatId, themeBackground }: { chatId: string; themeBackground: string }) {
  const { userId, privateKey } = useAuth();
  const onlineUsers = useUi((s) => s.onlineUsers);
  const typingByChat = useUi((s) => s.typingByChat);

  const [messages, setMessages] = useState<LocalMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [peerKeyStatus, setPeerKeyStatus] = useState<'loading' | 'active' | 'missing'>('loading');
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);

  // Search, stickers, panels & pins states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [replyingTo, setReplyingTo] = useState<LocalMsg | null>(null);
  const [pinnedMsg, setPinnedMsg] = useState<LocalMsg | null>(() => {
    const saved = localStorage.getItem(`pinned:${chatId}`);
    return saved ? JSON.parse(saved) : null;
  });

  // Simulated Voice Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Self-destruct secure message burn time
  const [burnTime, setBurnTime] = useState<number>(0);
  const [isBurnMenuOpen, setIsBurnMenuOpen] = useState(false);
  const burnMenuRef = useRef<HTMLDivElement>(null);

  const peerPubKey = useRef<string | null>(null);
  const decryptedIds = useRef<Set<string>>(new Set());
  const decryptionFailedIds = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stickerPanelRef = useRef<HTMLDivElement>(null);

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

  // Close popup panels when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stickerPanelRef.current && !stickerPanelRef.current.contains(event.target as Node)) {
        setIsStickerOpen(false);
      }
      if (burnMenuRef.current && !burnMenuRef.current.contains(event.target as Node)) {
        setIsBurnMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update voice note timer during recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Load pinned message from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`pinned:${chatId}`);
    setPinnedMsg(saved ? JSON.parse(saved) : null);
  }, [chatId]);

  // 1. Reset state on chat change & fetch peer key bundle
  useEffect(() => {
    setMessages([]);
    decryptedIds.current = new Set();
    decryptionFailedIds.current = new Set();
    peerPubKey.current = null;
    setPeerKeyStatus('loading');
    setEditingMessage(null);
    setDraft('');
    setSearchQuery('');
    setIsSearching(false);
    setIsStickerOpen(false);
    setIsInfoOpen(false);
    setReplyingTo(null);
    setIsRecording(false);
    setBurnTime(0);
    setIsBurnMenuOpen(false);

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
        
        // Launch particle bursts for special E2E decrypted emojis
        if (['🎉', '🔥', '❤️', '🚀', '⭐', '💰', '👍'].includes(text)) {
          launchParticles(text);
        }
      } catch (e) {
        console.error('Failed to decrypt real-time message:', e);
      }

      const next: LocalMsg = {
        id: m.id,
        clientMsgId: m.clientMsgId,
        senderId: m.senderId,
        ciphertext: m.ciphertext,
        cryptoEnvelope: m.cryptoEnvelope,
        text,
        status: 'sent',
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        reactions: m.reactions,
        replyToId: m.replyToId,
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
            ? {
                ...x,
                text,
                ciphertext: editedMsg.ciphertext,
                cryptoEnvelope: editedMsg.cryptoEnvelope,
                editedAt: editedMsg.editedAt,
                reactions: editedMsg.reactions,
              }
            : x
        )
      );
    },
    // onDelete
    (data) => {
      if (data.chatId !== chatId) return;
      setMessages((prev) => prev.filter((x) => x.id !== data.messageId));
      if (pinnedMsg && pinnedMsg.id === data.messageId) {
        unpinMessage();
      }
    },
    // onRead (mark all messages up to this read)
    (data) => {
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.id === data.messageId);
        if (idx === -1) return prev;
        return prev.map((x, i) => (i <= idx && x.senderId === userId ? { ...x, status: 'read' as const } : x));
      });
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
          decryptionFailedIds.current.add(m.id);
        }

        decryptedHist.push({
          id: m.id,
          clientMsgId: m.clientMsgId,
          senderId: m.senderId,
          ciphertext: m.ciphertext,
          cryptoEnvelope: m.cryptoEnvelope,
          text,
          status: 'sent',
          createdAt: m.createdAt,
          editedAt: m.editedAt,
          reactions: m.reactions,
          replyToId: m.replyToId,
        });
        decryptedIds.current.add(m.id);
      }

      if (decryptedHist.length > 0) {
        setMessages((prev) => {
          const merged = [...decryptedHist, ...prev];
          return merged.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    })();
  }, [data, privateKey, peerKeyStatus]);

  // 4.5 Post-activation decryption of messages that were received encrypted before keys were loaded
  useEffect(() => {
    if (peerKeyStatus !== 'active' || !peerPubKey.current || !privateKey) return;

    let changed = false;
    const promises = messages.map(async (m) => {
      if (m.ciphertext && m.cryptoEnvelope && m.text.startsWith('🔒') && !decryptionFailedIds.current.has(m.id)) {
        try {
          const decrypted = await decryptFrom(privateKey, peerPubKey.current!, m.ciphertext, m.cryptoEnvelope);
          changed = true;
          return { ...m, text: decrypted };
        } catch (e) {
          console.error('Failed to decrypt message in post-activation:', m.id, e);
          decryptionFailedIds.current.add(m.id);
        }
      }
      return m;
    });

    Promise.all(promises).then((nextMessages) => {
      if (changed) {
        setMessages(nextMessages);
      }
    });
  }, [peerKeyStatus, messages.length]);

  // 4.7 Send read receipts for incoming messages
  useEffect(() => {
    if (messages.length > 0 && socketRef.current && userId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== userId && lastMsg.status !== 'read') {
        socketRef.current.emit('message:read', {
          chatId,
          messageId: lastMsg.id,
        });
      }
    }
  }, [messages.length, chatId, socketRef.current, userId]);

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

  // Pin / Unpin methods
  const pinMessage = (m: LocalMsg) => {
    localStorage.setItem(`pinned:${chatId}`, JSON.stringify(m));
    setPinnedMsg(m);
    sounds.playReact();
  };

  const unpinMessage = () => {
    localStorage.removeItem(`pinned:${chatId}`);
    setPinnedMsg(null);
    sounds.playReact();
  };

  const scrollToPinned = () => {
    if (!pinnedMsg) return;
    const el = document.getElementById(`msg-${pinnedMsg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 1800);
    }
  };

  // 6. Send / Edit message helper
  async function sendText(textToSend: string, targetReplyToId?: string) {
    if (peerKeyStatus === 'missing' || !peerPubKey.current) {
      alert('Невозможно отправить E2E сообщение: у собеседника отсутствуют ключи шифрования.');
      return;
    }

    const clientMsgId = uuidv4();
    const optimisticMsg: LocalMsg = {
      id: clientMsgId,
      clientMsgId,
      senderId: userId!,
      text: textToSend,
      status: 'pending',
      createdAt: new Date().toISOString(),
      replyToId: targetReplyToId,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    sounds.playSend();

    // Check if we typed special particles trigger
    if (['🎉', '🔥', '❤️', '🚀', '⭐', '💰', '👍'].includes(textToSend)) {
      launchParticles(textToSend);
    }

    try {
      const { ciphertext, envelope } = await encryptFor(peerPubKey.current, textToSend, privateKey!);
      const envelopeWithBurn = { ...envelope, ...(burnTime > 0 ? { burnTime } : {}) };
      
      socketRef.current?.emit(
        'message:send',
        { chatId, clientMsgId, ciphertext, cryptoEnvelope: envelopeWithBurn, replyToId: targetReplyToId },
        (ack: { id: string; clientMsgId: string; createdAt: string }) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.clientMsgId === ack.clientMsgId
                ? { ...x, id: ack.id, status: 'sent', createdAt: ack.createdAt, cryptoEnvelope: envelopeWithBurn }
                : x
            )
          );
          decryptedIds.current.add(ack.id);
        }
      );
    } catch (e) {
      console.error('Failed to encrypt/send message:', e);
      setMessages((prev) =>
        prev.map((x) => (x.clientMsgId === clientMsgId ? { ...x, status: 'pending' } : x))
      );
    }
  }

  async function send() {
    if (!draft.trim()) return;

    const currentDraft = draft;
    const targetReplyToId = replyingTo?.id;
    
    setDraft('');
    setReplyingTo(null);

    if (editingMessage) {
      const targetId = editingMessage.id;
      setEditingMessage(null);
      try {
        const { ciphertext, envelope } = await encryptFor(peerPubKey.current!, currentDraft, privateKey!);
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

    await sendText(currentDraft, targetReplyToId);
  }

  // Send voice note
  async function sendVoiceNote(seconds: number) {
    if (peerKeyStatus === 'missing' || !peerPubKey.current) {
      alert('Невозможно отправить E2E голосовое сообщение.');
      return;
    }
    const voiceText = `[voice:${seconds}]`;
    const clientMsgId = uuidv4();
    const optimisticMsg: LocalMsg = {
      id: clientMsgId,
      clientMsgId,
      senderId: userId!,
      text: voiceText,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    sounds.playSend();

    try {
      const { ciphertext, envelope } = await encryptFor(peerPubKey.current, voiceText, privateKey!);
      const envelopeWithBurn = { ...envelope, ...(burnTime > 0 ? { burnTime } : {}) };
      
      socketRef.current?.emit(
        'message:send',
        { chatId, clientMsgId, ciphertext, cryptoEnvelope: envelopeWithBurn },
        (ack: { id: string; clientMsgId: string; createdAt: string }) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.clientMsgId === ack.clientMsgId
                ? { ...x, id: ack.id, status: 'sent', createdAt: ack.createdAt, cryptoEnvelope: envelopeWithBurn }
                : x
            )
          );
          decryptedIds.current.add(ack.id);
        }
      );
    } catch (e) {
      console.error('Failed to encrypt/send voice note:', e);
      setMessages((prev) =>
        prev.map((x) => (x.clientMsgId === clientMsgId ? { ...x, status: 'pending' } : x))
      );
    }
  }

  // Send an SVG sticker
  async function sendSticker(stickerName: StickerName) {
    if (peerKeyStatus === 'missing' || !peerPubKey.current) {
      alert('Невозможно отправить E2E стикер: у собеседника отсутствуют ключи.');
      return;
    }
    setIsStickerOpen(false);

    const stickerText = `[sticker:${stickerName}]`;
    const clientMsgId = uuidv4();
    const optimisticMsg: LocalMsg = {
      id: clientMsgId,
      clientMsgId,
      senderId: userId!,
      text: stickerText,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    sounds.playSend();

    try {
      const { ciphertext, envelope } = await encryptFor(peerPubKey.current, stickerText, privateKey!);
      const envelopeWithBurn = { ...envelope, ...(burnTime > 0 ? { burnTime } : {}) };
      
      socketRef.current?.emit(
        'message:send',
        { chatId, clientMsgId, ciphertext, cryptoEnvelope: envelopeWithBurn },
        (ack: { id: string; clientMsgId: string; createdAt: string }) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.clientMsgId === ack.clientMsgId
                ? { ...x, id: ack.id, status: 'sent', createdAt: ack.createdAt, cryptoEnvelope: envelopeWithBurn }
                : x
            )
          );
          decryptedIds.current.add(ack.id);
        }
      );
    } catch (e) {
      console.error('Failed to encrypt/send sticker:', e);
      setMessages((prev) =>
        prev.map((x) => (x.clientMsgId === clientMsgId ? { ...x, status: 'pending' } : x))
      );
    }
  }

  function toggleReaction(messageId: string, reaction: string) {
    sounds.playReact();
    launchParticles(reaction);
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

  // Filter messages based on search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery) return true;
    if (m.text.startsWith('[sticker:')) return false;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Extract shared media (stickers) for right info panel
  const sharedStickers = messages.filter((m) => m.text.startsWith('[sticker:'));

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full theme-bg-${themeBackground} animate-chat-fade relative`}>
        {/* Active Chat Header */}
        <div className="h-16 border-b border-zinc-900/85 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsInfoOpen((prev) => !prev)}>
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
              <div className="font-semibold text-zinc-100 text-sm hover:text-accent transition-colors">
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

          {/* Search & Option buttons */}
          <div className="flex items-center gap-2">
            {isSearching ? (
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 animate-slide-left">
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-32 md:w-48"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearching(false);
                  }}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors ml-1 p-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearching(true)}
                className="p-2 bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-150 rounded-xl transition-all"
                title="Поиск сообщений"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setIsInfoOpen((prev) => !prev)}
              className={`p-2 border rounded-xl transition-all ${
                isInfoOpen
                  ? 'bg-accent/10 border-accent/25 text-accent'
                  : 'bg-zinc-900/60 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-150'
              }`}
              title="Свойства чата"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {peerKeyStatus === 'active' ? (
              <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium select-none">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden sm:inline">E2E Secure</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full font-medium select-none animate-pulse">
                🔑 Ключи отсутствуют
              </span>
            )}
          </div>
        </div>

        {/* Pinned Message Banner */}
        {pinnedMsg && (
          <div className="h-11 border-b border-zinc-900/60 bg-zinc-950/60 backdrop-blur-md px-6 flex items-center justify-between z-10 animate-slide-up select-none">
            <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={scrollToPinned}>
              <span className="text-[10px]">📌</span>
              <div className="text-xs truncate min-w-0">
                <span className="font-semibold text-accent block text-[10px] uppercase tracking-wider">Закрепленное сообщение</span>
                <span className="text-zinc-400 truncate block text-[11px]">
                  {pinnedMsg.text.startsWith('[sticker:') ? '🎨 Стикер' : pinnedMsg.text.startsWith('[voice:') ? '🎤 Голосовое сообщение' : pinnedMsg.text}
                </span>
              </div>
            </div>
            <button
              onClick={unpinMessage}
              className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
              title="Открепить"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar z-0">
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

          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
              <svg className="w-12 h-12 text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="text-sm font-medium text-zinc-400">
                {searchQuery ? 'Сообщений не найдено' : 'Нет сообщений'}
              </div>
            </div>
          ) : (
            filteredMessages.map((m) => {
              const isMe = m.senderId === userId;
              const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;
              const isSticker = m.text.startsWith('[sticker:');
              let stickerName: StickerName | null = null;
              if (isSticker) {
                const match = m.text.match(/\[sticker:(\w+)\]/);
                if (match && STICKER_LIST.includes(match[1] as any)) {
                  stickerName = match[1] as StickerName;
                }
              }

              // Retrieve replied-to message details if applicable
              const repliedToMsg = m.replyToId ? messages.find((x) => x.id === m.replyToId) : null;
              const msgBurnTime = m.cryptoEnvelope?.burnTime;

              const bubbleContent = (
                <div className="relative flex flex-col max-w-[75%]">
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
                  {isSticker && stickerName ? (
                    <div className="relative p-1 animate-message-pop transform hover:scale-105 active:scale-95 duration-300 flex flex-col items-center">
                      <StickerSvg name={stickerName} size={110} />
                      {hasReactions && (
                        <div className="flex flex-wrap gap-1.5 mt-2 bg-zinc-950/70 border border-zinc-900 p-1.5 rounded-full w-fit">
                          {Object.entries(m.reactions!).map(([emoji, userIds]) => {
                            if (!userIds || userIds.length === 0) return null;
                            const hasReacted = userIds.includes(userId!);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(m.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all duration-250 ${
                                  hasReacted
                                    ? 'bg-accent border-accent text-white'
                                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
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
                  ) : (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-lg animate-message-pop relative group/bubble ${
                        isMe
                          ? 'bg-accent-gradient text-white rounded-tr-none message-bubble-me'
                          : 'bg-zinc-900/90 backdrop-blur-sm border border-zinc-800/60 text-zinc-100 rounded-tl-none message-bubble-peer'
                      }`}
                      style={{
                        borderRadius: 'var(--bubble-radius, 16px)',
                        opacity: 'var(--bubble-opacity, 0.9)',
                      }}
                    >
                      {/* Floating quick actions inside bubble */}
                      {m.status !== 'pending' && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 bg-zinc-950/85 backdrop-blur-md rounded-lg p-1 border border-zinc-800/80 z-20">
                          <button
                            onClick={(e) => { e.stopPropagation(); setReplyingTo(m); }}
                            className="p-1 hover:bg-zinc-850 rounded text-xs transition-colors"
                            title="Ответить"
                          >
                            ↩️
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); pinMessage(m); }}
                            className="p-1 hover:bg-zinc-850 rounded text-xs transition-colors"
                            title="Закрепить"
                          >
                            📌
                          </button>
                          {isMe && !isSticker && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(m); }}
                              className="p-1 hover:bg-zinc-850 rounded text-xs transition-colors"
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMsg(m.id); }}
                            className="p-1 hover:bg-zinc-850 rounded text-xs hover:text-red-400 transition-colors"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                      )}

                      {/* Reply Header inside bubble */}
                      {m.replyToId && (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`msg-${m.replyToId}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el?.classList.add('highlight-pulse');
                            setTimeout(() => el?.classList.remove('highlight-pulse'), 1800);
                          }}
                          className="mb-2 p-2 rounded bg-black/20 border-l-2 border-accent text-[11px] cursor-pointer truncate max-w-full hover:bg-black/35 transition-colors select-none"
                        >
                          <span className="font-bold text-accent block text-[9px] uppercase tracking-wider">Ответ на сообщение</span>
                          <span className="text-zinc-400 block truncate mt-0.5">
                            {repliedToMsg ? (
                              repliedToMsg.text.startsWith('[sticker:') ? '🎨 Стикер' : repliedToMsg.text.startsWith('[voice:') ? '🎤 Голосовое сообщение' : repliedToMsg.text
                            ) : (
                              '🔒 Посмотреть оригинальное сообщение'
                            )}
                          </span>
                        </div>
                      )}

                      {/* Route Content widgets */}
                      {m.text === '/slots' ? (
                        <SlotsWidget />
                      ) : m.text === '/dice' ? (
                        <DiceWidget />
                      ) : m.text === '/calc' ? (
                        <BotCalculator />
                      ) : m.text === '/crypto' ? (
                        <BotCryptoChart />
                      ) : m.text === '/quiz' ? (
                        <BotQuiz />
                      ) : m.text === '/weather' ? (
                        <BotWeather />
                      ) : m.text === '/help' ? (
                        <HelpWidget onSelectCommand={(cmd) => sendText(cmd)} />
                      ) : m.text.startsWith('[voice:') ? (
                        <VoicePlayer duration={parseInt(m.text.match(/\[voice:(\d+)\]/)?.[1] || '5', 10)} />
                      ) : (
                        <div className="markdown-body select-text">{parseMarkdown(m.text)}</div>
                      )}

                      {/* Reactions Pill Display */}
                      {hasReactions && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-white/10">
                          {Object.entries(m.reactions!).map(([emoji, userIds]) => {
                            if (!userIds || userIds.length === 0) return null;
                            const hasReacted = userIds.includes(userId!);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(m.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all duration-250 ${
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
                  )}

                  {/* Time & Delivery Checkmarks */}
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
                      <span className="text-[10px] leading-none flex items-center select-none">
                        {m.status === 'pending' ? (
                          <span className="text-zinc-650 animate-spin">⏳</span>
                        ) : m.status === 'read' ? (
                          <span className="text-accent font-bold tracking-[-3px] mr-1">✓✓</span>
                        ) : (
                          <span className="text-zinc-500 font-bold">✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );

              return (
                <div
                  key={m.clientMsgId || m.id}
                  id={`msg-${m.id}`}
                  className={`flex w-full group relative items-end ${isMe ? 'justify-end' : 'justify-start'} transition-all duration-300 rounded-xl p-1`}
                >
                  {/* Hover Actions (My messages - Edit, Delete, Pin, Reply) */}
                  {isMe && m.status !== 'pending' && !isSticker && (
                    <div className="hidden group-hover:flex items-center gap-1.5 mr-2 self-center transition-all duration-200">
                      <button
                        onClick={() => setReplyingTo(m)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                        title="Ответить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l-6-6m6 6l-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => pinMessage(m)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                        title="Закрепить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m0 4h3m-3 0H5m3 4v8m0-8h5m-5 0H5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => startEdit(m)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                        title="Редактировать"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMsg(m.id)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-400 transition-all duration-200"
                        title="Удалить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {msgBurnTime && msgBurnTime > 0 ? (
                    <SelfDestructingBubble
                      message={m}
                      burnTime={msgBurnTime}
                      onBurn={() => {
                        socketRef.current?.emit('message:delete', {
                          chatId,
                          messageId: m.id,
                        });
                      }}
                    >
                      {bubbleContent}
                    </SelfDestructingBubble>
                  ) : (
                    bubbleContent
                  )}

                  {/* Hover Actions (Peer messages - Reply, Pin, Delete) */}
                  {!isMe && m.status !== 'pending' && !isSticker && (
                    <div className="hidden group-hover:flex items-center gap-1.5 ml-2 self-center transition-all duration-200">
                      <button
                        onClick={() => setReplyingTo(m)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                        title="Ответить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l-6-6m6 6l-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => pinMessage(m)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                        title="Закрепить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m0 4h3m-3 0H5m3 4v8m0-8h5m-5 0H5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMsg(m.id)}
                        className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-400 transition-all duration-200"
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
          <div className="px-6 py-1.5 text-xs text-accent italic flex items-center gap-1.5 animate-pulse bg-zinc-955/20 backdrop-blur-sm z-10 select-none">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{peer ? peer.displayName || peer.username : 'Собеседник'} печатает...</span>
          </div>
        )}

        {/* Replying to message banner */}
        {replyingTo && (
          <div className="px-6 py-2 bg-zinc-900/90 border-t border-zinc-800/60 flex items-center justify-between animate-slide-up z-15 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l-6-6m-6 6l6 6" />
              </svg>
              <div className="text-xs min-w-0">
                <div className="font-semibold text-accent text-[10px] uppercase tracking-wider">Ответ на сообщение</div>
                <div className="text-zinc-400 truncate max-w-lg">
                  {replyingTo.text.startsWith('[sticker:') ? '🎨 Стикер' : replyingTo.text.startsWith('[voice:') ? '🎤 Голосовое сообщение' : replyingTo.text}
                </div>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Editing Message Banner */}
        {editingMessage && (
          <div className="px-6 py-2 bg-zinc-900/90 border-t border-zinc-800/60 flex items-center justify-between animate-slide-up z-15 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <div className="text-xs min-w-0">
                <div className="font-semibold text-accent text-[10px] uppercase tracking-wider">Редактирование сообщения</div>
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
          <div className="flex gap-2 max-w-5xl mx-auto relative items-center">
            {/* Sticker Picker */}
            <div className="relative" ref={stickerPanelRef}>
              <button
                type="button"
                onClick={() => {
                  if (isRecording) return;
                  setIsStickerOpen((prev) => !prev);
                }}
                disabled={isRecording}
                className={`p-2.5 rounded-xl border transition-all ${
                  isStickerOpen
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
                title="Стикеры"
              >
                🎨
              </button>

              {isStickerOpen && (
                <div className="absolute bottom-full left-0 mb-3 bg-zinc-950 border border-zinc-850 p-3 rounded-2xl grid grid-cols-4 gap-2 z-30 shadow-2xl backdrop-blur-xl animate-fade-in w-72">
                  <div className="col-span-4 text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1">
                    Стикеры Aether
                  </div>
                  {STICKER_LIST.map((sticker) => (
                    <button
                      key={sticker}
                      onClick={() => sendSticker(sticker)}
                      className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800/80 rounded-xl transition-all flex items-center justify-center"
                    >
                      <StickerSvg name={sticker} size={42} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Self-Destruct Timer Picker */}
            <div className="relative" ref={burnMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (isRecording) return;
                  setIsBurnMenuOpen((prev) => !prev);
                  sounds.playReact();
                }}
                disabled={isRecording}
                className={`p-2.5 rounded-xl border transition-all ${
                  burnTime > 0
                    ? 'bg-red-500/15 border-red-500/35 text-red-400 font-bold'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
                title="Автоудаление сообщений"
              >
                {burnTime > 0 ? `🔥 ${burnTime}с` : '⏱️'}
              </button>

              {isBurnMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl flex flex-col gap-1 z-30 shadow-2xl backdrop-blur-xl animate-fade-in w-36">
                  <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-2.5">
                    Автоудаление
                  </div>
                  {[
                    { name: 'Выкл', val: 0 },
                    { name: '5 сек', val: 5 },
                    { name: '10 сек', val: 10 },
                    { name: '30 сек', val: 30 },
                    { name: '1 мин', val: 60 },
                    { name: '5 мин', val: 300 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setBurnTime(opt.val);
                        setIsBurnMenuOpen(false);
                        sounds.playReact();
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        burnTime === opt.val
                          ? 'bg-accent/15 text-accent font-bold'
                          : 'hover:bg-zinc-900 text-zinc-350'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Simulated Voice Recording UI vs normal Input Box */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 animate-slide-up">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs text-zinc-300 font-mono font-semibold">
                    Запись 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                  </span>
                  <VoiceRecordWaveform />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsRecording(false);
                      sounds.playReact();
                    }}
                    className="px-3 py-1.5 bg-red-650/10 hover:bg-red-650/20 text-red-400 text-xs font-semibold rounded-lg transition-colors border border-red-500/10"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      setIsRecording(false);
                      sendVoiceNote(recordingSeconds || 1);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/20"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                      : 'Сообщение (поддерживает **жирный**, `/slots`, `/dice` и т.д.)…'
                  }
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent disabled:opacity-50 transition-colors"
                />

                {/* Voice Recorder trigger button */}
                <button
                  type="button"
                  onClick={() => {
                    if (peerKeyStatus === 'missing') return;
                    setIsRecording(true);
                    sounds.playReact();
                  }}
                  disabled={peerKeyStatus === 'missing'}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all disabled:opacity-50"
                  title="Записать голосовое сообщение"
                >
                  🎤
                </button>
                
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right-Hand Info Panel */}
      {isInfoOpen && (
        <div className="w-80 border-l border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex flex-col h-full z-20 animate-in slide-in-from-right duration-300 select-none">
          {/* Header */}
          <div className="h-16 border-b border-zinc-900/80 px-4 flex items-center justify-between flex-shrink-0">
            <span className="font-bold text-xs tracking-wide uppercase text-zinc-400">Информация</span>
            <button
              onClick={() => setIsInfoOpen(false)}
              className="p-1 text-zinc-500 hover:text-zinc-250 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* Large Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                {peer?.avatarUrl ? (
                  <img
                    src={peer.avatarUrl}
                    alt={peer.displayName || peer.username}
                    className="w-20 h-20 rounded-3xl object-cover border-2 border-zinc-800/80 shadow-2xl"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-accent-gradient text-white flex items-center justify-center font-bold text-2xl shadow-accent">
                    {(peer?.displayName || peer?.username || '👤').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-4 border-zinc-950 ${
                  isPeerOnline ? 'bg-emerald-500' : 'bg-zinc-650'
                }`} />
              </div>
              <h3 className="font-bold text-sm text-zinc-100 truncate max-w-full">{peer?.displayName || peer?.username}</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">@{peer?.username || 'username'}</p>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full w-fit">
                {isPeerOnline ? 'В сети' : 'Не в сети'}
              </div>
            </div>

            {/* Bio info */}
            <div className="border-t border-zinc-900 pt-5 space-y-3.5">
              <div>
                <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  О себе
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/30 p-3 rounded-xl border border-zinc-900/50 select-text">
                  {peer?.bio || 'Сведения о пользователе отсутствуют.'}
                </p>
              </div>

              <div>
                <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Шифрование данных
                </span>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl leading-relaxed">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Защищено ключами Diffie-Hellman</span>
                </div>
              </div>
            </div>

            {/* Exchanged Stickers Gallery */}
            <div className="border-t border-zinc-900 pt-5">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
                Отправлено стикеров ({sharedStickers.length})
              </span>
              {sharedStickers.length === 0 ? (
                <div className="text-[10px] text-zinc-600 bg-zinc-900/10 p-4 rounded-xl border border-dashed border-zinc-900/60 text-center">
                  Стикеры ещё не отправлялись
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 bg-zinc-900/15 p-2 rounded-xl border border-zinc-900">
                  {sharedStickers.map((m) => {
                    const match = m.text.match(/\[sticker:(\w+)\]/);
                    const name = match ? (match[1] as StickerName) : null;
                    if (!name || !STICKER_LIST.includes(name)) return null;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          sounds.playReact();
                          launchParticles(name);
                        }}
                        className="p-1.5 hover:bg-zinc-900/80 rounded-lg flex items-center justify-center transition-all bg-zinc-950/40 border border-zinc-900/50 cursor-pointer"
                        title={new Date(m.createdAt).toLocaleString()}
                      >
                        <StickerSvg name={name} size={36} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
