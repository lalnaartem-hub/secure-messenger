class SoundService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSend() {
    if (localStorage.getItem('soundEffects') === 'false') return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Failed to play send sound:', e);
    }
  }

  playReceive() {
    if (localStorage.getItem('soundEffects') === 'false') return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const playPop = (delay: number) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now + delay);
        osc.frequency.exponentialRampToValueAtTime(350, now + delay + 0.06);

        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.linearRampToValueAtTime(0.001, now + delay + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.06);
      };

      playPop(0);
      playPop(0.06);
    } catch (e) {
      console.warn('Failed to play receive sound:', e);
    }
  }

  playReact() {
    if (localStorage.getItem('soundEffects') === 'false') return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.linearRampToValueAtTime(1300, now + 0.04);
      osc.frequency.linearRampToValueAtTime(1050, now + 0.1);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Failed to play react sound:', e);
    }
  }
}

export const sounds = new SoundService();
