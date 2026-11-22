import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { ParticleCanvas } from './particleCanvas.ts';

type WorldEventType = 'bubble-storm' | 'candy-cart' | 'shooting-stars' | 'bat-flock';

const EVENT_ROTATION: WorldEventType[] = [
  'bubble-storm',
  'candy-cart',
  'shooting-stars',
  'bat-flock',
];

export class WorldEventsDirector {
  private readonly svg: SVGSVGElement;
  private readonly particles: ParticleCanvas;
  private readonly candyCart: SVGGElement | null;
  private readonly batFlock: SVGGElement | null;

  private timerId: number | null = null;
  private eventIndex = 0;
  private cartTapsRemaining = 0;
  private started = false;
  private lastManualTrigger = 0;

  constructor(svg: SVGSVGElement, particles: ParticleCanvas) {
    this.svg = svg;
    this.particles = particles;
    this.candyCart = svg.querySelector('#candy-cart-group');
    this.batFlock = svg.querySelector('#bat-flock-group');

    this.bindCandyCart();
  }

  private bindCandyCart(): void {
    if (!this.candyCart) return;
    this.candyCart.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this.cartTapsRemaining <= 0) return;
      this.cartTapsRemaining -= 1;

      audioEngine.playCandyCollect();
      this.particles.spawnBurst(
        e.clientX,
        e.clientY,
        ['#ffd166', '#ff6eb4', '#63e6be', '#ffa94d'],
        20,
        'candy',
      );
      gameState.addCandy(5, e.clientX, e.clientY, 'candy-cart');
      eventBus.emit('world:speech', {
        emoji: '🍬',
        text: 'Sweet! +5 Magic Candy!',
        x: e.clientX,
        y: e.clientY - 30,
        color: '#ffb84d',
        durationMs: 2100,
      });
    });
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.scheduleNext(8000);
  }

  stop(): void {
    this.started = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (this.timerId !== null) window.clearTimeout(this.timerId);
    this.timerId = window.setTimeout(() => {
      if (!this.started) return;
      this.triggerNext();
      const nextDelay = 18000 + Math.random() * 8000;
      this.scheduleNext(nextDelay);
    }, delayMs);
  }

  triggerRandomOrNext(): boolean {
    const now = performance.now();
    if (now - this.lastManualTrigger < 1400) return false;
    this.lastManualTrigger = now;
    this.triggerNext();
    if (this.started) {
      this.scheduleNext(20000);
    }
    return true;
  }

  triggerNext(): void {
    const type = EVENT_ROTATION[this.eventIndex % EVENT_ROTATION.length];
    this.eventIndex += 1;
    this.runEvent(type);
  }

  runEvent(type: WorldEventType): void {
    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const upperY = rect.top + rect.height * 0.24;

    eventBus.emit('world:event', { type });

    switch (type) {
      case 'bubble-storm': {
        audioEngine.playCauldronSplash();
        this.particles.spawnBubbleStorm(12);
        eventBus.emit('world:speech', {
          emoji: '🫧',
          text: 'Bubble Storm! Tap to pop!',
          x: rect.left + rect.width * 0.68,
          y: rect.top + rect.height * 0.45,
          color: '#7ef9ff',
          durationMs: 3200,
        });
        break;
      }

      case 'candy-cart': {
        if (!this.candyCart) break;
        this.cartTapsRemaining = 3;
        this.candyCart.classList.remove('is-rolling');
        void this.candyCart.getBoundingClientRect();
        this.candyCart.classList.add('is-rolling');
        audioEngine.playCandyCollect();
        eventBus.emit('world:speech', {
          emoji: '🛒',
          text: 'Catch the Runaway Candy Cart!',
          x: centerX,
          y: rect.top + rect.height * 0.72,
          color: '#ffd166',
          durationMs: 3600,
        });
        window.setTimeout(() => {
          this.candyCart?.classList.remove('is-rolling');
          this.cartTapsRemaining = 0;
        }, 7200);
        break;
      }

      case 'shooting-stars': {
        audioEngine.playSparkleChime();
        this.particles.spawnShootingStars(5);
        eventBus.emit('world:speech', {
          emoji: '🌠',
          text: 'Shooting stars! Make a wish!',
          x: centerX,
          y: upperY,
          color: '#ffe878',
          durationMs: 3200,
        });
        break;
      }

      case 'bat-flock': {
        if (!this.batFlock) break;
        audioEngine.playBatSqueak();
        this.batFlock.classList.remove('is-flying');
        void this.batFlock.getBoundingClientRect();
        this.batFlock.classList.add('is-flying');
        eventBus.emit('world:speech', {
          emoji: '🦇',
          text: 'Whoosh! Silly bats across the moon!',
          x: rect.left + rect.width * 0.35,
          y: upperY,
          color: '#d29bff',
          durationMs: 3000,
        });
        window.setTimeout(() => {
          this.batFlock?.classList.remove('is-flying');
        }, 5400);
        break;
      }
    }
  }
}
