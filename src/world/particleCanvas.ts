import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  color: string;
}

interface AutumnLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
}

interface PopBubble {
  x: number;
  y: number;
  vy: number;
  wobblePhase: number;
  radius: number;
  hue: number;
  ambient: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'star' | 'candy' | 'bubble' | 'sparkle';
  rotation: number;
  spin: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const FIREFLY_COLORS = ['#ffe878', '#a9ff7a', '#ffd166', '#9cf6ff'];
const LEAF_COLORS = ['#ff8533', '#ffb347', '#e85d24', '#d44d5c'];
const BURST_DEFAULTS = ['#ffd166', '#ff6eb4', '#72efdd', '#b892ff', '#ff922b'];

export class ParticleCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly container: HTMLElement;
  private readonly cauldronAnchor: Element | null;

  private width = 1280;
  private height = 720;
  private dpr = 1;
  private rafId = 0;
  private lastTime = 0;
  private ambientBubbleTimer = 0;
  private pointerTrailCooldown = 0;

  private fireflies: Firefly[] = [];
  private leaves: AutumnLeaf[] = [];
  private bubbles: PopBubble[] = [];
  private bursts: BurstParticle[] = [];
  private shootingStars: ShootingStar[] = [];

  private readonly resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.ctx = context;
    this.cauldronAnchor = container.querySelector('#cauldron-anchor');

    this.resize();
    this.seedAmbient();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    eventBus.on('world:burst', (payload) => {
      this.spawnBurst(
        payload.x,
        payload.y,
        payload.colors ?? BURST_DEFAULTS,
        payload.count ?? 16,
        payload.shape ?? 'sparkle',
      );
    });

