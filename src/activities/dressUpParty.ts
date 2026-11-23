import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import {
  COSTUMES_CATALOG,
  isCostumeUnlocked,
  renderCostumePreviewSvg,
} from '../creatures/costumes.ts';
import { CREATURE_ROSTER } from '../creatures/creatureRoster.ts';
import { renderCreatureArtSvg } from '../creatures/creatureRig.ts';
import type { CreatureId } from '../creatures/types.ts';
import type { ActivityController, ActivityDeps } from './types.ts';

export class DressUpParty implements ActivityController {
  readonly id = 'dress-up' as const;
  private readonly deps: ActivityDeps;
  private readonly onRequestClose: () => void;

  private openState = false;
  private danceActive = false;
  private selectedCreature: CreatureId = 'pip';
  private backdropEl: HTMLElement | null = null;
  private statusText = 'Pick a friend & snap on silly costumes!';
  private lastPadAt = 0;

  constructor(deps: ActivityDeps, onRequestClose: () => void) {
    this.deps = deps;
    this.onRequestClose = onRequestClose;
  }

  isOpen(): boolean {
    return this.openState;
  }

  isDanceActive(): boolean {
    return this.danceActive;
  }

  open(): void {
    if (this.danceActive) {
      this.stopDancePartyVisuals();
    }
    if (this.openState) return;
    this.openState = true;
    this.statusText = 'Pick a friend & snap on silly costumes!';
    this.deps.worldEvents.setPaused(true);
    this.deps.banterDirector.setActivityMode(true);
    this.renderWardrobe();
  }

  close(): void {
    if (this.danceActive) {
      this.stopDancePartyVisuals();
    }
    if (!this.openState) return;
    this.openState = false;
    this.backdropEl?.remove();
    this.backdropEl = null;
    this.deps.activityLayer.innerHTML = '';
    this.deps.stageFxLayer.innerHTML = '';
    this.deps.banterDirector.setTapInterceptor(null);
    this.deps.banterDirector.setActivityMode(false);
    this.deps.worldEvents.setPaused(false);
  }

  private renderWardrobe(): void {
    this.deps.activityLayer.innerHTML = '';
    const backdrop = document.createElement('div');
    backdrop.className = 'activity-backdrop';
    this.backdropEl = backdrop;

    const state = gameState.get();
    const equippedId = state.equippedCostumes[this.selectedCreature] ?? null;
    const cfg = CREATURE_ROSTER.find((c) => c.id === this.selectedCreature)!;

    const pickerHtml = CREATURE_ROSTER.map(
      (c) => `
      <button
        type="button"
        class="creature-tab-btn"
        data-creature-tab="${c.id}"
        aria-pressed="${c.id === this.selectedCreature}"
      >
        ${renderCreatureArtSvg(c.id, state.equippedCostumes[c.id] ?? null)}
        <span>${c.name}</span>
      </button>
    `,
    ).join('');

    const costumesHtml = COSTUMES_CATALOG.map((item) => {
      const unlocked = isCostumeUnlocked(item.id, state.unlockedCostumes);
      const isEquipped = equippedId === item.id;
      const statusLabel = isEquipped
        ? '✅ Wearing'
        : unlocked
          ? '✨ Unlocked'
          : `🍬 ${item.cost} Candy`;

      return `
        <button
          type="button"
          class="costume-card ${isEquipped ? 'is-equipped' : ''}"
          data-costume-id="${item.id}"
        >
          ${renderCostumePreviewSvg(item.id)}
          <div class="costume-meta">
            <span class="costume-name">${item.emoji} ${item.name}</span>
            <span class="costume-status">${statusLabel}</span>
          </div>
        </button>
      `;
    }).join('');

    backdrop.innerHTML = `
      <section class="activity-card" role="dialog" aria-modal="true" aria-labelledby="dressup-title">
        <div class="activity-header">
          <div class="activity-title-group">
            <span class="activity-title-emoji" aria-hidden="true">🎩</span>
            <div>
              <h2 id="dressup-title" class="activity-title">Silly Dress-Up &amp; Dance Party</h2>
              <p class="activity-subtitle">Spend Magic Candy to unlock costumes &amp; throw a Monster Disco!</p>
            </div>
          </div>
          <button type="button" class="activity-close-btn" aria-label="Close Dress-Up">✕</button>
        </div>

        <div class="dressup-layout">
          <div class="creature-picker-row">${pickerHtml}</div>

          <div class="dressup-stage-row">
            <div class="dressup-pedestal">
              ${renderCreatureArtSvg(this.selectedCreature, equippedId)}
              <strong>${cfg.title}</strong>
              <button type="button" class="kid-secondary-btn" id="dressup-clear-btn" ${
                equippedId ? '' : 'disabled'
              }>✨ Take Off Costume</button>
            </div>

            <div class="costume-grid">${costumesHtml}</div>
          </div>

          <p class="spell-banner" role="status">${this.statusText}</p>

          <div class="dressup-footer">
            <button type="button" class="kid-secondary-btn" id="dressup-done-btn">🏡 Back to Courtyard</button>
            <button type="button" class="kid-action-btn" id="dressup-party-btn">🪩 Monster Dance Party!</button>
          </div>
        </div>
      </section>
    `;

    this.deps.activityLayer.appendChild(backdrop);
    this.bindWardrobeControls();
  }

