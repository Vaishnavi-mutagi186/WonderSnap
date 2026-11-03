/**
 * WonderSnap - Web Audio Synthesizer
 * Generates ambient sci-fi soundscapes and dynamic audio feedback for gestures.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
    this.filter = null;
    this.lastModeSoundTime = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master lowpass filter
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      this.filter.connect(this.ctx.destination);

      // Ambient space drone
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.droneGain.connect(this.filter);

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(98.0, this.ctx.currentTime); // G2

      this.droneOsc1.connect(this.droneGain);
      this.droneOsc2.connect(this.droneGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = !this.enabled;
    if (this.droneGain && this.ctx) {
      const targetGain = this.enabled ? 0.04 : 0;
      this.droneGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.3);
    }
    return this.enabled;
  }

  playModeChange() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastModeSoundTime < 0.25) return;
    this.lastModeSoundTime = now;

    // Harmonic arpeggio chime
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.6);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.65);
    });
  }

  playBurst() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playContraction() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  updatePinchAudio(distance) {
    if (!this.enabled || !this.ctx || !this.filter) return;
    // Map pinch distance (0.02 to 0.25) to filter cutoff frequency
    const clamped = Math.max(0.02, Math.min(0.25, distance));
    const normalized = (clamped - 0.02) / 0.23;
    const targetFreq = 400 + normalized * 3200;
    this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
  }
}
