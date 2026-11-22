import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { ParticleCanvas } from './particleCanvas.ts';
import { TOTAL_SECRETS } from './secretsCatalog.ts';

interface SecretReaction {
  emoji: string;
  text: string;
  color: string;
  burstColors: string[];
  shape: 'star' | 'candy' | 'bubble' | 'sparkle';
  playSfx: (el: Element) => void;
  extraClass?: { name: string; durationMs: number };
}

const FENCE_PHRASES = [
  'Ding! Spooky xylophone!',
  'Dong! Monster music!',
  'Boop! Keep tapping!',
  'Ping! Musical skeleton notes!',
  'Bong! Boo-Ville band!',
];

const REACTIONS: Record<string, SecretReaction> = {
  moon: {
    emoji: '🌙',
    text: '*Yaaawn!* Hehe, that tickles!',
    color: '#ffe680',
    burstColors: ['#fff6b0', '#ffd166', '#9cf6ff'],
    shape: 'star',
    playSfx: () => audioEngine.playMoonYawn(),
  },
  'window-left': {
    emoji: '🐈‍⬛',
    text: 'Meow-boo! Cozy black kitty!',
    color: '#9bffb0',
    burstColors: ['#8dff6b', '#ffe66d', '#ffffff'],
    shape: 'sparkle',
    playSfx: () => audioEngine.playWindowBoo(),
    extraClass: { name: 'is-peeking', durationMs: 2200 },
  },
  'window-right': {
    emoji: '👀',
    text: 'Peek-a-boo! Little ghost says hi!',
    color: '#9cf6ff',
    burstColors: ['#e4fff8', '#9cf6ff', '#d29bff'],
    shape: 'bubble',
    playSfx: () => audioEngine.playWindowBoo(),
    extraClass: { name: 'is-peeking', durationMs: 2200 },
  },
  'manor-door': {
    emoji: '🚪',
    text: "Knock knock! Who's inside?",
    color: '#ffb86b',
    burstColors: ['#ffb86b', '#ffd166', '#ff7eb6'],
    shape: 'candy',
    playSfx: () => audioEngine.playDoorKnock(),
  },
  'musical-fence': {
    emoji: '🎵',
    text: 'Boop! Musical fence note!',
    color: '#b892ff',
    burstColors: ['#ff7eb6', '#ffd166', '#6ef3b3', '#72d6ff'],
    shape: 'star',
    playSfx: (el) => {
      const idx = Number(el.getAttribute('data-note-index') ?? '0');
      audioEngine.playMarimbaNote(idx);
    },
  },
  cauldron: {
    emoji: '🧪',
    text: 'Bubble pop! Magic green brew!',
    color: '#a9ff5e',
    burstColors: ['#a9ff5e', '#7ef9ff', '#ffd166'],
    shape: 'bubble',
    playSfx: () => audioEngine.playCauldronSplash(),
  },
  lantern: {
    emoji: '🏮',
    text: 'Warm spooky lantern glow!',
    color: '#ffcf56',
    burstColors: ['#fff3b0', '#ff9f1c', '#ffd166'],
    shape: 'sparkle',
    playSfx: () => audioEngine.playSparkleChime(),
    extraClass: { name: 'is-swinging', durationMs: 1800 },
  },
  spider: {
    emoji: '🕷️',
    text: 'Hi friend! Happy Halloween!',
    color: '#ff9ee0',
    burstColors: ['#ff9ee0', '#d29bff', '#ffffff'],
    shape: 'sparkle',
    playSfx: () => audioEngine.playSpiderHi(),
    extraClass: { name: 'is-dropped', durationMs: 2300 },
  },
  'pumpkin-patch': {
    emoji: '🎃',
    text: 'Boing! Happy bouncy pumpkins!',
    color: '#ff9234',
    burstColors: ['#ff9234', '#ffd166', '#6ef3b3'],
    shape: 'candy',
    playSfx: () => audioEngine.playPumpkinBoing(),
  },
  'mystery-bushes': {
    emoji: '🌿',
    text: 'Hehe! Someone is hiding in there!',
    color: '#7ef9b0',
    burstColors: ['#8dff6b', '#ffe66d', '#7ef9b0'],
    shape: 'sparkle',
    playSfx: () => audioEngine.playBushGiggle(),
    extraClass: { name: 'is-peeking', durationMs: 2100 },
  },
  'tombstone-bonus': {
    emoji: '💀',
    text: 'Rattle rattle! Silly friendly skull!',
    color: '#d9c6ff',
    burstColors: ['#e5d7ff', '#72d6ff', '#ffd166'],
    shape: 'star',
    playSfx: () => audioEngine.playMarimbaNote(3),
    extraClass: { name: 'is-peeking', durationMs: 1900 },
  },
};

