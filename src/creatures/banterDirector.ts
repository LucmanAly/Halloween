import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { ParticleCanvas } from '../world/particleCanvas.ts';
import { CREATURE_ROSTER } from './creatureRoster.ts';
import { createCreatureRig } from './creatureRig.ts';
import type { CreatureId, CreatureInstance } from './types.ts';
import { VoiceManager } from './voiceManager.ts';

interface MotionState {
  instance: CreatureInstance;
  x: number;
  y: number;
  facing: 1 | -1;
  targetX: number;
  targetY: number;
  mode: 'idle' | 'moving';
  waitSec: number;
  pausedUntil: number;
  speed: number;
}

const TAP_SFX: Record<CreatureId, () => void> = {
  pip: () => audioEngine.playPumpkinBoing(),
  boobell: () => audioEngine.playWindowBoo(),
  winnie: () => audioEngine.playCauldronSplash(),
  barnaby: () => audioEngine.playBoneRattle(),
  frankie: () => audioEngine.playMonsterStomp(),
  bitey: () => audioEngine.playBatSqueak(),
};

const WORLD_EVENT_SPEAKERS: Record<string, CreatureId[]> = {
  'bubble-storm': ['winnie', 'boobell'],
  'candy-cart': ['frankie', 'pip'],
  'shooting-stars': ['boobell', 'pip'],
  'bat-flock': ['bitey', 'barnaby'],
};

export class BanterDirector {
  private readonly stage: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly stageLayer: SVGGElement;
  private readonly particles: ParticleCanvas;
  private readonly voiceManager: VoiceManager;

  private readonly actors = new Map<CreatureId, MotionState>();
  private readonly candyCooldowns = new Map<CreatureId, number>();

  private rafId = 0;
  private lastFrameMs = 0;
  private started = false;
  private banterTimer = 0;
  private banterSeq = 0;
  private lastBanterPairId = '';
  private lastUserInteractionAt = 0;
  private lastOrderKey = '';

  constructor(
    stage: HTMLElement,
    svg: SVGSVGElement,
    particles: ParticleCanvas,
    voiceManager: VoiceManager,
  ) {
    this.stage = stage;
    this.svg = svg;
    this.particles = particles;
    this.voiceManager = voiceManager;

    const layer = svg.querySelector<SVGGElement>('#creature-stage-layer');
    if (!layer) {
      throw new Error('Missing #creature-stage-layer inside courtyard SVG');
    }
    this.stageLayer = layer;

    this.mountCreatures();
    this.bindStageListeners();
  }

