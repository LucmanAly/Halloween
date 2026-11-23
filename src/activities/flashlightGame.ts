import { audioEngine } from '../core/audioEngine.ts';
import { gameState } from '../core/state.ts';
import { CREATURE_ROSTER } from '../creatures/creatureRoster.ts';
import type { CreatureId } from '../creatures/types.ts';
import type { ActivityController, ActivityDeps } from './types.ts';

interface HidingSpot {
  id: CreatureId;
  x: number;
  y: number;
  centerOffsetY: number;
  facing: 1 | -1;
}

// Hiding positions aligned 1:1 with each creature's pre-generated hint_1 clip
const HIDING_SPOTS: readonly HidingSpot[] = [
  { id: 'pip', x: 330, y: 755, centerOffsetY: -48, facing: 1 },
  { id: 'boobell', x: 600, y: 185, centerOffsetY: -6, facing: 1 },
  { id: 'winnie', x: 1120, y: 610, centerOffsetY: -62, facing: -1 },
  { id: 'barnaby', x: 775, y: 615, centerOffsetY: -54, facing: 1 },
  { id: 'frankie', x: 1315, y: 760, centerOffsetY: -64, facing: -1 },
  { id: 'bitey', x: 1305, y: 295, centerOffsetY: 0, facing: -1 },
];

export class FlashlightGame implements ActivityController {
  readonly id = 'flashlight' as const;
  private readonly deps: ActivityDeps;
  private readonly onRequestClose: () => void;

  private openState = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private pillBarEl: HTMLElement | null = null;
  private summaryEl: HTMLElement | null = null;

  private width = 1280;
  private height = 720;
  private dpr = 1;
  private beamX = 640;
  private beamY = 360;
  private beamRadius = 150;
  private rafId = 0;
  private lastFrameMs = 0;
  private lastPingAt = 0;

