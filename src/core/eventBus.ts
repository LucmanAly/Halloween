export type ActivityId = 'cauldron' | 'flashlight' | 'trick-or-treat' | 'dress-up';

export interface GameEvents {
  'candy:add': { amount: number; x?: number; y?: number; source: string };
  'candy:spend': { amount: number; source: string };
  'secret:discovered': { id: string; label: string; x: number; y: number };
  'potion:discovered': { recipeId: string; total: number };
  'costume:unlocked': { costumeId: string };
  'costume:equipped': { creatureId: string; costumeId: string | null };
  'activity:change': { active: ActivityId | null };
  'dance:change': { active: boolean };
  'world:speech': {
    text: string;
    emoji: string;
    x: number;
    y: number;
    color?: string;
    durationMs?: number;
  };
  'world:burst': {
    x: number;
    y: number;
    colors?: string[];
    count?: number;
    shape?: 'star' | 'candy' | 'bubble' | 'sparkle';
  };
  'world:event': {
    type: 'candy-cart' | 'bubble-storm' | 'shooting-stars' | 'bat-flock';
  };
  'audio:state': {
    muted: boolean;
    musicVolume: number;
    sfxVolume: number;
  };
  'settings:changed': {
    reducedMotion: boolean;
    ageMode: 'easy' | 'playful';
  };
  'creature:speak': {
    creatureId: string;
    lineId: string;
    text: string;
  };
  'state:reset': Record<string, never>;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private readonly listeners = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const handler of bucket) {
      (handler as Handler<GameEvents[K]>)(payload);
    }
  }
}

export const eventBus = new EventBus();
