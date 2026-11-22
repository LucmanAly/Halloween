import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import type {
  CreatureId,
  CreatureInstance,
  MouthShape,
  VoiceCategory,
  VoiceLine,
  VoiceManifest,
} from './types.ts';

export interface BanterPair {
  pairId: string;
  a: VoiceLine;
  b: VoiceLine;
}

export class VoiceManager {
  private manifest: VoiceManifest | null = null;
  private loadPromise: Promise<VoiceManifest | null> | null = null;
  private readonly lastPicked = new Map<string, string>();
  private activeSpeaker: CreatureId | null = null;
  private speakSeq = 0;
  private activeCleanup: (() => void) | null = null;

  async load(): Promise<VoiceManifest | null> {
    if (this.manifest) return this.manifest;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const url = `${import.meta.env.BASE_URL}audio/voices/manifest.json`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const parsed = (await response.json()) as VoiceManifest;
        if (Array.isArray(parsed.lines)) {
          this.manifest = parsed;
          return parsed;
        }
      } catch {
        // Offline or missing manifest falls back gracefully.
      }
      return null;
    })();

    return this.loadPromise;
  }

  amplitudeToMouth(amp: number): MouthShape {
    if (amp < 0.045) return 'closed';
    if (amp < 0.16) return 'small';
    if (amp < 0.34) return 'open';
    return 'wide';
  }

  isSpeaking(): boolean {
    return this.activeSpeaker !== null;
  }

  getActiveSpeaker(): CreatureId | null {
    return this.activeSpeaker;
  }

  pickLine(creatureId: CreatureId, category: VoiceCategory): VoiceLine | null {
    if (!this.manifest) return null;
    const pool = this.manifest.lines.filter(
      (line) => line.creatureId === creatureId && line.category === category,
    );
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];

    const key = `${creatureId}:${category}`;
    const prevId = this.lastPicked.get(key);
    const candidates = prevId ? pool.filter((l) => l.id !== prevId) : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastPicked.set(key, chosen.id);
    return chosen;
  }

  getBanterPairs(): BanterPair[] {
    if (!this.manifest) return [];
    const byPair = new Map<string, { a?: VoiceLine; b?: VoiceLine }>();

    for (const line of this.manifest.lines) {
      if (!line.pairId) continue;
      const bucket = byPair.get(line.pairId) ?? {};
      if (line.category === 'banter_a') bucket.a = line;
      if (line.category === 'banter_b') bucket.b = line;
      byPair.set(line.pairId, bucket);
    }

    const pairs: BanterPair[] = [];
    for (const [pairId, entry] of byPair) {
      if (entry.a && entry.b) {
        pairs.push({ pairId, a: entry.a, b: entry.b });
      }
    }
    return pairs;
  }

  stopAll(): void {
    this.speakSeq += 1;
    audioEngine.stopVoice();
    const cleanup = this.activeCleanup;
    this.activeCleanup = null;
    cleanup?.();
    this.activeSpeaker = null;
  }

  async speakCategory(
    creature: CreatureInstance,
    category: VoiceCategory,
    options?: { bubbleColor?: string },
  ): Promise<boolean> {
    if (!this.manifest) {
      await this.load();
    }
    const line = this.pickLine(creature.config.id, category);
    if (!line) return false;
    return this.speakLine(line, creature, options);
  }

  async speakLine(
    line: VoiceLine,
    creature: CreatureInstance,
    options?: { bubbleColor?: string },
  ): Promise<boolean> {
    this.stopAll();
    const seq = ++this.speakSeq;

    const rect = creature.root.getBoundingClientRect();
    const bubbleX = rect.width > 0 ? rect.left + rect.width * 0.5 : window.innerWidth * 0.5;
    const bubbleY = rect.height > 0 ? rect.top - 8 : window.innerHeight * 0.45;

    this.activeSpeaker = creature.config.id;
    creature.root.classList.add('is-talking');

    let cleaned = false;
    let fallbackTimer = 0;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = 0;
      }
      creature.root.classList.remove('is-talking');
      creature.setMouth('smile');
      if (seq === this.speakSeq) {
        this.activeSpeaker = null;
      }
      if (this.activeCleanup === cleanup) {
        this.activeCleanup = null;
      }
    };
    this.activeCleanup = cleanup;

    eventBus.emit('creature:speak', {
      creatureId: creature.config.id,
      lineId: line.id,
      text: line.text,
    });

    eventBus.emit('world:speech', {
      emoji: line.emoji,
      text: line.text,
      x: bubbleX,
      y: bubbleY,
      color: options?.bubbleColor ?? creature.config.bubbleColor,
      durationMs: Math.max(2200, line.durationMs + 450),
    });

    const isMuted = gameState.get().audio.muted;
    const clipUrl = `${import.meta.env.BASE_URL}${line.file}`;

    try {
      if (!isMuted) {
        await audioEngine.playVoiceBuffer(clipUrl, (amp) => {
          if (seq !== this.speakSeq) return;
          creature.setMouth(this.amplitudeToMouth(amp));
        });
      } else {
        await this.runSilentLipSync(seq, line.durationMs, creature, (timerId) => {
          fallbackTimer = timerId;
        });
      }
    } catch {
      if (seq === this.speakSeq) {
        await this.runSilentLipSync(seq, line.durationMs, creature, (timerId) => {
          fallbackTimer = timerId;
        });
      }
    } finally {
      cleanup();
    }

    return seq === this.speakSeq;
  }

  private runSilentLipSync(
    seq: number,
    durationMs: number,
    creature: CreatureInstance,
    registerTimer: (id: number) => void,
  ): Promise<void> {
    const cadence: MouthShape[] = ['small', 'open', 'wide', 'small', 'closed', 'open'];
    const totalSteps = Math.max(4, Math.floor(durationMs / 130));
    let step = 0;

    return new Promise((resolve) => {
      const id = window.setInterval(() => {
        if (seq !== this.speakSeq || step >= totalSteps) {
          window.clearInterval(id);
          resolve();
          return;
        }
        creature.setMouth(cadence[step % cadence.length]);
        step += 1;
      }, 130);
      registerTimer(id);
    });
  }
}

export const voiceManager = new VoiceManager();
