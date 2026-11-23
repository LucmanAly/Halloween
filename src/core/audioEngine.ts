import type { CreatureId } from '../creatures/types.ts';
import { eventBus } from './eventBus.ts';
import { gameState } from './state.ts';

const MARIMBA_SCALE = [293.66, 349.23, 392.0, 440.0, 523.25]; // D4, F4, G4, A4, C5

// Cheerful silly-spooky marimba groove (step -> freq or null for rest)
const MELODY_PATTERN: Array<number | null> = [
  293.66, null, 349.23, 440.0, 392.0, null, 349.23, null,
  523.25, null, 440.0, 392.0, 349.23, null, 293.66, null,
  293.66, null, 349.23, 440.0, 587.33, null, 523.25, null,
  440.0, null, 392.0, 349.23, 293.66, null, null, null,
];

const BASS_PATTERN: Array<number | null> = [
  146.83, null, null, null, 220.0, null, null, null,
  174.61, null, null, null, 196.0, null, null, null,
  146.83, null, null, null, 220.0, null, null, null,
  174.61, null, 196.0, null, 146.83, null, null, null,
];

// Upbeat Halloween disco groove for Monster Dance Party
const PARTY_MELODY_PATTERN: Array<number | null> = [
  523.25, null, 659.25, 783.99, 659.25, null, 587.33, 523.25,
  659.25, null, 783.99, null, 880.0, 783.99, 659.25, null,
  587.33, null, 698.46, 880.0, 783.99, null, 659.25, 587.33,
  523.25, 659.25, 783.99, 1046.5, 880.0, null, 783.99, null,
];