  private mountCreatures(): void {
    for (const config of CREATURE_ROSTER) {
      const instance = createCreatureRig(config);
      this.stageLayer.appendChild(instance.root);

      const speed = config.locomotion === 'fly' ? 115 : config.locomotion === 'float' ? 68 : 54;
      const actor: MotionState = {
        instance,
        x: config.homeX,
        y: config.homeY,
        facing: config.homeX > 800 ? -1 : 1,
        targetX: config.homeX,
        targetY: config.homeY,
        mode: 'idle',
        waitSec: 1.5 + Math.random() * 2.5,
        pausedUntil: 0,
        speed,
      };
      instance.setPosition(actor.x, actor.y, actor.facing);
      this.actors.set(config.id, actor);

      const interactive = instance.root.querySelector<SVGGElement>('.creature-interactive');
      interactive?.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.particles.tryPopAt(e.clientX, e.clientY)) return;
        this.onCreatureActivated(config.id, e.clientX, e.clientY);
      });

      interactive?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const box = instance.root.getBoundingClientRect();
          this.onCreatureActivated(
            config.id,
            box.left + box.width * 0.5,
            box.top + box.height * 0.4,
          );
        }
      });
    }

    this.sortStageDepth();
  }

  private bindStageListeners(): void {
    this.stage.addEventListener('pointerdown', () => {
      this.lastUserInteractionAt = performance.now();
    });

    this.stage.addEventListener('pointermove', (e) => {
      const pt = this.clientToSvg(e.clientX, e.clientY);
      if (!pt) return;
      for (const actor of this.actors.values()) {
        actor.instance.lookAt(pt.x, pt.y);
      }
    });

    eventBus.on('world:event', ({ type }) => {
      window.setTimeout(() => {
        if (!this.started || document.hidden || this.voiceManager.isSpeaking()) return;
        const pool = WORLD_EVENT_SPEAKERS[type] ?? ['pip'];
        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        const actor = this.actors.get(chosenId);
        if (!actor) return;
        actor.pausedUntil = performance.now() + 2600;
        actor.instance.playTapGag();
        void this.voiceManager.speakCategory(actor.instance, 'world_react');
      }, 550);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.voiceManager.stopAll();
      } else {
        this.lastFrameMs = performance.now();
      }
    });
  }

  private clientToSvg(clientX: number, clientY: number): { x: number; y: number } | null {
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return null;
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const mapped = pt.matrixTransform(ctm.inverse());
    return { x: mapped.x, y: mapped.y };
  }

  private onCreatureActivated(id: CreatureId, clientX: number, clientY: number): void {
    const actor = this.actors.get(id);
    if (!actor) return;

    const now = performance.now();
    this.lastUserInteractionAt = now;
    this.banterSeq += 1;

    // Pause creature and face toward interaction / center
    actor.mode = 'idle';
    actor.pausedUntil = now + 2800;
    actor.instance.root.classList.remove('is-walking');
    const svgPt = this.clientToSvg(clientX, clientY);
    if (svgPt && Math.abs(svgPt.x - actor.x) > 8) {
      actor.facing = svgPt.x >= actor.x ? 1 : -1;
      actor.instance.setPosition(actor.x, actor.y, actor.facing);
    }

    actor.instance.playTapGag();
    TAP_SFX[id]();

    this.particles.spawnBurst(
      clientX,
      clientY,
      [actor.instance.config.bubbleColor, '#ffd166', '#ffffff', '#ff7eb6'],
      16,
      'star',
    );

    const lastCandy = this.candyCooldowns.get(id) ?? 0;
    if (now - lastCandy >= 1100) {
      this.candyCooldowns.set(id, now);
      gameState.addCandy(2, clientX, clientY, `creature:${id}`);
    }

    void this.voiceManager.speakCategory(actor.instance, 'tap_gag');
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lastFrameMs = performance.now();

    const step = (now: number) => {
      if (!this.started) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
      this.lastFrameMs = now;
      if (!document.hidden) {
        this.updateMotion(dt, now);
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);

    this.scheduleBanter(14000);
  }

  stop(): void {
    this.started = false;
    this.banterSeq += 1;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    window.clearTimeout(this.banterTimer);
    this.voiceManager.stopAll();
  }

  greetOnEnter(): void {
    window.setTimeout(() => {
      if (!this.started) return;
      const pip = this.actors.get('pip');
      if (!pip) return;
      pip.pausedUntil = performance.now() + 3400;
      pip.instance.playTapGag();
      const box = pip.instance.root.getBoundingClientRect();
      this.particles.spawnBurst(
        box.left + box.width * 0.5,
        box.top + box.height * 0.4,
        ['#ffd166', '#ff9234', '#6ef3b3'],
        18,
        'star',
      );
      void this.voiceManager.speakCategory(pip.instance, 'greeting');
    }, 650);
  }

  private scheduleBanter(delayMs: number): void {
    window.clearTimeout(this.banterTimer);
    this.banterTimer = window.setTimeout(async () => {
      if (!this.started) return;
      await this.tryRunBanter();
      this.scheduleBanter(20000 + Math.random() * 10000);
    }, delayMs);
  }

  private async tryRunBanter(): Promise<void> {
    if (
      document.hidden ||
      this.voiceManager.isSpeaking() ||
      performance.now() - this.lastUserInteractionAt < 6000
    ) {
      return;
    }

    const pairs = this.voiceManager.getBanterPairs();
    if (pairs.length === 0) return;

    const candidates = pairs.length > 1
      ? pairs.filter((p) => p.pairId !== this.lastBanterPairId)
      : pairs;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const actorA = this.actors.get(chosen.a.creatureId);
    const actorB = this.actors.get(chosen.b.creatureId);
    if (!actorA || !actorB) return;

    this.lastBanterPairId = chosen.pairId;
    const seq = ++this.banterSeq;
    const pauseUntil = performance.now() + chosen.a.durationMs + chosen.b.durationMs + 2500;

    actorA.mode = 'idle';
    actorB.mode = 'idle';
    actorA.pausedUntil = pauseUntil;
    actorB.pausedUntil = pauseUntil;
    actorA.instance.root.classList.remove('is-walking');
    actorB.instance.root.classList.remove('is-walking');

    // Face each other!
    actorA.facing = actorB.x >= actorA.x ? 1 : -1;
    actorB.facing = actorA.x >= actorB.x ? 1 : -1;
    actorA.instance.setPosition(actorA.x, actorA.y, actorA.facing);
    actorB.instance.setPosition(actorB.x, actorB.y, actorB.facing);

    const okA = await this.voiceManager.speakLine(chosen.a, actorA.instance);
    if (!okA || seq !== this.banterSeq) return;

    await new Promise((r) => window.setTimeout(r, 350));
    if (seq !== this.banterSeq || document.hidden) return;

    actorB.instance.playTapGag();
    await this.voiceManager.speakLine(chosen.b, actorB.instance);
  }

  private updateMotion(dt: number, now: number): void {
    const reduced = gameState.get().reducedMotion;
    if (reduced) {
      for (const actor of this.actors.values()) {
        actor.instance.root.classList.remove('is-walking');
      }
      return;
    }

    const walkers: MotionState[] = [];
    for (const actor of this.actors.values()) {
      if (actor.instance.config.locomotion === 'walk') {
        walkers.push(actor);
      }

      if (now < actor.pausedUntil) {
        actor.instance.root.classList.remove('is-walking');
        continue;
      }

      if (actor.mode === 'idle') {
        actor.instance.root.classList.remove('is-walking');
        actor.waitSec -= dt;
        if (actor.waitSec <= 0) {
          const b = actor.instance.config.bounds;
          actor.targetX = b.minX + Math.random() * (b.maxX - b.minX);
          actor.targetY = b.minY + Math.random() * (b.maxY - b.minY);
          actor.mode = 'moving';
        }
      } else {
        const dx = actor.targetX - actor.x;
        const dy = actor.targetY - actor.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 10) {
          actor.mode = 'idle';
          actor.waitSec = 2.6 + Math.random() * 3.8;
          actor.instance.root.classList.remove('is-walking');
        } else {
          const stepDist = Math.min(dist, actor.speed * dt);
          actor.x += (dx / dist) * stepDist;
          actor.y += (dy / dist) * stepDist;
          if (Math.abs(dx) > 4) {
            actor.facing = dx >= 0 ? 1 : -1;
          }
          if (actor.instance.config.locomotion === 'walk') {
            actor.instance.root.classList.add('is-walking');
          }
        }
      }
    }

    // Gentle walker separation so ground characters do not pile up
    for (let i = 0; i < walkers.length; i++) {
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i];
        const b = walkers[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = 92;
        if (dist < minDist) {
          const push = ((minDist - dist) / minDist) * 32 * dt;
          const nx = dx / dist;
          const ba = a.instance.config.bounds;
          const bb = b.instance.config.bounds;
          a.x = Math.max(ba.minX, Math.min(ba.maxX, a.x - nx * push));
          b.x = Math.max(bb.minX, Math.min(bb.maxX, b.x + nx * push));
        }
      }
    }

    for (const actor of this.actors.values()) {
      actor.instance.setPosition(actor.x, actor.y, actor.facing);
    }

    this.sortStageDepth();
  }

  private sortStageDepth(): void {
    const ordered = Array.from(this.actors.values()).sort((a, b) => a.y - b.y);
    const key = ordered.map((a) => a.instance.config.id).join(',');
    if (key === this.lastOrderKey) return;
    this.lastOrderKey = key;
    for (const actor of ordered) {
      this.stageLayer.appendChild(actor.instance.root);
    }
  }
}
