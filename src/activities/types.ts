import type { ActivityId } from '../core/eventBus.ts';
import type { BanterDirector } from '../creatures/banterDirector.ts';
import type { VoiceManager } from '../creatures/voiceManager.ts';
import type { ParticleCanvas } from '../world/particleCanvas.ts';
import type { WorldEventsDirector } from '../world/worldEvents.ts';

export interface ActivityDeps {
  stage: HTMLElement;
  svg: SVGSVGElement;
  stageFxLayer: HTMLElement;
  activityLayer: HTMLElement;
  particles: ParticleCanvas;
  worldEvents: WorldEventsDirector;
  banterDirector: BanterDirector;
  voiceManager: VoiceManager;
}

export interface ActivityController {
  readonly id: ActivityId;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}
