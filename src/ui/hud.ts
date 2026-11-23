import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { COSTUMES_CATALOG, TOTAL_COSTUMES, isCostumeUnlocked } from '../creatures/costumes.ts';
import { TOTAL_SECRETS } from '../world/secretsCatalog.ts';
import { WorldEventsDirector } from '../world/worldEvents.ts';

const TOTAL_POTIONS = 8;

export function initHud(
  worldEvents: WorldEventsDirector,
  openSettings: () => void,
): void {
  const candyPill = document.getElementById('candy-pill');
  const candyCount = document.getElementById('candy-count');
  const secretsCount = document.getElementById('secrets-count');
  const potionsBadge = document.getElementById('dock-potions-badge');
  const costumesBadge = document.getElementById('dock-costumes-badge');
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
    if (potionsBadge) {
      potionsBadge.textContent = `${state.potionsDiscovered.length}/${TOTAL_POTIONS}`;
    }
    if (costumesBadge) {
      const unlockedCount = COSTUMES_CATALOG.filter((c) =>
        isCostumeUnlocked(c.id, state.unlockedCostumes),
      ).length;
      costumesBadge.textContent = `${unlockedCount}/${TOTAL_COSTUMES}`;
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

  eventBus.on('candy:spend', () => {
    renderCounts();
    bumpCandy();
  });

  eventBus.on('secret:discovered', () => {
    renderCounts();
  });

  eventBus.on('potion:discovered', () => {
    renderCounts();
  });

  eventBus.on('costume:unlocked', () => {
    renderCounts();
  });

  eventBus.on('state:reset', () => {
    renderCounts();
  });

  eventBus.on('audio:state', () => {
    renderAudio();
  });

  eventBus.on('activity:change', ({ active }) => {
    if (surpriseBtn instanceof HTMLButtonElement) {
      surpriseBtn.disabled = active !== null;
    }
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