export class SecretsController {
  private readonly stage: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly particles: ParticleCanvas;
  private readonly candyCooldowns = new Map<string, number>();

  constructor(stage: HTMLElement, svg: SVGSVGElement, particles: ParticleCanvas) {
    this.stage = stage;
    this.svg = svg;
    this.particles = particles;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Allow popping floating canvas bubbles without blocking SVG secrets.
    this.stage.addEventListener('pointerdown', (e) => {
      const popped = this.particles.tryPopAt(e.clientX, e.clientY);
      if (!popped) {
        this.particles.spawnTrailSparkle(e.clientX, e.clientY);
      }
    });

    this.stage.addEventListener('pointermove', (e) => {
      if (e.buttons > 0 || e.pointerType === 'mouse') {
        this.particles.spawnTrailSparkle(e.clientX, e.clientY);
      }
    });

    const targets = this.svg.querySelectorAll<SVGGElement>('.secret-target');
    targets.forEach((target) => {
      target.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const popped = this.particles.tryPopAt(e.clientX, e.clientY);
        if (popped) return;
        this.activateTarget(target, e.clientX, e.clientY);
      });

      target.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const box = target.getBoundingClientRect();
          this.activateTarget(target, box.left + box.width * 0.5, box.top + box.height * 0.35);
        }
      });
    });

    this.syncDiscoveredMarkers();
    eventBus.on('state:reset', () => this.syncDiscoveredMarkers());
  }

  private syncDiscoveredMarkers(): void {
    const found = new Set(gameState.get().secretsFound);
    const targets = this.svg.querySelectorAll<SVGGElement>('.secret-target');
    targets.forEach((target) => {
      const id = target.getAttribute('data-secret-id') ?? '';
      target.classList.toggle('is-discovered', found.has(id));
    });
  }

  private activateTarget(target: SVGGElement, clientX: number, clientY: number): void {
    const secretId = target.getAttribute('data-secret-id') ?? '';
    const reaction = REACTIONS[secretId];
    if (!reaction) return;

    // Retrigger instant tactile bounce
    target.classList.remove('is-reacting');
    void target.getBoundingClientRect();
    target.classList.add('is-reacting');
    window.setTimeout(() => target.classList.remove('is-reacting'), 550);

    if (reaction.extraClass) {
      const { name, durationMs } = reaction.extraClass;
      target.classList.add(name);
      window.setTimeout(() => target.classList.remove(name), durationMs);
    }

    reaction.playSfx(target);
    this.particles.spawnBurst(clientX, clientY, reaction.burstColors, 16, reaction.shape);

    if (secretId === 'cauldron') {
      this.particles.spawnBubbleStorm(5);
    }

    let speechText = reaction.text;
    if (secretId === 'musical-fence') {
      const idx = Number(target.getAttribute('data-note-index') ?? '0');
      speechText = FENCE_PHRASES[idx % FENCE_PHRASES.length];
    }

    eventBus.emit('world:speech', {
      emoji: reaction.emoji,
      text: speechText,
      x: clientX,
      y: clientY - 26,
      color: reaction.color,
      durationMs: 2200,
    });

    if (secretId !== 'tombstone-bonus') {
      const isNew = gameState.discoverSecret(secretId, speechText, clientX, clientY);
      if (isNew) {
        this.syncDiscoveredMarkers();
        gameState.addCandy(5, clientX, clientY, `secret:${secretId}`);
        if (gameState.get().secretsFound.length === TOTAL_SECRETS) {
          this.celebrateAllSecrets();
        }
        return;
      }
    }

    const now = performance.now();
    const lastCandyAt = this.candyCooldowns.get(secretId) ?? 0;
    if (now - lastCandyAt >= 900) {
      this.candyCooldowns.set(secretId, now);
      gameState.addCandy(1, clientX, clientY, `tap:${secretId}`);
    }
  }

  private celebrateAllSecrets(): void {
    const rect = this.stage.getBoundingClientRect();
    audioEngine.playFanfare();

    [0.25, 0.5, 0.75].forEach((ratio, idx) => {
      window.setTimeout(() => {
        this.particles.spawnBurst(
          rect.left + rect.width * ratio,
          rect.top + rect.height * 0.32,
          ['#ffd166', '#ff6eb4', '#72efdd', '#b892ff', '#ff922b'],
          28,
          'star',
        );
      }, idx * 180);
    });

    eventBus.emit('world:speech', {
      emoji: '🏆',
      text: 'Yay! You found all 10 Boo-Ville Secrets!',
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.28,
      color: '#ffd166',
      durationMs: 4200,
    });
  }
}
