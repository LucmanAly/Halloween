import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { COSTUMES_CATALOG, TOTAL_COSTUMES, isCostumeUnlocked } from '../creatures/costumes.ts';
import { TOTAL_SECRETS } from '../world/secretsCatalog.ts';

export interface SettingsController {
  open: () => void;
}

export function initSettingsDialog(): SettingsController {
  const dialog = document.getElementById('settings-dialog') as HTMLDialogElement | null;
  const musicInput = document.getElementById('music-volume') as HTMLInputElement | null;
  const sfxInput = document.getElementById('sfx-volume') as HTMLInputElement | null;
  const reducedToggle = document.getElementById('reduced-motion-toggle') as HTMLInputElement | null;
  const ageEasyBtn = document.getElementById('age-easy-btn') as HTMLButtonElement | null;
  const agePlayfulBtn = document.getElementById('age-playful-btn') as HTMLButtonElement | null;
  const secretsProgress = document.getElementById('settings-secrets-progress');
  const potionsProgress = document.getElementById('settings-potions-progress');
  const costumesProgress = document.getElementById('settings-costumes-progress');
  const resetBtn = document.getElementById('reset-progress-btn') as HTMLButtonElement | null;

  let confirmPending = false;
  let confirmTimeout = 0;

  const syncControls = () => {
    const state = gameState.get();
    if (musicInput) musicInput.value = String(Math.round(state.audio.musicVolume * 100));
    if (sfxInput) sfxInput.value = String(Math.round(state.audio.sfxVolume * 100));
    if (reducedToggle) reducedToggle.checked = state.reducedMotion;
    if (ageEasyBtn) ageEasyBtn.setAttribute('aria-pressed', String(state.ageMode === 'easy'));
    if (agePlayfulBtn) agePlayfulBtn.setAttribute('aria-pressed', String(state.ageMode === 'playful'));
    if (secretsProgress) {
      secretsProgress.textContent = `${state.secretsFound.length} / ${TOTAL_SECRETS}`;
    }
    if (potionsProgress) {
      potionsProgress.textContent = `${state.potionsDiscovered.length} / 8`;
    }
    if (costumesProgress) {
      const unlocked = COSTUMES_CATALOG.filter((c) =>
        isCostumeUnlocked(c.id, state.unlockedCostumes),
      ).length;
      costumesProgress.textContent = `${unlocked} / ${TOTAL_COSTUMES}`;
    }
    document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
  };

  const clearResetConfirm = () => {
    confirmPending = false;
    window.clearTimeout(confirmTimeout);
    if (resetBtn) {
      resetBtn.textContent = 'Reset All Progress';
    }
  };

  syncControls();

  musicInput?.addEventListener('input', () => {
    gameState.updateAudio({ musicVolume: Number(musicInput.value) / 100 });
  });

  sfxInput?.addEventListener('input', () => {
    gameState.updateAudio({ sfxVolume: Number(sfxInput.value) / 100 });
  });

  reducedToggle?.addEventListener('change', () => {
    gameState.updateSettings({ reducedMotion: reducedToggle.checked });
  });

  ageEasyBtn?.addEventListener('click', () => {
    audioEngine.playBubblePop(1);
    gameState.updateSettings({ ageMode: 'easy' });
  });

  agePlayfulBtn?.addEventListener('click', () => {
    audioEngine.playBubblePop(3);
    gameState.updateSettings({ ageMode: 'playful' });
  });

  resetBtn?.addEventListener('click', () => {
    if (!confirmPending) {
      confirmPending = true;
      resetBtn.textContent = 'Tap again to confirm reset';
      confirmTimeout = window.setTimeout(clearResetConfirm, 4000);
      return;
    }
    clearResetConfirm();
    gameState.resetProgress();
    audioEngine.playBubblePop(0);
    eventBus.emit('world:speech', {
      emoji: '✨',
      text: 'Fresh start! Ready for new Halloween secrets!',
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.35,
      color: '#6ef3b3',
      durationMs: 2600,
    });
    dialog?.close();
  });

  dialog?.addEventListener('close', clearResetConfirm);

  // Safari fallback for closedby="any" light dismiss outside dialog bounds
  if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    });
  }

  eventBus.on('audio:state', syncControls);
  eventBus.on('settings:changed', syncControls);
  eventBus.on('secret:discovered', syncControls);
  eventBus.on('potion:discovered', syncControls);
  eventBus.on('costume:unlocked', syncControls);
  eventBus.on('state:reset', syncControls);

  return {
    open: () => {
      syncControls();
      dialog?.showModal();
    },
  };
}
