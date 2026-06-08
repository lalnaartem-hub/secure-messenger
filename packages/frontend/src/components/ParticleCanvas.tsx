import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  emoji: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;

    // Animation loop
    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Apply physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        if (p.opacity <= 0 || p.y > canvas.height + p.size) {
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px ui-sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }

      animationId = requestAnimationFrame(update);
    };
    update();

    // Trigger handler
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ emoji: string; x?: number; y?: number }>;
      const { emoji, x, y } = customEvent.detail;

      // Spark coordinates (default to center-bottom of screen if not specified)
      const startX = x ?? window.innerWidth / 2;
      const startY = y ?? window.innerHeight - 100;

      // Spawn 15-25 particles per blast
      const count = 15 + Math.floor(Math.random() * 15);
      const newParticles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 1.5);
        const speed = 6 + Math.random() * 10;
        newParticles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 20 + Math.random() * 25,
          emoji,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          opacity: 1,
          decay: 0.01 + Math.random() * 0.015,
        });
      }

      particlesRef.current.push(...newParticles);
    };

    window.addEventListener('trigger-particles', handleTrigger);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('trigger-particles', handleTrigger);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

// Global helper to trigger particle effects from any component
export function launchParticles(emoji: string, x?: number, y?: number) {
  const event = new CustomEvent('trigger-particles', {
    detail: { emoji, x, y },
  });
  window.dispatchEvent(event);
}
