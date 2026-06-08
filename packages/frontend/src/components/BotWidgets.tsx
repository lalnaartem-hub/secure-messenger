import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../utils/sound';
import { launchParticles } from './ParticleCanvas';

// ==========================================
// 1. BOT INTERACTIVE CALCULATOR
// ==========================================

export function BotCalculator() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const handlePress = (val: string) => {
    sounds.playReact();
    if (val === '=') {
      try {
        // Safe evaluation of basic math expressions using Function constructor
        const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
        const computed = new Function(`return ${sanitized}`)();
        setResult(String(computed));
        setHistory(prev => [...prev.slice(-3), `${expr} = ${computed}`]);
      } catch (err) {
        setResult('Ошибка');
      }
    } else if (val === 'C') {
      setExpr('');
      setResult('');
    } else if (val === '⌫') {
      setExpr(prev => prev.slice(0, -1));
    } else {
      setExpr(prev => prev + val);
    }
  };

  const buttons = [
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-64 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100">
      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Калькулятор AetherBot</div>
      
      {/* Display Screen */}
      <div className="bg-zinc-900 border border-zinc-800/80 p-2.5 rounded-xl mb-3 text-right font-mono min-h-[60px] flex flex-col justify-between">
        <div className="text-[10px] text-zinc-500 truncate">{expr || '0'}</div>
        <div className="text-sm font-bold text-accent truncate">{result || '0'}</div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.flat().map((btn) => {
          const isAction = ['C', '=', '⌫', '/', '*', '-', '+', '(', ')'].includes(btn);
          const isEquals = btn === '=';
          return (
            <button
              key={btn}
              onClick={() => handlePress(btn)}
              className={`py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                isEquals
                  ? 'bg-accent hover:bg-accent-hover text-white col-span-1 shadow-accent/20 shadow-md'
                  : isAction
                  ? 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-accent'
                  : 'bg-zinc-900/40 hover:bg-zinc-850 border border-zinc-900 text-zinc-300'
              }`}
            >
              {btn}
            </button>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-zinc-900 text-left">
          <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider mb-1">История</div>
          {history.map((h, i) => (
            <div key={i} className="text-[10px] text-zinc-500 font-mono truncate">{h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. BOT INTERACTIVE CRYPTO CANVAS CHART
// ==========================================

export function BotCryptoChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coin, setCoin] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [priceData, setPriceData] = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Generate mock price trend
  useEffect(() => {
    let basePrice = coin === 'BTC' ? 64000 : coin === 'ETH' ? 3450 : 148;
    const volatility = coin === 'BTC' ? 800 : coin === 'ETH' ? 45 : 3;
    const points: number[] = [];
    
    let current = basePrice;
    for (let i = 0; i < 20; i++) {
      current += (Math.random() - 0.48) * volatility;
      points.push(current);
    }
    setPriceData(points);
    setCurrentPrice(points[points.length - 1]);
  }, [coin]);

  // Redraw chart when data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw grid
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...priceData) * 0.998;
    const max = Math.max(...priceData) * 1.002;
    const range = max - min;

    // Gridlines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Chart Line Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    // Line Coordinates
    const points = priceData.map((val, index) => {
      const x = (width / (priceData.length - 1)) * index;
      const y = height - ((val - min) / range) * (height - 20) - 10;
      return { x, y };
    });

    // Fill area under line
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const p of points) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fill();

    // Draw Trend Line
    ctx.strokeStyle = 'var(--accent-primary)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Draw Pulsing latest price dot
    const latest = points[points.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'var(--accent-primary)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.circle(latest.x - 3, latest.y, 4);
    ctx.fill();
    ctx.stroke();

  }, [priceData]);

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-72 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Crypto Tracker</span>
        <div className="flex gap-1.5">
          {(['BTC', 'ETH', 'SOL'] as const).map((c) => (
            <button
              key={c}
              onClick={() => { setCoin(c); sounds.playReact(); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                coin === c
                  ? 'bg-accent/15 border-accent/30 text-accent'
                  : 'bg-zinc-900 border-zinc-900 text-zinc-400 hover:text-zinc-250'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Price Display */}
      <div className="text-left mb-2.5">
        <div className="text-lg font-bold font-mono tracking-tight text-zinc-150">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 -mt-0.5">
          <span>▲ +1.48% (24ч)</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl overflow-hidden p-1">
        <canvas ref={canvasRef} width={250} height={100} className="w-full h-[100px]" />
      </div>
    </div>
  );
}

// ==========================================
// 3. BOT SECURITY & CRYPTO QUIZ GAME
// ==========================================

interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: 'Что означает сквозное E2E-шифрование?',
    options: [
      'Данные шифруются на сервере перед отправкой',
      'Данные шифруются на устройстве отправителя и расшифровываются только получателем',
      'Данные шифруются интернет-провайдером',
      'Данные защищены обычным HTTPS-протоколом',
    ],
    correct: 1,
    explanation: 'При сквозном шифровании (E2E) ключи для расшифрования хранятся только на устройствах участников, сервер видит лишь шифротекст.',
  },
  {
    q: 'Какой алгоритм обычно используется для обмена ключами в мессенджерах?',
    options: [
      'AES-256',
      'SHA-256',
      'Диффи-Хеллмана на эллиптических кривых (ECDH)',
      'MD5',
    ],
    correct: 2,
    explanation: 'ECDH позволяет двум сторонам согласовать общий секретный ключ по открытым каналам связи.',
  },
  {
    q: 'Что такое атака Man-in-the-Middle (MitM)?',
    options: [
      'Атака, перехватывающая или подменяющая трафик между двумя собеседниками',
      'Подбор пароля брутфорсом',
      'Вирус-вымогатель на компьютере',
      'Отключение серверов мессенджера',
    ],
    correct: 0,
    explanation: 'MitM происходит, когда злоумышленник тайно ретранслирует и, возможно, изменяет связь между двумя сторонами.',
  },
];

export function BotQuiz() {
  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQ = QUIZ_QUESTIONS[qIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOpt(idx);
    setIsAnswered(true);
    
    if (idx === currentQ.correct) {
      setScore(s => s + 1);
      sounds.playReact();
      launchParticles('🎉');
    } else {
      sounds.playSend();
    }
  };

  const handleNext = () => {
    sounds.playReact();
    if (qIndex + 1 < QUIZ_QUESTIONS.length) {
      setQIndex(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      launchParticles('🏆');
    }
  };

  const restart = () => {
    setQIndex(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    sounds.playReact();
  };

  if (quizFinished) {
    return (
      <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-64 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100 animate-message-pop">
        <span className="text-3xl block mb-2">🏆</span>
        <h4 className="font-bold text-sm text-zinc-150 mb-1">Викторина завершена!</h4>
        <p className="text-xs text-zinc-400 mb-4">
          Ваш результат: <span className="font-bold text-accent">{score} из {QUIZ_QUESTIONS.length}</span>
        </p>
        <button
          onClick={restart}
          className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-accent transition-all active:scale-[0.98]"
        >
          Пройти еще раз
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-68 md:w-72 text-left my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100 animate-message-pop">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Безопасность & Крипто</span>
        <span className="text-[10px] text-zinc-400 font-semibold">{qIndex + 1} из {QUIZ_QUESTIONS.length}</span>
      </div>

      {/* Question */}
      <h4 className="text-xs font-bold text-zinc-200 mb-4 leading-relaxed">{currentQ.q}</h4>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {currentQ.options.map((opt, i) => {
          const isSelected = selectedOpt === i;
          const isCorrect = currentQ.correct === i;
          
          let btnStyle = 'bg-zinc-900/40 border-zinc-900 text-zinc-300 hover:bg-zinc-900';
          if (isAnswered) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
            } else if (isSelected) {
              btnStyle = 'bg-red-500/10 border-red-500/30 text-red-400';
            } else {
              btnStyle = 'bg-zinc-900/10 border-zinc-900 text-zinc-500 opacity-60';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isAnswered}
              className={`w-full text-left p-3 rounded-xl border text-xs leading-normal transition-all duration-200 ${btnStyle} flex items-center justify-between`}
            >
              <span>{opt}</span>
              {isAnswered && isCorrect && <span className="text-emerald-400 font-bold ml-1.5">✓</span>}
              {isAnswered && isSelected && !isCorrect && <span className="text-red-400 font-bold ml-1.5">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-[10px] text-zinc-400 leading-normal mb-4 animate-slide-up">
          <span className="font-semibold text-accent block mb-0.5">Пояснение:</span>
          {currentQ.explanation}
        </div>
      )}

      {/* Next Button */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-accent transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <span>Дальше</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ==========================================
// 4. BOT ANIMATED WEATHER FORECAST CARD
// ==========================================

export function BotWeather() {
  const [city, setCity] = useState<'Moscow' | 'Minsk' | 'London'>('Moscow');

  const cityWeather = {
    Moscow: { temp: '+21°C', desc: 'Переменная облачность', icon: 'cloudy', humidity: '55%', wind: '3 м/с' },
    Minsk: { temp: '+19°C', desc: 'Небольшой дождь', icon: 'rainy', humidity: '78%', wind: '5 м/с' },
    London: { temp: '+16°C', desc: 'Пасмурно', icon: 'overcast', humidity: '82%', wind: '6 м/с' },
  };

  const info = cityWeather[city];

  return (
    <div className="bg-zinc-950/90 border border-zinc-850 p-4 rounded-2xl w-64 text-center my-2 shadow-2xl backdrop-blur-md select-none mx-auto text-zinc-100">
      {/* City Toggles */}
      <div className="flex gap-1 justify-center mb-4 border-b border-zinc-900 pb-2.5">
        {(['Moscow', 'Minsk', 'London'] as const).map((c) => (
          <button
            key={c}
            onClick={() => { setCity(c); sounds.playReact(); }}
            className={`px-2 py-0.5 rounded text-[8px] font-bold border transition-all ${
              city === c
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'bg-zinc-900 border-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {c === 'Moscow' ? 'Москва' : c === 'Minsk' ? 'Минск' : 'Лондон'}
          </button>
        ))}
      </div>

      {/* Main weather icon & temp */}
      <div className="flex items-center justify-around mb-3">
        {/* Render animated SVG based on condition */}
        <div className="w-14 h-14 relative flex items-center justify-center">
          {info.icon === 'cloudy' && (
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <circle cx="38" cy="38" r="16" fill="#f59e0b" className="animate-spin" style={{ animationDuration: '40s' }} />
              <path d="M30 65 C30 50 48 44 58 52 C68 45 80 52 80 65 C80 75 70 78 60 78 L40 78 C30 78 30 75 30 65 Z" fill="#64748b" className="animate-pulse" />
            </svg>
          )}
          {info.icon === 'rainy' && (
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <path d="M30 55 C30 40 48 34 58 42 C68 35 80 42 80 55 C80 65 70 68 60 68 L40 68 C30 68 30 65 30 55 Z" fill="#475569" />
              {/* Raindrops */}
              <line x1="38" y1="75" x2="35" y2="85" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" className="animate-bounce" style={{ animationDelay: '0ms' }} />
              <line x1="50" y1="75" x2="47" y2="85" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" className="animate-bounce" style={{ animationDelay: '200ms' }} />
              <line x1="62" y1="75" x2="59" y2="85" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" className="animate-bounce" style={{ animationDelay: '400ms' }} />
            </svg>
          )}
          {info.icon === 'overcast' && (
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <path d="M22 62 C22 48 38 42 48 50 C58 42 72 48 72 62 C72 72 62 75 52 75 L32 75 C22 75 22 72 22 62 Z" fill="#475569" />
              <path d="M38 52 C38 40 50 35 58 42 C66 35 76 40 76 52 C76 60 68 62 60 62 L48 62 C38 62 38 60 38 52 Z" fill="#64748b" opacity="0.8" className="animate-pulse" />
            </svg>
          )}
        </div>

        <div className="text-left">
          <div className="text-2xl font-bold font-mono text-zinc-100">{info.temp}</div>
          <div className="text-[10px] text-zinc-400 font-medium leading-tight max-w-[100px]">{info.desc}</div>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 border border-zinc-900 p-2.5 rounded-xl text-left text-[10px] text-zinc-500">
        <div>
          <span>Влажность: </span>
          <span className="font-semibold text-zinc-300 font-mono">{info.humidity}</span>
        </div>
        <div>
          <span>Ветер: </span>
          <span className="font-semibold text-zinc-300 font-mono">{info.wind}</span>
        </div>
      </div>
    </div>
  );
}