  private targets: CreatureId[] = [];
  private found = new Set<CreatureId>();
  private activeHintTarget: CreatureId | null = null;
  private spots = new Map<CreatureId, { svgX: number; svgY: number; centerOffsetY: number }>();
  private dwellSec = new Map<CreatureId, number>();
  private pressedKeys = new Set<string>();
  private roundComplete = false;
  private hintTimer = 0;
  private timers: number[] = [];

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (!this.openState || this.roundComplete) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
      this.pressedKeys.add(e.key);
    }
  };
  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.pressedKeys.delete(e.key);
  };

  constructor(deps: ActivityDeps, onRequestClose: () => void) {
    this.deps = deps;
    this.onRequestClose = onRequestClose;
  }

  isOpen(): boolean {
    return this.openState;
  }

  open(): void {
    if (this.openState) return;
    this.openState = true;
    this.deps.worldEvents.setPaused(true);
    this.deps.banterDirector.setActivityMode(true);
    audioEngine.playFlashlightClick();

    this.setupStageCanvas();
    this.startNewRound();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers = [];
    window.clearTimeout(this.hintTimer);
    this.hintTimer = 0;
    this.pressedKeys.clear();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.deps.stageFxLayer.classList.remove('is-interactive');
    this.deps.stageFxLayer.innerHTML = '';
    this.deps.activityLayer.innerHTML = '';
    this.ctx = null;
    this.pillBarEl = null;
    this.summaryEl = null;

    this.deps.voiceManager.stopAll();
    this.deps.banterDirector.restoreAllCreatures();
    this.deps.banterDirector.setActivityMode(false);
    this.deps.worldEvents.setPaused(false);
  }

  private setupStageCanvas(): void {
    this.deps.stageFxLayer.innerHTML = '';
    this.deps.stageFxLayer.classList.add('is-interactive');

    const canvas = document.createElement('canvas');
    canvas.className = 'flashlight-canvas';
    canvas.setAttribute('aria-label', 'Move your flashlight beam across the courtyard to find hiding friends');
    this.deps.stageFxLayer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to acquire flashlight canvas 2D context');
    this.ctx = ctx;

    const resize = () => {
      const rect = this.deps.stage.getBoundingClientRect();
      this.width = Math.max(320, rect.width);
      this.height = Math.max(240, rect.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.beamX = Math.max(40, Math.min(this.width - 40, this.beamX));
      this.beamY = Math.max(40, Math.min(this.height - 40, this.beamY));
      if (this.openState && !this.roundComplete && this.targets.length > 0) {
        this.clampTargetsToVisibleBounds();
      }
    };

    resize();
    this.beamX = this.width * 0.5;
    this.beamY = this.height * 0.45;
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(this.deps.stage);

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      this.beamX = clientX - rect.left;
      this.beamY = clientY - rect.top;
    };

    canvas.addEventListener('pointerdown', (e) => {
      updatePointer(e.clientX, e.clientY);
      this.tryQuickRevealNearest();
    });
    canvas.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);
    });
  }

  private getBottomClearancePx(): number {
    const barHeight = this.pillBarEl?.getBoundingClientRect().height ?? 84;
    return Math.max(96, barHeight + 34);
  }

  private clampTargetsToVisibleBounds(): void {
    const vis = this.deps.banterDirector.getVisibleSvgBounds(this.getBottomClearancePx());
    for (const spot of HIDING_SPOTS) {
      const record = this.spots.get(spot.id);
      if (!record) continue;
      const clampedX = Math.max(vis.minX + 65, Math.min(vis.maxX - 65, spot.x));
      const clampedY = Math.max(vis.minY + 70, Math.min(vis.maxY - 55, spot.y));
      record.svgX = clampedX;
      record.svgY = clampedY;
      this.deps.banterDirector.placeCreature(spot.id, clampedX, clampedY, spot.facing);
    }
  }

  private startNewRound(): void {
    this.roundComplete = false;
    this.found.clear();
    this.dwellSec.clear();
    this.spots.clear();
    window.clearTimeout(this.hintTimer);
    this.hintTimer = 0;
    this.summaryEl?.remove();
    this.summaryEl = null;

    const ageMode = gameState.get().ageMode;
    this.beamRadius = ageMode === 'easy' ? 155 : 115;

    const shuffled = [...HIDING_SPOTS].sort(() => Math.random() - 0.5);
    const chosenSpots = ageMode === 'easy' ? shuffled.slice(0, 4) : shuffled;
    this.targets = chosenSpots.map((s) => s.id);

    const vis = this.deps.banterDirector.getVisibleSvgBounds(this.getBottomClearancePx());
    const chosenSet = new Set(this.targets);

    for (const spot of HIDING_SPOTS) {
      if (!chosenSet.has(spot.id)) {
        this.deps.banterDirector.setCreatureVisible(spot.id, false);
        continue;
      }
      const clampedX = Math.max(vis.minX + 65, Math.min(vis.maxX - 65, spot.x));
      const clampedY = Math.max(vis.minY + 70, Math.min(vis.maxY - 55, spot.y));
      this.deps.banterDirector.placeCreature(spot.id, clampedX, clampedY, spot.facing);
      this.deps.banterDirector.setCreatureHiding(spot.id, true);
      this.spots.set(spot.id, {
        svgX: clampedX,
        svgY: clampedY,
        centerOffsetY: spot.centerOffsetY,
      });
    }

    this.activeHintTarget = this.targets[0] ?? null;
    this.renderControlBar();
    // Re-clamp with exact rendered bar height in case chips wrapped onto 2 lines
    this.clampTargetsToVisibleBounds();
    this.speakCurrentHint();
  }

  private syncControlBarChips(): void {
    this.pillBarEl?.querySelectorAll<HTMLElement>('[data-seek-id]').forEach((chip) => {
      const id = chip.dataset.seekId as CreatureId | undefined;
      if (!id) return;
      const cfg = CREATURE_ROSTER.find((c) => c.id === id);
      const isFound = this.found.has(id);
      chip.classList.toggle('is-found', isFound);
      chip.textContent = `${isFound ? '✅' : '👀'} ${cfg?.name ?? id}`;
    });
  }

  private renderControlBar(): void {
    this.deps.activityLayer.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'activity-pill-bar';
    this.pillBarEl = bar;

    const chipsHtml = this.targets
      .map((id) => {
        const cfg = CREATURE_ROSTER.find((c) => c.id === id);
        const isFound = this.found.has(id);
        return `<span class="seek-chip ${isFound ? 'is-found' : ''}" data-seek-id="${id}">${
          isFound ? '✅' : '👀'
        } ${cfg?.name ?? id}</span>`;
      })
      .join('');

    bar.innerHTML = `
      <span id="flashlight-temp" class="hotcold-pill" data-temp="cold">❄️ Cold</span>
      <div class="seek-chips">${chipsHtml}</div>
      <button type="button" class="kid-secondary-btn" id="flashlight-hint-btn">🔊 Hear Hint</button>
      <button type="button" class="kid-secondary-btn" id="flashlight-exit-btn">✕ Done</button>
    `;

    this.deps.activityLayer.appendChild(bar);
    bar.querySelector('#flashlight-hint-btn')?.addEventListener('click', () => {
      this.speakCurrentHint();
    });
    bar.querySelector('#flashlight-exit-btn')?.addEventListener('click', () => {
      this.onRequestClose();
    });
  }

  private speakCurrentHint(): void {
    const nextId = this.targets.find((id) => !this.found.has(id));
    if (!nextId) return;
    this.activeHintTarget = nextId;
    const cfg = CREATURE_ROSTER.find((c) => c.id === nextId);
    void this.deps.voiceManager.speakLineById(nextId, 'hint_1', null, {
      bubblePos: { x: window.innerWidth * 0.5, y: 128 },
      bubbleColor: cfg?.bubbleColor ?? '#ffd166',
    });
  }

  private svgToStagePixel(svgX: number, svgY: number): { x: number; y: number } | null {
    const ctm = this.deps.svg.getScreenCTM();
    if (!ctm) return null;
    const pt = this.deps.svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    const screenPt = pt.matrixTransform(ctm);
    const stageRect = this.deps.stage.getBoundingClientRect();
    return {
      x: screenPt.x - stageRect.left,
      y: screenPt.y - stageRect.top,
    };
  }

  private tryQuickRevealNearest(): void {
    if (this.roundComplete) return;
    for (const id of this.targets) {
      if (this.found.has(id)) continue;
      const spot = this.spots.get(id);
      if (!spot) continue;
      const px = this.svgToStagePixel(spot.svgX, spot.svgY + spot.centerOffsetY);
      if (!px) continue;
      if (Math.hypot(this.beamX - px.x, this.beamY - px.y) <= this.beamRadius * 0.85) {
        this.revealCreature(id, px.x, px.y);
        return;
      }
    }
  }

  private revealCreature(id: CreatureId, stageX: number, stageY: number): void {
    if (this.found.has(id)) return;
    this.found.add(id);
    this.dwellSec.delete(id);

    const creature = this.deps.banterDirector.getCreature(id);
    this.deps.banterDirector.setCreatureHiding(id, false);
    if (creature) {
      creature.root.classList.add('is-found-pop');
      creature.playTapGag();
    }

    const stageRect = this.deps.stage.getBoundingClientRect();
    const clientX = stageRect.left + stageX;
    const clientY = stageRect.top + stageY;
    audioEngine.playSparkleChime();
    this.deps.particles.spawnBurst(
      clientX,
      clientY,
      [creature?.config.bubbleColor ?? '#ffd166', '#ffffff', '#6ef3b3'],
      22,
      'star',
    );
    gameState.addCandy(5, clientX, clientY, `flashlight:${id}`);

    if (creature) {
      void this.deps.voiceManager.speakCategory(creature, 'greeting');
    }

    this.syncControlBarChips();

    if (this.found.size >= this.targets.length) {
      this.finishRound();
    } else {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = window.setTimeout(() => {
        if (this.openState && !this.roundComplete) {
          this.speakCurrentHint();
        }
      }, 2300);
    }
  }

  private finishRound(): void {
    this.roundComplete = true;
    window.clearTimeout(this.hintTimer);
    this.hintTimer = 0;
    audioEngine.playFanfare();
    const stageRect = this.deps.stage.getBoundingClientRect();
    const cx = stageRect.left + this.width * 0.5;
    const cy = stageRect.top + this.height * 0.4;
    gameState.addCandy(10, cx, cy, 'flashlight:round-clear');

    [0.25, 0.5, 0.75].forEach((r, idx) => {
      this.timers.push(
        window.setTimeout(() => {
          this.deps.particles.spawnBurst(
            stageRect.left + this.width * r,
            cy,
            ['#ffd166', '#ff7eb6', '#6ef3b3', '#7ef9ff'],
            24,
            'star',
          );
        }, idx * 180),
      );
    });

    const backdrop = document.createElement('div');
    backdrop.className = 'activity-backdrop';
    backdrop.innerHTML = `
      <section class="activity-card" role="dialog" aria-modal="true" aria-labelledby="seek-win-title">
        <div class="round-summary">
          <div class="round-summary-emoji" aria-hidden="true">🔦✨</div>
          <h2 id="seek-win-title" class="activity-title">You Found Everyone!</h2>
          <p class="activity-subtitle">All ${this.targets.length} spooky friends popped out! Bonus +10 Magic Candy!</p>
          <div class="round-summary-actions">
            <button type="button" class="kid-action-btn" id="seek-again-btn">🔦 Play Again!</button>
            <button type="button" class="kid-secondary-btn" id="seek-home-btn">🏡 Back to Courtyard</button>
          </div>
        </div>
      </section>
    `;
    this.summaryEl = backdrop;
    this.deps.activityLayer.appendChild(backdrop);

    backdrop.querySelector('#seek-again-btn')?.addEventListener('click', () => {
      audioEngine.playFlashlightClick();
      this.startNewRound();
    });
    backdrop.querySelector('#seek-home-btn')?.addEventListener('click', () => {
      this.onRequestClose();
    });
    backdrop.querySelector<HTMLButtonElement>('#seek-again-btn')?.focus();
  }

  private loop(now: number): void {
    if (!this.openState) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;

    if (!this.roundComplete) {
      // Keyboard beam steering (Arrow keys / WASD)
      const moveSpeed = 420;
      let vx = 0;
      let vy = 0;
      if (this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('a') || this.pressedKeys.has('A')) vx -= 1;
      if (this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('d') || this.pressedKeys.has('D')) vx += 1;
      if (this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('w') || this.pressedKeys.has('W')) vy -= 1;
      if (this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('s') || this.pressedKeys.has('S')) vy += 1;
      if (vx !== 0 || vy !== 0) {
        this.beamX = Math.max(30, Math.min(this.width - 30, this.beamX + vx * moveSpeed * dt));
        this.beamY = Math.max(30, Math.min(this.height - 30, this.beamY + vy * moveSpeed * dt));
      }

      this.updateProximityAndDwell(dt, now);
    }

    this.renderSpotlight();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private updateProximityAndDwell(dt: number, now: number): void {
    let minDist = Infinity;
    let illuminatedTarget: { id: CreatureId; x: number; y: number; progress: number } | null = null;

    for (const id of this.targets) {
      if (this.found.has(id)) continue;
      const spot = this.spots.get(id);
      if (!spot) continue;
      const px = this.svgToStagePixel(spot.svgX, spot.svgY + spot.centerOffsetY);
      if (!px) continue;

      const dist = Math.hypot(this.beamX - px.x, this.beamY - px.y);
      if (dist < minDist) {
        minDist = dist;
      }

      if (dist <= this.beamRadius * 0.72) {
        const nextDwell = (this.dwellSec.get(id) ?? 0) + dt;
        this.dwellSec.set(id, nextDwell);
        illuminatedTarget = { id, x: px.x, y: px.y, progress: Math.min(1, nextDwell / 0.42) };
        if (nextDwell >= 0.42) {
          this.revealCreature(id, px.x, px.y);
          return;
        }
      } else {
        this.dwellSec.set(id, Math.max(0, (this.dwellSec.get(id) ?? 0) - dt * 1.5));
      }
    }

    const tempEl = this.pillBarEl?.querySelector<HTMLElement>('#flashlight-temp');
    if (tempEl && Number.isFinite(minDist)) {
      const closeness = Math.max(0, Math.min(1, 1 - minDist / (Math.max(this.width, this.height) * 0.58)));
      let label = '❄️ Cold';
      let temp: 'cold' | 'warm' | 'hot' = 'cold';
      if (closeness > 0.72) {
        label = '🔥 Super Hot!';
        temp = 'hot';
      } else if (closeness > 0.44) {
        label = '🌤️ Getting Warm';
        temp = 'warm';
      }
      if (tempEl.textContent !== label) {
        tempEl.textContent = label;
        tempEl.dataset.temp = temp;
      }

      const pingInterval = 1150 - closeness * 760;
      if (closeness > 0.35 && now - this.lastPingAt >= pingInterval) {
        this.lastPingAt = now;
        audioEngine.playHotColdPing(closeness);
      }
    }

    // Store dwell highlight hint for spotlight rendering
    this.activeHighlight = illuminatedTarget;
  }

  private activeHighlight: { id: CreatureId; x: number; y: number; progress: number } | null = null;

  private renderSpotlight(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);
    if (this.roundComplete) return;

    // Soft twilight darkness veil
    ctx.save();
    ctx.fillStyle = 'rgba(10, 4, 24, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Punch out smooth radial flashlight hole
    ctx.globalCompositeOperation = 'destination-out';
    const hole = ctx.createRadialGradient(
      this.beamX,
      this.beamY,
      this.beamRadius * 0.25,
      this.beamX,
      this.beamY,
      this.beamRadius,
    );
    hole.addColorStop(0, 'rgba(0, 0, 0, 1)');
    hole.addColorStop(0.7, 'rgba(0, 0, 0, 0.94)');
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(this.beamX, this.beamY, this.beamRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Warm golden flashlight rim
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 224, 128, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.beamX, this.beamY, this.beamRadius * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    // Dwell discovery ring when beam shines on a hiding friend
    if (this.activeHighlight) {
      ctx.strokeStyle = '#6ef3b3';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(
        this.activeHighlight.x,
        this.activeHighlight.y,
        46,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * this.activeHighlight.progress,
      );
      ctx.stroke();
    }

    // Subtle sparkle cue if activeHintTarget is near beam edge
    void this.activeHintTarget;
    ctx.restore();
  }
}
