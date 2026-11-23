import { audioEngine } from '../core/audioEngine.ts';
import { eventBus, type ActivityId } from '../core/eventBus.ts';
import { CauldronGame } from './cauldronGame.ts';
import { DressUpParty } from './dressUpParty.ts';
import { FlashlightGame } from './flashlightGame.ts';
import { TrickOrTreatGame } from './trickOrTreatGame.ts';
import type { ActivityController, ActivityDeps } from './types.ts';

export class ActivityManager {
  private readonly deps: ActivityDeps;
  private readonly controllers: Record<ActivityId, ActivityController>;
  private readonly sceneLayer: HTMLElement | null;
  private readonly dockEl: HTMLElement | null;
  private activeId: ActivityId | null = null;
  private lastInvoker: HTMLElement | null = null;

  constructor(deps: ActivityDeps) {
    this.deps = deps;
    this.sceneLayer = document.getElementById('scene-layer');
    this.dockEl = document.getElementById('activity-dock');
    const closeActive = () => this.closeActive();

    this.controllers = {
      cauldron: new CauldronGame(deps, closeActive),
      flashlight: new FlashlightGame(deps, closeActive),
      'trick-or-treat': new TrickOrTreatGame(deps, closeActive),
      'dress-up': new DressUpParty(deps, closeActive),
    };

    this.bindTriggers();

    eventBus.on('dance:change', ({ active }) => {
      if (active) {
        // Keep courtyard creatures interactive during live Monster Dance Party
        this.sceneLayer?.removeAttribute('inert');
        this.dockEl?.setAttribute('inert', '');
      } else if (this.activeId === 'dress-up') {
        // Returning from Dance Party back into Dress-Up wardrobe modal
        this.sceneLayer?.setAttribute('inert', '');
        this.dockEl?.setAttribute('inert', '');
      }
    });
  }

  private bindTriggers(): void {
    document.querySelectorAll<HTMLButtonElement>('#activity-dock [data-activity]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.activity as ActivityId | undefined;
        if (id) {
          audioEngine.playBubblePop(2);
          this.openActivity(id);
        }
      });
    });

    this.deps.svg.querySelectorAll<SVGGElement>('[data-launch-activity]').forEach((badge) => {
      const id = badge.dataset.launchActivity as ActivityId | undefined;
      if (!id) return;

      badge.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.deps.particles.tryPopAt(e.clientX, e.clientY)) return;
        audioEngine.playBubblePop(2);
        this.openActivity(id);
      });

      badge.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          audioEngine.playBubblePop(2);
          this.openActivity(id);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.activeId) return;
      const settingsDialog = document.getElementById('settings-dialog') as HTMLDialogElement | null;
      if (settingsDialog?.open) return;
      this.closeActive();
    });
  }

  openActivity(id: ActivityId): void {
    if (this.activeId === id) return;
    if (!this.activeId && document.activeElement instanceof HTMLElement) {
      this.lastInvoker = document.activeElement;
    }
    this.closeActive(false);

    this.activeId = id;
    this.deps.stage.classList.add('is-activity-open');
    this.dockEl?.setAttribute('inert', '');
    if (id === 'flashlight') {
      this.sceneLayer?.removeAttribute('inert');
    } else {
      this.sceneLayer?.setAttribute('inert', '');
    }
    this.syncDockPressed(id);
    eventBus.emit('activity:change', { active: id });
    this.controllers[id].open();
  }

  closeActive(restoreFocus = true): void {
    if (!this.activeId) return;
    const prev = this.activeId;
    this.activeId = null;
    this.controllers[prev].close();
    this.deps.stage.classList.remove('is-activity-open');
    this.sceneLayer?.removeAttribute('inert');
    this.dockEl?.removeAttribute('inert');
    this.syncDockPressed(null);
    eventBus.emit('activity:change', { active: null });

    if (restoreFocus && this.lastInvoker?.isConnected) {
      this.lastInvoker.focus();
    }
    if (restoreFocus) {
      this.lastInvoker = null;
    }
  }

  private syncDockPressed(active: ActivityId | null): void {
    document.querySelectorAll<HTMLButtonElement>('#activity-dock [data-activity]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.activity === active));
    });
  }
}
