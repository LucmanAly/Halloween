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
  private activeId: ActivityId | null = null;

  constructor(deps: ActivityDeps) {
    this.deps = deps;
    const closeActive = () => this.closeActive();

    this.controllers = {
      cauldron: new CauldronGame(deps, closeActive),
      flashlight: new FlashlightGame(deps, closeActive),
      'trick-or-treat': new TrickOrTreatGame(deps, closeActive),
      'dress-up': new DressUpParty(deps, closeActive),
    };

    this.bindTriggers();
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
    this.closeActive();

    this.activeId = id;
    this.deps.stage.classList.add('is-activity-open');
    eventBus.emit('activity:change', { active: id });
    this.controllers[id].open();
  }

  closeActive(): void {
    if (!this.activeId) return;
    const prev = this.activeId;
    this.activeId = null;
    this.controllers[prev].close();
    this.deps.stage.classList.remove('is-activity-open');
    eventBus.emit('activity:change', { active: null });
  }
}
