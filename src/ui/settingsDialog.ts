import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';

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
    document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
  };

  const clearResetConfirm = () => {
    confirmPending = false;
    window.clearTimeout(confirmTimeout);
    if (resetBtn) {
      resetBtn.textContent = 'Reset Candy & Secrets';
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

  eventBus.on('audio:state', syncControls);
  eventBus.on('settings:changed', syncControls);

  return {
    open: () => {
      syncControls();
      dialog?.showModal();
    },
  };
}