  private bindWardrobeControls(): void {
    if (!this.backdropEl) return;

    this.backdropEl
      .querySelector('.activity-close-btn')
      ?.addEventListener('click', () => this.onRequestClose());
    this.backdropEl
      .querySelector('#dressup-done-btn')
      ?.addEventListener('click', () => this.onRequestClose());

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) this.onRequestClose();
    });

    this.backdropEl.querySelectorAll<HTMLButtonElement>('[data-creature-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.creatureTab as CreatureId;
        this.selectedCreature = id;
        audioEngine.playDancePad(id);
        this.statusText = `Dressing up ${
          CREATURE_ROSTER.find((c) => c.id === id)?.name ?? id
        }!`;
        this.renderWardrobe();
      });
    });

    this.backdropEl.querySelector('#dressup-clear-btn')?.addEventListener('click', () => {
      gameState.equipCostume(this.selectedCreature, null);
      audioEngine.playBubblePop(1);
      this.statusText = 'Sparkly fresh look! Pick another costume anytime!';
      this.renderWardrobe();
    });

    this.backdropEl.querySelectorAll<HTMLButtonElement>('[data-costume-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const costumeId = btn.dataset.costumeId!;
        this.handleCostumeClick(costumeId, btn.getBoundingClientRect());
      });
    });

    this.backdropEl.querySelector('#dressup-party-btn')?.addEventListener('click', () => {
      this.startDanceParty();
    });
  }

  private handleCostumeClick(costumeId: string, rect: DOMRect): void {
    const item = COSTUMES_CATALOG.find((c) => c.id === costumeId);
    if (!item) return;

    const state = gameState.get();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;

    if (isCostumeUnlocked(costumeId, state.unlockedCostumes)) {
      gameState.equipCostume(this.selectedCreature, costumeId);
      audioEngine.playCostumeSnap();
      this.deps.particles.spawnBurst(cx, cy, [item.accent, '#ffd166', '#ffffff'], 16, 'star');
      this.statusText = `${item.emoji} Snapped ${item.name} onto ${
        CREATURE_ROSTER.find((c) => c.id === this.selectedCreature)?.name
      }!`;
      this.renderWardrobe();
      return;
    }

    if (state.candy < item.cost) {
      audioEngine.playBubblePop(0);
      this.statusText = `Need ${item.cost - state.candy} more 🍬 Magic Candy! Tap creatures, bubbles, or play games!`;
      this.renderWardrobe();
      return;
    }

    if (gameState.spendCandy(item.cost, `costume:${costumeId}`)) {
      gameState.unlockCostume(costumeId);
      gameState.equipCostume(this.selectedCreature, costumeId);
      audioEngine.playFanfare();
      this.deps.particles.spawnBurst(cx, cy, [item.accent, '#ffd166', '#6ef3b3', '#ff7eb6'], 24, 'star');
      this.statusText = `🎉 Unlocked & equipped ${item.name}!`;
      this.renderWardrobe();
    }
  }

  private startDanceParty(): void {
    this.backdropEl?.remove();
    this.backdropEl = null;
    this.deps.activityLayer.innerHTML = '';

    this.danceActive = true;
    this.deps.stage.classList.add('is-dance-party');
    this.deps.banterDirector.setActivityMode(false);
    this.deps.banterDirector.setDanceMode(true);
    this.deps.worldEvents.setPaused(true);

    // Mount Pumpkin Disco Ball + Spotlight Beams
    this.deps.stageFxLayer.innerHTML = `
      <div class="disco-beams"></div>
      <div class="disco-rig">
        <svg width="110" height="145" viewBox="-55 -10 110 145" aria-hidden="true">
          <line x1="0" y1="-10" x2="0" y2="52" stroke="#ffe066" stroke-width="4" />
          <circle cx="0" cy="86" r="42" fill="#ff9636" stroke="#2d124d" stroke-width="3.5" />
          <ellipse cx="0" cy="86" rx="22" ry="41" fill="none" stroke="#ffe066" stroke-width="2" opacity="0.65" />
          <line x1="-40" y1="86" x2="40" y2="86" stroke="#ffe066" stroke-width="2" opacity="0.6" />
          <rect x="-10" y="66" width="8" height="8" fill="#fff9d6" opacity="0.85" />
          <rect x="4" y="66" width="8" height="8" fill="#7ef9ff" opacity="0.85" />
          <rect x="-18" y="92" width="8" height="8" fill="#ff7eb6" opacity="0.85" />
          <rect x="8" y="92" width="8" height="8" fill="#6ef3b3" opacity="0.85" />
        </svg>
      </div>
    `;

    // Turn every creature into a playable musical instrument pad!
    this.deps.banterDirector.setTapInterceptor((creatureId, clientX, clientY) => {
      const creature = this.deps.banterDirector.getCreature(creatureId);
      if (!creature) return false;
      audioEngine.playDancePad(creatureId);
      creature.playTapGag();
      this.deps.particles.spawnBurst(
        clientX,
        clientY,
        [creature.config.bubbleColor, '#ffd166', '#ff7eb6', '#6ef3b3'],
        16,
        'star',
      );
      eventBus.emit('world:speech', {
        emoji: '🎵',
        text: `${creature.config.name} disco solo!`,
        x: clientX,
        y: clientY - 24,
        color: creature.config.bubbleColor,
        durationMs: 1400,
      });

      const now = performance.now();
      if (now - this.lastPadAt >= 700) {
        this.lastPadAt = now;
        gameState.addCandy(1, clientX, clientY, `dance-pad:${creatureId}`);
      }
      return true;
    });

    // Bottom compact Dance Party controls
    const bar = document.createElement('div');
    bar.className = 'activity-pill-bar';
    bar.innerHTML = `
      <span class="hotcold-pill" data-temp="hot">🪩 Tap any friend to jam!</span>
      <button type="button" class="kid-secondary-btn" id="party-dressup-btn">🎩 Dress-Up</button>
      <button type="button" class="kid-action-btn" id="party-confetti-btn">🎉 Confetti Drop!</button>
      <button type="button" class="kid-secondary-btn" id="party-stop-btn">⏹️ Stop Party</button>
    `;
    this.deps.activityLayer.appendChild(bar);

    bar.querySelector('#party-dressup-btn')?.addEventListener('click', () => {
      this.stopDancePartyVisuals();
      this.deps.banterDirector.setActivityMode(true);
      this.deps.worldEvents.setPaused(true);
      this.renderWardrobe();
    });

    bar.querySelector('#party-confetti-btn')?.addEventListener('click', () => {
      audioEngine.playFanfare();
      this.deps.banterDirector.triggerAllTapGags();
      const w = window.innerWidth;
      const h = window.innerHeight;
      [0.25, 0.5, 0.75].forEach((ratio) => {
        this.deps.particles.spawnBurst(
          w * ratio,
          h * 0.35,
          ['#ffd166', '#ff7eb6', '#6ef3b3', '#7ef9ff', '#b892ff'],
          24,
          'star',
        );
      });
    });

    bar.querySelector('#party-stop-btn')?.addEventListener('click', () => {
      this.onRequestClose();
    });

    audioEngine.playFanfare();
  }

  private stopDancePartyVisuals(): void {
    if (!this.danceActive) return;
    this.danceActive = false;
    this.deps.stage.classList.remove('is-dance-party');
    this.deps.stageFxLayer.innerHTML = '';
    this.deps.activityLayer.innerHTML = '';
    this.deps.banterDirector.setTapInterceptor(null);
    this.deps.banterDirector.setDanceMode(false);
  }
}
