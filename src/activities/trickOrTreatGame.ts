import { audioEngine } from '../core/audioEngine.ts';
import { gameState } from '../core/state.ts';
import { CREATURE_ROSTER } from '../creatures/creatureRoster.ts';
import { renderCreatureArtSvg } from '../creatures/creatureRig.ts';
import type { CreatureId } from '../creatures/types.ts';
import type { ActivityController, ActivityDeps } from './types.ts';

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  emoji: string;
  kind: 'candy' | 'lollipop' | 'chocolate' | 'sock' | 'broccoli';
  points: number;
  rotation: number;
  spin: number;
}

interface FloatingBanner {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const SILLY_QUIPS = [
  'Ewww, stinky sock! 😂',
  'Blehh, goofy broccoli! 🥦',
  'Haha! Who dropped laundry?!',
  'Whoa, silly veggies!',
];

export class TrickOrTreatGame implements ActivityController {
  readonly id = 'trick-or-treat' as const;
  private readonly deps: ActivityDeps;
  private readonly onRequestClose: () => void;

  private openState = false;
  private phase: 'knock' | 'guess' | 'catcher' | 'summary' = 'knock';
  private knocks = 0;
  private visitorId: CreatureId = 'pip';
  private guessChoices: CreatureId[] = [];
  private backdropEl: HTMLElement | null = null;
  private doorStatusText = 'Tap the haunted door 3 times to knock!';

  // Candy Catcher canvas state
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasW = 620;
  private canvasH = 340;
  private bucketX = 310;
  private bucketWidth = 116;
  private bucketWobble = 0;
  private timeLeft = 20;
  private roundCandy = 0;
  private spawnTimer = 0;
  private items: FallingItem[] = [];
  private banners: FloatingBanner[] = [];
  private rafId = 0;
  private lastFrameMs = 0;
  private pressedKeys = new Set<string>();
  private resizeObserver: ResizeObserver | null = null;
  private timers: number[] = [];

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (!this.openState || this.phase !== 'catcher') return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
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
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.startKnockRound();
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.stopCatcherLoop();
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers = [];
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.backdropEl?.remove();
    this.backdropEl = null;
    this.deps.voiceManager.stopAll();
    this.deps.banterDirector.setActivityMode(false);
    this.deps.worldEvents.setPaused(false);
  }

  private startKnockRound(): void {
    this.stopCatcherLoop();
    this.phase = 'knock';
    this.knocks = 0;
    this.roundCandy = 0;

    const shuffled = [...CREATURE_ROSTER].sort(() => Math.random() - 0.5);
    this.visitorId = shuffled[0].id;
    this.guessChoices = shuffled
      .slice(0, 3)
      .map((c) => c.id)
      .sort(() => Math.random() - 0.5);
    this.doorStatusText = 'Tap the haunted door 3 times to knock!';
    this.render();
  }

