import './styles/tokens.css';
import './styles/layout.css';
import './styles/scene.css';
import './styles/creatures.css';

import { eventBus } from './core/eventBus.ts';
import { gameState } from './core/state.ts';
import { BanterDirector } from './creatures/banterDirector.ts';
import { voiceManager } from './creatures/voiceManager.ts';
import { initHud } from './ui/hud.ts';
import { initSettingsDialog } from './ui/settingsDialog.ts';
import { initWelcomeCurtain } from './ui/welcomeCurtain.ts';
import { createCourtyardSvg } from './world/courtyardSvg.ts';
import { ParticleCanvas } from './world/particleCanvas.ts';
import { SecretsController } from './world/secretsController.ts';
import { WorldEventsDirector } from './world/worldEvents.ts';

function initSpeechLayer(): void {
  const speechLayer = document.getElementById('speech-layer');
  if (!speechLayer) return;

  eventBus.on('world:speech', (payload) => {
    while (speechLayer.children.length >= 3) {
      speechLayer.firstElementChild?.remove();
    }

    const clampedX = Math.min(window.innerWidth - 135, Math.max(135, payload.x));
    const clampedY = Math.min(window.innerHeight - 28, Math.max(126, payload.y));

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.style.setProperty('--bubble-x', `${Math.round(clampedX)}px`);
    bubble.style.setProperty('--bubble-y', `${Math.round(clampedY)}px`);
    if (payload.color) {
      bubble.style.setProperty('--bubble-accent', payload.color);
    }

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'speech-emoji';
    emojiSpan.setAttribute('aria-hidden', 'true');
    emojiSpan.textContent = payload.emoji;

    const textSpan = document.createElement('span');
    textSpan.textContent = payload.text;

    bubble.append(emojiSpan, textSpan);
    speechLayer.appendChild(bubble);

    const duration = payload.durationMs ?? 2400;
    window.setTimeout(() => {
      bubble.classList.add('is-fading');
      window.setTimeout(() => bubble.remove(), 260);
    }, duration);
  });
}

function bootstrap(): void {
  document.documentElement.dataset.reducedMotion = String(gameState.get().reducedMotion);

  const stage = document.getElementById('game-stage');
  const sceneLayer = document.getElementById('scene-layer');
  const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement | null;

  if (!stage || !sceneLayer || !canvas) {
    throw new Error('Missing required Boo-Ville stage elements');
  }

  const courtyardSvg = createCourtyardSvg();
  sceneLayer.appendChild(courtyardSvg);

  const particles = new ParticleCanvas(canvas, stage);
  particles.start();

  new SecretsController(stage, courtyardSvg, particles);
  const worldEvents = new WorldEventsDirector(courtyardSvg, particles);
  const banterDirector = new BanterDirector(stage, courtyardSvg, particles, voiceManager);
  void voiceManager.load();

  initSpeechLayer();
  const settings = initSettingsDialog();
  initHud(worldEvents, settings.open);
  initWelcomeCurtain(particles, worldEvents, banterDirector);
}

bootstrap();
