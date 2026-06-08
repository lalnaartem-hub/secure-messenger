import React from 'react';

export const STICKER_LIST = ['rocket', 'fire', 'lock', 'key', 'heart', 'star', 'robot', 'shield'] as const;
export type StickerName = typeof STICKER_LIST[number];

export function StickerSvg({ name, size = 120, className = '' }: { name: StickerName; size?: number; className?: string }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 100 100',
    className: `select-none transition-all duration-300 transform hover:scale-110 active:scale-95 ${className}`,
    style: { display: 'inline-block', verticalAlign: 'middle' },
  };

  switch (name) {
    case 'rocket':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
            <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Flame */}
          <path d="M43 65 Q50 90 57 65 Q65 85 50 95 Q35 85 43 65 Z" fill="url(#fireGrad)" className="animate-pulse origin-center" />
          {/* Rocket Body */}
          <path d="M50 15 C60 35 60 55 58 68 C52 70 48 70 42 68 C40 55 40 35 50 15 Z" fill="url(#rocketGrad)" />
          {/* Fin Left */}
          <path d="M42 55 C32 60 30 70 32 75 C38 74 41 68 42 63" fill="#312e81" />
          {/* Fin Right */}
          <path d="M58 55 C68 60 70 70 68 75 C62 74 59 68 58 63" fill="#312e81" />
          {/* Nose Cone */}
          <path d="M50 15 C54 22 55 27 55 30 C53 30 47 30 45 30 C45 27 46 22 50 15 Z" fill="#f43f5e" />
          {/* Window */}
          <circle cx="50" cy="42" r="5" fill="#38bdf8" stroke="#1e1b4b" strokeWidth="1.5" />
          <circle cx="48" cy="40" r="1.5" fill="#ffffff" opacity="0.6" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="flameBack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="flameMid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="flameFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          {/* Back Flame */}
          <path d="M50 10 C70 35 85 60 75 80 C65 95 35 95 25 80 C15 60 30 35 50 10 Z" fill="url(#flameBack)" className="animate-pulse" />
          {/* Middle Flame */}
          <path d="M50 25 C65 45 75 65 68 80 C60 90 40 90 32 80 C25 65 35 45 50 25 Z" fill="url(#flameMid)" />
          {/* Front Flame */}
          <path d="M50 40 C60 55 68 70 60 82 C55 88 45 88 40 82 C32 70 40 55 50 40 Z" fill="url(#flameFront)" />
          {/* Sparkles */}
          <circle cx="28" cy="45" r="2" fill="#fef08a" className="animate-ping" style={{ animationDuration: '2.5s' }} />
          <circle cx="72" cy="38" r="1.5" fill="#fef08a" className="animate-ping" style={{ animationDuration: '1.8s' }} />
        </svg>
      );
    case 'lock':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="lockBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
            <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {/* Neon Ring */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#neonGlow)" strokeWidth="1.5" strokeDasharray="6,4" className="animate-spin" style={{ animationDuration: '25s' }} />
          {/* Lock Shackle */}
          <path d="M32 45 V32 C32 20 40 16 50 16 C60 16 68 20 68 32 V45" fill="none" stroke="#e4e4e7" strokeWidth="8" strokeLinecap="round" />
          {/* Lock Body */}
          <rect x="25" y="42" width="50" height="40" rx="10" fill="url(#lockBody)" stroke="#52525b" strokeWidth="2" />
          {/* Keyhole */}
          <path d="M50 55 C47 55 45 57 45 60 C45 62 47 64 49 65 V73 H51 V65 C53 64 55 62 55 60 C55 57 53 55 50 55 Z" fill="url(#neonGlow)" className="animate-pulse" />
          {/* Status Dot */}
          <circle cx="50" cy="30" r="3" fill="#10b981" />
        </svg>
      );
    case 'key':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="goldKey" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* Key body */}
          <g transform="rotate(45 50 50)" className="origin-center">
            {/* Handle ring */}
            <circle cx="30" cy="50" r="14" fill="none" stroke="url(#goldKey)" strokeWidth="6" />
            <circle cx="30" cy="50" r="4" fill="url(#goldKey)" />
            {/* Shaft */}
            <rect x="42" y="47" width="38" height="6" rx="2" fill="url(#goldKey)" />
            {/* Teeth */}
            <rect x="68" y="53" width="6" height="10" rx="1" fill="url(#goldKey)" />
            <rect x="76" y="53" width="6" height="10" rx="1" fill="url(#goldKey)" />
            {/* Shiny Sparkle */}
            <path d="M72 32 L75 35 L72 38 L69 35 Z" fill="#ffffff" className="animate-pulse" />
          </g>
        </svg>
      );
    case 'heart':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>
          {/* Heart shape */}
          <path d="M50 82 C50 82 18 60 18 38 C18 24 28 15 40 15 C46 15 50 20 50 20 C50 20 54 15 60 15 C72 15 82 24 82 38 C82 60 50 82 50 82 Z" fill="url(#heartGrad)" className="animate-pulse origin-center" style={{ animationDuration: '1.2s' }} />
          {/* Highlight reflex */}
          <path d="M25 35 A8 8 0 0 1 38 22" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          {/* Tiny floating hearts */}
          <path d="M22 20 Q24 10 26 20 Q28 10 24 5 Q20 10 22 20 Z" fill="#fda4af" className="animate-bounce" style={{ animationDuration: '2s' }} />
          <path d="M78 28 Q80 18 82 28 Q84 18 80 13 Q76 18 78 28 Z" fill="#fda4af" className="animate-bounce" style={{ animationDuration: '1.6s' }} />
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="1" />
              <stop offset="100%" stopColor="#ca8a04" stopOpacity="1" />
            </linearGradient>
            <filter id="starShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#ca8a04" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* 3D Star */}
          <path d="M50 12 L61 38 L88 38 L66 54 L75 80 L50 63 L25 80 L34 54 L12 38 L39 38 Z" fill="url(#starGrad)" filter="url(#starShadow)" className="origin-center" style={{ animation: 'bounce 2s infinite ease-in-out' }} />
          {/* Face */}
          <circle cx="43" cy="46" r="2.5" fill="#854d0e" />
          <circle cx="57" cy="46" r="2.5" fill="#854d0e" />
          <path d="M46 54 Q50 58 54 54" fill="none" stroke="#854d0e" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'robot':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="roboGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {/* Antenna */}
          <rect x="48" y="14" width="4" height="10" fill="#64748b" />
          <circle cx="50" cy="12" r="4" fill="#ef4444" className="animate-ping" style={{ animationDuration: '1.5s' }} />
          <circle cx="50" cy="12" r="3.5" fill="#ef4444" />
          {/* Ears */}
          <rect x="18" y="42" width="6" height="16" rx="2" fill="#475569" />
          <rect x="76" y="42" width="6" height="16" rx="2" fill="#475569" />
          {/* Head Body */}
          <rect x="22" y="24" width="56" height="50" rx="14" fill="url(#roboGrad)" stroke="#0f172a" strokeWidth="2.5" />
          {/* Eyes Panel */}
          <rect x="30" y="36" width="40" height="18" rx="6" fill="#0f172a" />
          {/* Glowing Eyes */}
          <circle cx="40" cy="45" r="4.5" fill="url(#eyeGrad)" className="animate-pulse" />
          <circle cx="60" cy="45" r="4.5" fill="url(#eyeGrad)" className="animate-pulse" />
          {/* Cheeks */}
          <circle cx="34" cy="62" r="2.5" fill="#f472b6" opacity="0.6" />
          <circle cx="66" cy="62" r="2.5" fill="#f472b6" opacity="0.6" />
          {/* Mouth */}
          <rect x="44" y="60" width="12" height="4" rx="2" fill="#0f172a" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...commonProps}>
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          {/* Shield Outer */}
          <path d="M50 14 C70 18 80 25 80 40 C80 62 65 78 50 86 C35 78 20 62 20 40 C20 25 30 18 50 14 Z" fill="url(#shieldGrad)" stroke="url(#shieldBorder)" strokeWidth="3" />
          {/* Shield Inner lines */}
          <path d="M50 22 C65 25 72 30 72 42 C72 58 60 70 50 76 C40 70 28 58 28 42 C28 30 35 25 50 22 Z" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,2" />
          {/* Glowing Checkmark */}
          <path d="M42 50 L48 56 L58 44" fill="none" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
          <path d="M42 50 L48 56 L58 44" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
