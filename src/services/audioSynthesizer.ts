// Pure Web Audio API High-Tech Sound Synthesizer
// Provides instantaneous futuristic UI audio feedback without relying on external assets

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  // Dual-tone wake chime ("OTTO wake")
  public playWake() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // Listening start pulse
  public playListening() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Action start sweep
  public playActionStart() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.15);

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.03, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Action success chime
  public playSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const frequencies = [523.25, 659.25, 1046.5]; // C5, E5, C6
    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // High risk confirmation alert
  public playWarning() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.setValueAtTime(293.66, now + 0.1); // D4

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Interrupt stop
  public playStop() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const soundEffects = new AudioSynthesizer();