    eventBus.on('settings:changed', () => {
      this.seedAmbient();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(320, rect.width);
    this.height = Math.max(240, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private seedAmbient(): void {
    const reduced = gameState.get().reducedMotion;
    const fireflyCount = reduced ? 10 : 24;
    const leafCount = reduced ? 0 : 9;

    this.fireflies = Array.from({ length: fireflyCount }, (_, i) => ({
      x: Math.random() * this.width,
      y: this.height * (0.2 + Math.random() * 0.68),
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 18,
      radius: 2 + Math.random() * 2.5,
      phase: i * 0.7,
      color: FIREFLY_COLORS[i % FIREFLY_COLORS.length],
    }));

    this.leaves = Array.from({ length: leafCount }, (_, i) => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: 14 + Math.random() * 22,
      vy: 22 + Math.random() * 24,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.4,
      size: 6 + Math.random() * 5,
      color: LEAF_COLORS[i % LEAF_COLORS.length],
    }));
  }

  private getCauldronScreenPos(): { x: number; y: number } {
    if (this.cauldronAnchor) {
      const box = this.cauldronAnchor.getBoundingClientRect();
      if (box.width > 0 || box.height > 0) {
        return {
          x: box.left + box.width * 0.5,
          y: box.top + box.height * 0.5,
        };
      }
    }
    return { x: this.width * 0.7, y: this.height * 0.58 };
  }

  start(): void {
    if (this.rafId) return;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt, now * 0.001);
      this.render(now * 0.001);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  spawnBurst(
    x: number,
    y: number,
    colors = BURST_DEFAULTS,
    count = 16,
    shape: BurstParticle['shape'] = 'sparkle',
  ): void {
    const reduced = gameState.get().reducedMotion;
    const total = reduced ? Math.min(6, count) : count;
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 * i) / total + (Math.random() - 0.5) * 0.45;
      const speed = 75 + Math.random() * 165;
      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 65,
        size: 5 + Math.random() * 6,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.45,
        color: colors[i % colors.length],
        shape,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  spawnTrailSparkle(x: number, y: number): void {
    const now = performance.now();
    if (now - this.pointerTrailCooldown < 45 || gameState.get().reducedMotion) return;
    this.pointerTrailCooldown = now;
    this.bursts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 32,
      vy: -25 - Math.random() * 25,
      size: 4 + Math.random() * 3,
      life: 0,
      maxLife: 0.45,
      color: FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
      shape: 'sparkle',
      rotation: 0,
      spin: 3,
    });
  }

  spawnBubbleStorm(count = 12): void {
    const origin = this.getCauldronScreenPos();
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: origin.x + (Math.random() - 0.5) * 90,
        y: origin.y - Math.random() * 35,
        vy: -(48 + Math.random() * 44),
        wobblePhase: Math.random() * Math.PI * 2,
        radius: 18 + Math.random() * 14,
        hue: (i * 38 + Math.random() * 30) % 360,
        ambient: false,
      });
    }
  }

  spawnShootingStars(count = 5): void {
    for (let i = 0; i < count; i++) {
      const startX = this.width * (0.18 + Math.random() * 0.55);
      const startY = this.height * (0.04 + Math.random() * 0.18);
      this.shootingStars.push({
        x: startX,
        y: startY,
        vx: 260 + Math.random() * 160,
        vy: 95 + Math.random() * 65,
        life: -i * 0.25,
        maxLife: 1.05,
      });
    }
  }

  tryPopAt(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const hitRadius = bubble.radius + 24;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        this.bubbles.splice(i, 1);
        audioEngine.playBubblePop(Math.floor(Math.random() * 5));
        this.spawnBurst(
          bubble.x,
          bubble.y,
          [`hsl(${bubble.hue} 95% 72%)`, '#ffffff', '#ffd166'],
          12,
          'bubble',
        );
        gameState.addCandy(1, clientX, clientY, 'bubble-pop');
        return true;
      }
    }
    return false;
  }

  private update(dt: number, elapsed: number): void {
    const reduced = gameState.get().reducedMotion;

    // Fireflies
    for (const f of this.fireflies) {
      if (!reduced) {
        f.x += f.vx * dt + Math.sin(elapsed * 1.4 + f.phase) * 14 * dt;
        f.y += f.vy * dt + Math.cos(elapsed * 1.1 + f.phase) * 10 * dt;
      }
      if (f.x < -20) f.x = this.width + 20;
      if (f.x > this.width + 20) f.x = -20;
      if (f.y < this.height * 0.14) f.y = this.height * 0.85;
      if (f.y > this.height * 0.9) f.y = this.height * 0.2;
    }

    // Autumn leaves
    for (const leaf of this.leaves) {
      leaf.x += (leaf.vx + Math.sin(elapsed * 1.8 + leaf.angle) * 18) * dt;
      leaf.y += leaf.vy * dt;
      leaf.angle += leaf.spin * dt;
      if (leaf.x > this.width + 24 || leaf.y > this.height + 24) {
        leaf.x = Math.random() * this.width * 0.8;
        leaf.y = -20;
      }
    }

    // Continuous gentle cauldron bubbles
    this.ambientBubbleTimer += dt;
    const spawnInterval = reduced ? 2.5 : 1.1;
    if (this.ambientBubbleTimer >= spawnInterval && this.bubbles.length < 18) {
      this.ambientBubbleTimer = 0;
      const origin = this.getCauldronScreenPos();
      this.bubbles.push({
        x: origin.x + (Math.random() - 0.5) * 44,
        y: origin.y - 6,
        vy: -(34 + Math.random() * 24),
        wobblePhase: Math.random() * Math.PI * 2,
        radius: 13 + Math.random() * 11,
        hue: 85 + Math.random() * 210,
        ambient: true,
      });
    }

    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y += b.vy * dt;
      b.x += Math.sin(elapsed * 2.5 + b.wobblePhase) * 22 * dt;
      if (b.y < -50) {
        this.bubbles.splice(i, 1);
      }
    }

    // Update bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const p = this.bursts[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.bursts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 210 * dt;
      p.rotation += p.spin * dt;
    }

    // Update shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      star.life += dt;
      if (star.life < 0) continue;
      if (star.life >= star.maxLife) {
        this.shootingStars.splice(i, 1);
        continue;
      }
      star.x += star.vx * dt;
      star.y += star.vy * dt;
    }
  }

  private render(elapsed: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Shooting stars
    for (const star of this.shootingStars) {
      if (star.life < 0) continue;
      const alpha = Math.sin((star.life / star.maxLife) * Math.PI);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      const grad = ctx.createLinearGradient(star.x, star.y, star.x - 85, star.y - 30);
      grad.addColorStop(0, '#fff7ae');
      grad.addColorStop(1, 'rgba(255, 247, 174, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - 85, star.y - 30);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Fireflies
    for (const f of this.fireflies) {
      const pulse = 0.45 + 0.55 * Math.sin(elapsed * 2.6 + f.phase);
      ctx.save();
      ctx.globalAlpha = pulse * 0.85;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Autumn leaves
    for (const leaf of this.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.angle);
      ctx.fillStyle = leaf.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Poppable bubbles
    for (const b of this.bubbles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${b.hue}, 95%, 75%, ${b.ambient ? 0.24 : 0.34})`;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `hsla(${b.hue}, 100%, 88%, 0.85)`;
      ctx.stroke();

      // Glossy crescent highlight
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.32, b.y - b.radius * 0.32, b.radius * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      ctx.restore();
    }

    // Sparkle & confetti bursts
    for (const p of this.bursts) {
      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'bubble') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'candy') {
        ctx.fillRect(-p.size * 0.7, -p.size * 0.4, p.size * 1.4, p.size * 0.8);
      } else {
        // 4-point star sparkle
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
  }
}