  private stopCatcherLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.pressedKeys.clear();
    this.canvas = null;
    this.ctx = null;
  }

  private render(): void {
    this.deps.activityLayer.innerHTML = '';
    const backdrop = document.createElement('div');
    backdrop.className = 'activity-backdrop';
    this.backdropEl = backdrop;

    const equipped = gameState.get().equippedCostumes;
    const visitorCfg = CREATURE_ROSTER.find((c) => c.id === this.visitorId)!;

    let bodyHtml = '';

    if (this.phase === 'knock' || this.phase === 'guess') {
      const pipsHtml = [0, 1, 2]
        .map((i) => `<span class="knock-pip ${this.knocks > i ? 'is-lit' : ''}">✊</span>`)
        .join('');

      const choicesHtml =
        this.phase === 'guess'
          ? `
          <div class="guess-grid">
            ${this.guessChoices
              .map((cid) => {
                const cfg = CREATURE_ROSTER.find((c) => c.id === cid)!;
                return `
                  <button type="button" class="guess-card" data-guess-id="${cid}">
                    ${renderCreatureArtSvg(cid, equipped[cid] ?? null)}
                    <span>${cfg.name}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
          <div class="round-summary-actions">
            <button type="button" class="kid-secondary-btn" id="tot-replay-clue">🔊 Replay Clue</button>
            <button type="button" class="kid-action-btn" id="tot-just-open">🚪 Open Door!</button>
          </div>
        `
          : '';

      bodyHtml = `
        <div class="knock-stage">
          <div class="door-frame">
            <div class="door-visitor-reveal">
              ${renderCreatureArtSvg(this.visitorId, equipped[this.visitorId] ?? null)}
            </div>
            <button type="button" id="tot-door-btn" class="door-leaf-btn" aria-label="Knock on the haunted front door">
              <div class="door-knocker" aria-hidden="true">🎃</div>
              <span>Knock Knock!</span>
            </button>
          </div>
          <div class="knock-pips" aria-label="Knocks: ${this.knocks} of 3">${pipsHtml}</div>
          <p class="spell-banner" id="tot-status" role="status">${this.doorStatusText}</p>
          ${choicesHtml}
        </div>
      `;
    } else if (this.phase === 'catcher') {
      bodyHtml = `
        <div class="catcher-wrap">
          <div class="catcher-hud-row">
            <span class="catcher-stat" id="catcher-timer">⏱️ ${Math.ceil(this.timeLeft)}s</span>
            <span class="catcher-stat">${visitorCfg.name} is tossing candy!</span>
            <span class="catcher-stat" id="catcher-score">🍬 +${this.roundCandy}</span>
          </div>
          <canvas id="catcher-canvas" class="catcher-canvas" aria-label="Slide your pumpkin bucket left and right to catch candy"></canvas>
          <p class="activity-subtitle">Drag, tap, or use Arrow keys! Watch out for goofy socks &amp; broccoli!</p>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="round-summary">
          <div class="round-summary-emoji" aria-hidden="true">🎃🍬</div>
          <h3 class="activity-title">Happy Trick-or-Treat!</h3>
          <p class="activity-subtitle">${visitorCfg.name} cheered for you! Caught <strong>${this.roundCandy}</strong> treats (+5 bonus Magic Candy)!</p>
          <div class="round-summary-actions">
            <button type="button" class="kid-action-btn" id="tot-again-btn">🚪 Knock Again!</button>
            <button type="button" class="kid-secondary-btn" id="tot-home-btn">🏡 Back to Courtyard</button>
          </div>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <section class="activity-card" role="dialog" aria-modal="true" aria-labelledby="tot-title">
        <div class="activity-header">
          <div class="activity-title-group">
            <span class="activity-title-emoji" aria-hidden="true">🚪</span>
            <div>
              <h2 id="tot-title" class="activity-title">Knock-Knock Trick-or-Treat</h2>
              <p class="activity-subtitle">Listen for who's inside, then catch falling treats!</p>
            </div>
          </div>
          <button type="button" class="activity-close-btn" aria-label="Close Trick-or-Treat">✕</button>
        </div>
        ${bodyHtml}
      </section>
    `;

    this.deps.activityLayer.appendChild(backdrop);
    this.bindRenderedControls();
  }

  private bindRenderedControls(): void {
    if (!this.backdropEl) return;

    this.backdropEl
      .querySelector('.activity-close-btn')
      ?.addEventListener('click', () => this.onRequestClose());

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) this.onRequestClose();
    });

    const doorBtn = this.backdropEl.querySelector<HTMLButtonElement>('#tot-door-btn');
    doorBtn?.addEventListener('click', () => this.handleKnock(doorBtn));

    this.backdropEl.querySelectorAll<HTMLButtonElement>('[data-guess-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const guessId = btn.dataset.guessId as CreatureId;
        if (guessId === this.visitorId) {
          const rect = btn.getBoundingClientRect();
          gameState.addCandy(5, rect.left + rect.width * 0.5, rect.top, 'trick-or-treat:guess');
          audioEngine.playSparkleChime();
          this.doorStatusText = `Yay! It IS ${
            CREATURE_ROSTER.find((c) => c.id === this.visitorId)?.name
          }! +5 Bonus Candy!`;
          this.swingDoorOpen();
        } else {
          audioEngine.playSillyBonk();
          const status = this.backdropEl?.querySelector('#tot-status');
          if (status) {
            status.textContent = 'Hehe, good guess! Try another friend or tap Open Door!';
          }
        }
      });
    });

    this.backdropEl.querySelector('#tot-replay-clue')?.addEventListener('click', () => {
      this.playVisitorClue();
    });

    this.backdropEl.querySelector('#tot-just-open')?.addEventListener('click', () => {
      this.swingDoorOpen();
    });

    this.backdropEl.querySelector('#tot-again-btn')?.addEventListener('click', () => {
      this.startKnockRound();
    });

    this.backdropEl.querySelector('#tot-home-btn')?.addEventListener('click', () => {
      this.onRequestClose();
    });

    if (this.phase === 'catcher') {
      this.mountCatcherCanvas();
    }
  }

  private handleKnock(doorBtn: HTMLButtonElement): void {
    if (this.phase !== 'knock') return;
    this.knocks = Math.min(3, this.knocks + 1);
    audioEngine.playDoorKnock();
    doorBtn.classList.remove('is-knocking');
    void doorBtn.offsetWidth;
    doorBtn.classList.add('is-knocking');

    const rect = doorBtn.getBoundingClientRect();
    this.deps.particles.spawnBurst(
      rect.left + rect.width * 0.5,
      rect.top + rect.height * 0.45,
      ['#ffb86b', '#ffd166', '#ff7eb6'],
      10,
      'star',
    );

    if (this.knocks >= 3) {
      this.phase = 'guess';
      this.doorStatusText = 'Listen to the spooky voice clue! Who is behind the door?';
      this.render();
      this.playVisitorClue();
    } else {
      this.doorStatusText = `Knock ${this.knocks} of 3... tap again!`;
      this.render();
    }
  }

  private playVisitorClue(): void {
    const cfg = CREATURE_ROSTER.find((c) => c.id === this.visitorId);
    void this.deps.voiceManager.speakLineById(this.visitorId, 'hint_2', null, {
      bubblePos: { x: window.innerWidth * 0.5, y: 120 },
      bubbleColor: cfg?.bubbleColor ?? '#ffd166',
    });
  }

  private swingDoorOpen(): void {
    const doorBtn = this.backdropEl?.querySelector<HTMLButtonElement>('#tot-door-btn');
    if (doorBtn) {
      doorBtn.classList.add('is-open');
    }
    audioEngine.playDoorCreak();

    const cfg = CREATURE_ROSTER.find((c) => c.id === this.visitorId);
    const doorRect = doorBtn?.getBoundingClientRect();
    if (doorRect) {
      this.deps.particles.spawnBurst(
        doorRect.left + doorRect.width * 0.5,
        doorRect.top + doorRect.height * 0.5,
        [cfg?.bubbleColor ?? '#ffd166', '#ff7eb6', '#6ef3b3'],
        24,
        'candy',
      );
    }

    void this.deps.voiceManager.speakLineById(this.visitorId, 'greet_2', null, {
      bubblePos: { x: window.innerWidth * 0.5, y: 120 },
      bubbleColor: cfg?.bubbleColor ?? '#ffd166',
    });

    this.timers.push(
      window.setTimeout(() => {
        if (!this.openState) return;
        this.startCatcherRound();
      }, 1500),
    );
  }

  private startCatcherRound(): void {
    this.phase = 'catcher';
    this.timeLeft = 20;
    this.roundCandy = 0;
    this.items = [];
    this.banners = [];
    this.spawnTimer = 0.2;
    this.bucketWobble = 0;
    const ageMode = gameState.get().ageMode;
    this.bucketWidth = ageMode === 'easy' ? 118 : 92;
    this.render();
  }

  private mountCatcherCanvas(): void {
    const canvas = this.backdropEl?.querySelector<HTMLCanvasElement>('#catcher-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.canvas = canvas;
    this.ctx = ctx;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      this.canvasW = Math.max(280, r.width);
      this.canvasH = Math.max(220, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(this.canvasW * dpr);
      canvas.height = Math.round(this.canvasH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.bucketX = Math.max(
        this.bucketWidth * 0.5,
        Math.min(this.canvasW - this.bucketWidth * 0.5, this.bucketX || this.canvasW * 0.5),
      );
    };

    resize();
    this.bucketX = this.canvasW * 0.5;
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(canvas);

    const moveToClient = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      const localX = clientX - r.left;
      this.bucketX = Math.max(
        this.bucketWidth * 0.5,
        Math.min(this.canvasW - this.bucketWidth * 0.5, localX),
      );
    };

    canvas.addEventListener('pointerdown', (e) => moveToClient(e.clientX));
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons > 0 || e.pointerType === 'mouse') {
        moveToClient(e.clientX);
      }
    });

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame((t) => this.catcherLoop(t));
  }

  private catcherLoop(now: number): void {
    if (!this.openState || this.phase !== 'catcher' || !this.ctx || !this.canvas) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) {
      this.finishCatcherRound();
      return;
    }

    // Keyboard bucket steering
    let vx = 0;
    if (this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('a') || this.pressedKeys.has('A')) vx -= 1;
    if (this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('d') || this.pressedKeys.has('D')) vx += 1;
    if (vx !== 0) {
      this.bucketX = Math.max(
        this.bucketWidth * 0.5,
        Math.min(this.canvasW - this.bucketWidth * 0.5, this.bucketX + vx * 440 * dt),
      );
    }

    if (this.bucketWobble > 0) {
      this.bucketWobble = Math.max(0, this.bucketWobble - dt * 3);
    }

    const ageMode = gameState.get().ageMode;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = ageMode === 'easy' ? 0.62 : 0.45;
      this.spawnFallingItem(ageMode);
    }

    const bucketY = this.canvasH - 36;
    const canvasRect = this.canvas.getBoundingClientRect();

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.vy * dt;
      item.rotation += item.spin * dt;

      const hitX = Math.abs(item.x - this.bucketX) <= this.bucketWidth * 0.52;
      const hitY = item.y >= bucketY - 24 && item.y <= bucketY + 18;
      if (hitX && hitY) {
        this.items.splice(i, 1);
        const cx = canvasRect.left + item.x;
        const cy = canvasRect.top + bucketY;
        if (item.points > 0) {
          this.roundCandy += item.points;
          audioEngine.playCandyCollect();
          gameState.addCandy(item.points, cx, cy, 'trick-or-treat:catch');
          this.deps.particles.spawnBurst(cx, cy, ['#ffd166', '#ff7eb6', '#6ef3b3'], 10, 'candy');
          this.banners.push({
            x: item.x,
            y: bucketY - 26,
            text: `+${item.points} 🍬`,
            color: '#ffd166',
            life: 0.85,
          });
        } else {
          // Zero lives lost — silly goofy wobble + giggle!
          this.bucketWobble = 1;
          audioEngine.playSillyBonk();
          this.banners.push({
            x: item.x,
            y: bucketY - 28,
            text: SILLY_QUIPS[Math.floor(Math.random() * SILLY_QUIPS.length)],
            color: '#9cf6ff',
            life: 1.25,
          });
        }
        continue;
      }

      if (item.y > this.canvasH + 34) {
        this.items.splice(i, 1);
      }
    }

    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      b.y -= 36 * dt;
      b.life -= dt;
      if (b.life <= 0) this.banners.splice(i, 1);
    }

    const timerEl = this.backdropEl?.querySelector('#catcher-timer');
    const scoreEl = this.backdropEl?.querySelector('#catcher-score');
    if (timerEl) timerEl.textContent = `⏱️ ${Math.ceil(this.timeLeft)}s`;
    if (scoreEl) scoreEl.textContent = `🍬 +${this.roundCandy}`;

    this.renderCatcherScene();
    this.rafId = requestAnimationFrame((t) => this.catcherLoop(t));
  }

  private spawnFallingItem(ageMode: 'easy' | 'playful'): void {
    const goofChance = ageMode === 'easy' ? 0.2 : 0.3;
    const roll = Math.random();
    const speedBase = ageMode === 'easy' ? 135 : 185;
    const vy = speedBase + Math.random() * 85;
    const x = 32 + Math.random() * Math.max(60, this.canvasW - 64);

    if (roll < goofChance) {
      const isSock = Math.random() < 0.5;
      this.items.push({
        x,
        y: -24,
        vy,
        emoji: isSock ? '🧦' : '🥦',
        kind: isSock ? 'sock' : 'broccoli',
        points: 0,
        rotation: 0,
        spin: (Math.random() - 0.5) * 3,
      });
      return;
    }

    const treatRoll = Math.random();
    if (treatRoll < 0.18) {
      this.items.push({ x, y: -24, vy: vy * 1.1, emoji: '🍫', kind: 'chocolate', points: 3, rotation: 0, spin: 1.2 });
    } else if (treatRoll < 0.5) {
      this.items.push({ x, y: -24, vy, emoji: '🍭', kind: 'lollipop', points: 2, rotation: 0, spin: -1.4 });
    } else {
      this.items.push({ x, y: -24, vy, emoji: '🍬', kind: 'candy', points: 1, rotation: 0, spin: 1.8 });
    }
  }

  private renderCatcherScene(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // Subtle twinkling dots
    ctx.fillStyle = 'rgba(255, 240, 170, 0.35)';
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 97 + 40) % this.canvasW);
      const sy = ((i * 53 + 22) % (this.canvasH * 0.55));
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Falling treats & silly props
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const item of this.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    }

    // Smiling Pumpkin Bucket
    const bucketY = this.canvasH - 36;
    const tilt = this.bucketWobble > 0 ? Math.sin(this.bucketWobble * Math.PI * 6) * 0.18 : 0;
    ctx.save();
    ctx.translate(this.bucketX, bucketY);
    ctx.rotate(tilt);

    const bw = this.bucketWidth;
    // Handle arc
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -14, bw * 0.36, Math.PI, 0);
    ctx.stroke();

    // Pumpkin body
    ctx.fillStyle = '#ff8324';
    ctx.strokeStyle = '#4f1900';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw * 0.48, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim
    ctx.fillStyle = '#5c2400';
    ctx.beginPath();
    ctx.ellipse(0, -14, bw * 0.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Happy jack-o-lantern eyes & smile
    ctx.fillStyle = '#fff7b0';
    ctx.beginPath();
    ctx.arc(-14, 0, 4, 0, Math.PI * 2);
    ctx.arc(14, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff7b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 3, 12, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Floating score / silly captions
    for (const b of this.banners) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, b.life));
      ctx.font = '700 17px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#1d0b36';
      ctx.lineWidth = 4;
      const clampedX = Math.max(85, Math.min(this.canvasW - 85, b.x));
      ctx.strokeText(b.text, clampedX, b.y);
      ctx.fillText(b.text, clampedX, b.y);
      ctx.restore();
    }
  }

  private finishCatcherRound(): void {
    this.stopCatcherLoop();
    this.phase = 'summary';
    audioEngine.playFanfare();
    gameState.addCandy(5, window.innerWidth * 0.5, window.innerHeight * 0.45, 'trick-or-treat:finish');
    this.render();
  }
}
