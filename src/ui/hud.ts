import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { TOTAL_SECRETS } from '../world/secretsCatalog.ts';
import { WorldEventsDirector } from '../world/worldEvents.ts';

export function initHud(
  worldEvents: WorldEventsDirector,
  openSettings: () => void,
): void {
  const candyPill = document.getElementById('candy-pill');
  const candyCount = document.getElementById('candy-count');
  const secretsCount = document.getElementById('secrets-count');
  const surpriseBtn = document.getElementById('surprise-btn');
  const muteBtn = document.getElementById('mute-btn');
  const muteIcon = document.getElementById('mute-icon');
  const settingsBtn = document.getElementById('settings-btn');

  const renderCounts = () => {
    const state = gameState.get();
    if (candyCount) candyCount.textContent = String(state.candy);
    if (secretsCount) {
      secretsCount.textContent = `${state.secretsFound.length} / ${TOTAL_SECRETS}`;
    }
  };

  const renderAudio = () => {
    const muted = gameState.get().audio.muted;
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(muted));
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
  };

  const bumpCandy = () => {
    if (!candyPill) return;
    candyPill.classList.remove('is-bumping');
    void candyPill.offsetWidth;
    candyPill.classList.add('is-bumping');
  };

  renderCounts();
  renderAudio();

  eventBus.on('candy:add', () => {
    renderCounts();
    bumpCandy();
  });

  eventBus.on('secret:discovered', () => {
    renderCounts();
  });

  eventBus.on('state:reset', () => {
    renderCounts();
  });

  eventBus.on('audio:state', () => {
    renderAudio();
  });

  surpriseBtn?.addEventListener('click', () => {
    worldEvents.triggerRandomOrNext();
  });

  muteBtn?.addEventListener('click', () => {
    const nextMuted = !gameState.get().audio.muted;
    gameState.updateAudio({ muted: nextMuted });
    if (!nextMuted) {
      audioEngine.playSparkleChime();
    }
  });

  settingsBtn?.addEventListener('click', () => {
    audioEngine.playBubblePop(2);
    openSettings();
  });
}
