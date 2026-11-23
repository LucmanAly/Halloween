import { audioEngine } from '../core/audioEngine.ts';
import { BanterDirector } from '../creatures/banterDirector.ts';
import { voiceManager } from '../creatures/voiceManager.ts';
import { ParticleCanvas } from '../world/particleCanvas.ts';
import { WorldEventsDirector } from '../world/worldEvents.ts';

export function initWelcomeCurtain(
  particles: ParticleCanvas,
  worldEvents: WorldEventsDirector,
  banterDirector: BanterDirector,
): void {
  const curtain = document.getElementById('welcome-curtain');
  const playBtn = document.getElementById('play-btn');
  const stage = document.getElementById('game-stage');

  if (!curtain || !playBtn || !stage) return;

  let entered = false;

  playBtn.addEventListener('click', () => {
    if (entered) return;
    entered = true;

    void audioEngine.unlock().then(() => audioEngine.playSparkleChime()).catch(() => {});

    stage.removeAttribute('inert');
    curtain.classList.add('is-leaving');
    curtain.setAttribute('inert', '');

    window.setTimeout(() => {
      curtain.setAttribute('hidden', '');
    }, 460);

    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.45;
    particles.spawnBurst(cx, cy, ['#ffd166', '#ff7eb6', '#6ef3b3', '#b892ff'], 24, 'star');

    worldEvents.start();
    banterDirector.start();
    banterDirector.greetOnEnter();
    window.setTimeout(() => voiceManager.preloadPriorityVoices(), 1200);
    document.getElementById('courtyard-title')?.focus();
  });
}