const PARTY_BASS_PATTERN: Array<number | null> = [
  130.81, null, 261.63, null, 130.81, null, 261.63, null,
  174.61, null, 349.23, null, 196.0, null, 392.0, null,
  146.83, null, 293.66, null, 196.0, null, 392.0, null,
  130.81, null, 261.63, null, 196.0, null, 261.63, null,
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private voiceAnalyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;

  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private unlocked = false;
  private visibilityBound = false;
  private partyMode = false;

  private readonly voiceCache = new Map<string, AudioBuffer>();
  private readonly voicePending = new Map<string, Promise<AudioBuffer>>();
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeVoiceRaf = 0;
  private voicePlaySeq = 0;
  private voiceDucking = false;
  private activeVoiceStopCleanup: (() => void) | null = null;
  private suspendTimer = 0;

  constructor() {
    eventBus.on('audio:state', () => {
      this.syncGains();
    });
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.voiceAnalyser = this.ctx.createAnalyser();
      this.voiceAnalyser.fftSize = 256;
      this.voiceAnalyser.smoothingTimeConstant = 0.45;
      this.analyserData = new Uint8Array(new ArrayBuffer(this.voiceAnalyser.frequencyBinCount));

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.voiceGain.connect(this.voiceAnalyser);
      this.voiceAnalyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.unlocked = true;
    this.syncGains();
    this.startMusic();

    if (!this.visibilityBound) {
      this.visibilityBound = true;
      const fadeOutAndSuspend = () => {
        if (!this.ctx || !this.unlocked) return;
        this.stopVoice();
        this.stopMusic();
        if (this.masterGain) {
          this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        }
        window.clearTimeout(this.suspendTimer);
        this.suspendTimer = window.setTimeout(() => {
          if (document.hidden && this.ctx && this.ctx.state === 'running') {
            void this.ctx.suspend();
          }
        }, 60);
      };

      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.unlocked) return;
        if (document.hidden) {
          fadeOutAndSuspend();
        } else {
          window.clearTimeout(this.suspendTimer);
          void this.ctx.resume().then(() => {
            this.syncGains();
            this.startMusic();
          });
        }
      });

      window.addEventListener('pagehide', fadeOutAndSuspend);
    }
  }

  private syncGains(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain || !this.voiceGain) return;
    const { muted, musicVolume, sfxVolume } = gameState.get().audio;
    const t = this.ctx.currentTime;
    const musicScale = this.voiceDucking ? 0.08 : 0.24;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, t, 0.025);
    this.musicGain.gain.setTargetAtTime(musicVolume * musicScale, t, 0.04);
    this.sfxGain.gain.setTargetAtTime(sfxVolume * 0.72, t, 0.025);
    this.voiceGain.gain.setTargetAtTime(sfxVolume * 0.95, t, 0.025);
  }

  private isReady(): boolean {
    if (!this.unlocked || !this.ctx || !this.sfxGain || gameState.get().audio.muted) {
      return false;
    }
    if (this.ctx.state === 'suspended' && !document.hidden) {
      void this.ctx.resume();
    }
    return true;
  }

  startMusic(): void {
    if (!this.ctx || !this.unlocked || this.musicTimer !== null) return;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.musicTimer = window.setInterval(() => this.scheduleMusicSteps(), 110);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setPartyMode(active: boolean): void {
    if (this.partyMode === active) return;
    this.partyMode = active;
    this.currentStep = 0;
    if (this.ctx && this.unlocked) {
      this.nextStepTime = Math.max(this.ctx.currentTime + 0.04, this.nextStepTime);
    }
  }

  private scheduleMusicSteps(): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const stepDuration = this.partyMode ? 0.175 : 0.23; // 130 BPM spooky vs bouncy party disco
    const melody = this.partyMode ? PARTY_MELODY_PATTERN : MELODY_PATTERN;
    const bass = this.partyMode ? PARTY_BASS_PATTERN : BASS_PATTERN;

    while (this.nextStepTime < this.ctx.currentTime + 0.28) {
      const idx = this.currentStep % melody.length;
      const melodyFreq = melody[idx];
      const bassFreq = bass[idx];
      if (!gameState.get().audio.muted) {
        if (melodyFreq) this.playMusicMarimba(melodyFreq, this.nextStepTime);
        if (bassFreq) this.playMusicBass(bassFreq, this.nextStepTime);
        if (this.partyMode) this.playPartyBeat(idx, this.nextStepTime);
      }
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % melody.length;
    }
  }

  private playPartyBeat(step: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    if (step % 4 === 0) {
      // Soft bouncy kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(128, when);
      osc.frequency.exponentialRampToValueAtTime(48, when + 0.09);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.35, when + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(when);
      osc.stop(when + 0.12);
    } else if (step % 4 === 2) {
      // Crisp wooden clap/tick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, when);
      osc.frequency.exponentialRampToValueAtTime(340, when + 0.045);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.18, when + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(when);
      osc.stop(when + 0.065);
    }
  }

  private playMusicMarimba(freq: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.28, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + 0.26);
  }

  private playMusicBass(freq: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.32, when + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + 0.36);
  }

  // --- Synthesized Kid-Friendly SFX ---

  playMarimbaNote(stepIndex: number): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const freq = MARIMBA_SCALE[((stepIndex % MARIMBA_SCALE.length) + MARIMBA_SCALE.length) % MARIMBA_SCALE.length];
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, t);

    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.18, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.42, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    osc.connect(gain);
    harmonic.connect(hGain);
    hGain.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    harmonic.start(t);
    osc.stop(t + 0.45);
    harmonic.stop(t + 0.16);
  }

  playBubblePop(pitchBoost = 0): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const base = 290 + pitchBoost * 45;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 2.5, t + 0.08);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.36, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playSparkleChime(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const notes = [659.25, 880, 1046.5, 1318.5];
    const baseTime = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playCandyCollect(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const notes = [659.25, 987.77];
    const baseTime = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.26, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  playDoorKnock(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const baseTime = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((offset, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 2 ? 185 : 155, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.07);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  playMoonYawn(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.exponentialRampToValueAtTime(311.13, t + 0.32);
    osc.frequency.exponentialRampToValueAtTime(466.16, t + 0.55);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.26, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  playBushGiggle(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const hops = [520, 660, 580, 740];
    const baseTime = this.ctx.currentTime;
    hops.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.045);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.075);
    });
  }

  playPumpkinBoing(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(210, t + 0.34);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  playCauldronSplash(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const freqs = [240, 320, 460, 620];
    const baseTime = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  playSpiderHi(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const baseTime = this.ctx.currentTime;
    [620, 920].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.06);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  playBatSqueak(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const baseTime = this.ctx.currentTime;
    [0, 0.11, 0.21].forEach((offset, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = 1100 + i * 140;
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(start * 1.35, t + 0.04);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  playWindowBoo(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(590, t + 0.16);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.34);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.26, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playFanfare(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const baseTime = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.085;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  playBoneRattle(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const freqs = [680, 860, 740, 990];
    const baseTime = this.ctx.currentTime;
    freqs.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.075;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.055);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.34, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  playMonsterStomp(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const baseTime = this.ctx.currentTime;
    [0, 0.16].forEach((offset, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 128 : 112, t);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.14);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.45, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // --- Phase 3: Mini-Activity & Dance Pad SFX ---

  playIngredientDrop(slotIndex = 0): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const base = 280 + slotIndex * 65;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.16);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playPotionBrew(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    const baseTime = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  playFlashlightClick(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.038);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.34, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playHotColdPing(closeness01: number): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const clamped = Math.max(0, Math.min(1, closeness01));
    const t = this.ctx.currentTime;
    const freq = 360 + clamped * 520;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.16 + clamped * 0.14, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playDoorCreak(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(265, t + 0.38);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  playSillyBonk(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(390, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(295, t + 0.26);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playCostumeSnap(): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const notes = [523.25, 783.99, 1046.5];
    const baseTime = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  playDancePad(creatureId: CreatureId): void {
    if (!this.isReady() || !this.ctx || !this.sfxGain) return;
    const riffs: Record<CreatureId, { type: OscillatorType; notes: number[]; step: number }> = {
      pip: { type: 'sine', notes: [523.25, 659.25, 783.99], step: 0.065 },
      boobell: { type: 'sine', notes: [880, 1174.66, 1318.51], step: 0.075 },
      winnie: { type: 'triangle', notes: [659.25, 783.99, 987.77, 1318.51], step: 0.055 },
      barnaby: { type: 'triangle', notes: [587.33, 698.46, 587.33, 880], step: 0.06 },
      frankie: { type: 'triangle', notes: [130.81, 196.0, 261.63], step: 0.09 },
      bitey: { type: 'sine', notes: [1046.5, 1318.51, 1567.98], step: 0.05 },
    };
    const riff = riffs[creatureId];
    const baseTime = this.ctx.currentTime;
    riff.notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = baseTime + i * riff.step;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = riff.type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // --- Phase 2: Real Voice Playback & Real-Time Lip-Sync API ---

  getVoiceAmplitude(): number {
    if (!this.voiceAnalyser || !this.analyserData) return 0;
    this.voiceAnalyser.getByteTimeDomainData(this.analyserData);
    let sumSq = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const normalized = (this.analyserData[i] - 128) / 128;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / this.analyserData.length);
    return Math.min(1, rms * 3.2);
  }

  stopVoice(): void {
    this.voicePlaySeq += 1;
    if (this.activeVoiceRaf) {
      cancelAnimationFrame(this.activeVoiceRaf);
      this.activeVoiceRaf = 0;
    }
    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.stop();
      } catch {
        // Ignore already-stopped source.
      }
      this.activeVoiceSource = null;
    }
    const cleanup = this.activeVoiceStopCleanup;
    this.activeVoiceStopCleanup = null;
    cleanup?.();
    if (this.voiceDucking) {
      this.voiceDucking = false;
      this.syncGains();
    }
  }

  private async loadVoiceBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.voiceCache.get(url);
    if (cached) return cached;

    const existing = this.voicePending.get(url);
    if (existing) return existing;

    const promise = (async () => {
      if (!this.ctx) {
        throw new Error('AudioContext not initialized');
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch voice clip: ${url}`);
      }
      const bytes = await response.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(bytes);
      this.voiceCache.set(url, buffer);
      return buffer;
    })().finally(() => {
      this.voicePending.delete(url);
    });

    this.voicePending.set(url, promise);
    return promise;
  }

  async preloadVoice(url: string): Promise<void> {
    if (
      !this.ctx ||
      !this.unlocked ||
      this.voiceCache.has(url) ||
      document.hidden ||
      gameState.get().audio.muted
    ) {
      return;
    }
    try {
      await this.loadVoiceBuffer(url);
    } catch {
      // Ignore offline/slow-network preload misses silently.
    }
  }

  async playVoiceBuffer(url: string, onFrame?: (amp: number) => void): Promise<void> {
    if (!this.ctx || !this.voiceGain || !this.unlocked) return;

    this.stopVoice();
    const seq = this.voicePlaySeq;

    const buffer = await this.loadVoiceBuffer(url);
    if (seq !== this.voicePlaySeq) return;

    return new Promise((resolve) => {
      if (!this.ctx || !this.voiceGain || seq !== this.voicePlaySeq) {
        resolve();
        return;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.voiceGain);
      this.activeVoiceSource = source;

      this.voiceDucking = true;
      this.syncGains();

      let finished = false;
      const finalize = () => {
        if (finished) return;
        finished = true;
        if (this.activeVoiceRaf) {
          cancelAnimationFrame(this.activeVoiceRaf);
          this.activeVoiceRaf = 0;
        }
        if (this.activeVoiceSource === source) {
          this.activeVoiceSource = null;
        }
        if (this.activeVoiceStopCleanup === finalize) {
          this.activeVoiceStopCleanup = null;
        }
        if (seq === this.voicePlaySeq) {
          this.voiceDucking = false;
          this.syncGains();
        }
        onFrame?.(0);
        resolve();
      };

      this.activeVoiceStopCleanup = finalize;

      const pump = () => {
        if (finished || seq !== this.voicePlaySeq) return;
        onFrame?.(this.getVoiceAmplitude());
        this.activeVoiceRaf = requestAnimationFrame(pump);
      };

      source.onended = finalize;
      source.start();
      if (onFrame) {
        this.activeVoiceRaf = requestAnimationFrame(pump);
      }
    });
  }
}

export const audioEngine = new AudioEngine();
