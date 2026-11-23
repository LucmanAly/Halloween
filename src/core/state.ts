import { eventBus } from './eventBus.ts';

export interface SaveState {
  candy: number;
  secretsFound: string[];
  potionsDiscovered: string[];
  unlockedCostumes: string[];
  equippedCostumes: Record<string, string>;
  audio: {
    muted: boolean;
    musicVolume: number;
    sfxVolume: number;
  };
  reducedMotion: boolean;
  ageMode: 'easy' | 'playful';
}

const STORAGE_KEY = 'booville_save_v1';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createDefaultState(): SaveState {
  return {
    candy: 0,
    secretsFound: [],
    potionsDiscovered: [],
    unlockedCostumes: [],
    equippedCostumes: {},
    audio: {
      muted: false,
      musicVolume: 0.45,
      sfxVolume: 0.85,
    },
    reducedMotion: prefersReducedMotion(),
    ageMode: 'easy',
  };
}

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function loadState(): SaveState {
  const defaults = createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      candy: typeof parsed.candy === 'number' && parsed.candy >= 0 ? Math.floor(parsed.candy) : 0,
      secretsFound: Array.isArray(parsed.secretsFound)
        ? parsed.secretsFound.filter((item): item is string => typeof item === 'string')
        : [],
      potionsDiscovered: Array.isArray(parsed.potionsDiscovered)
        ? parsed.potionsDiscovered.filter((item): item is string => typeof item === 'string')
        : [],
      unlockedCostumes: Array.isArray(parsed.unlockedCostumes)
        ? parsed.unlockedCostumes.filter((item): item is string => typeof item === 'string')
        : [],
      equippedCostumes:
        parsed.equippedCostumes && typeof parsed.equippedCostumes === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.equippedCostumes).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            )
          : {},
      audio: {
        muted: Boolean(parsed.audio?.muted ?? defaults.audio.muted),
        musicVolume: clamp01(parsed.audio?.musicVolume ?? defaults.audio.musicVolume, defaults.audio.musicVolume),
        sfxVolume: clamp01(parsed.audio?.sfxVolume ?? defaults.audio.sfxVolume, defaults.audio.sfxVolume),
      },
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : defaults.reducedMotion,
      ageMode: parsed.ageMode === 'playful' ? 'playful' : 'easy',
    };
  } catch {
    return defaults;
  }
}

class StateStore {
  private state: SaveState = loadState();

  get(): Readonly<SaveState> {
    return this.state;
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota or private-browsing blocks silently.
    }
  }

  addCandy(amount: number, x?: number, y?: number, source = 'courtyard'): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const delta = Math.round(amount);
    this.state.candy += delta;
    this.persist();
    eventBus.emit('candy:add', { amount: delta, x, y, source });
  }

  spendCandy(amount: number, source = 'shop'): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.round(amount);
    if (this.state.candy < cost) return false;
    this.state.candy -= cost;
    this.persist();
    eventBus.emit('candy:spend', { amount: cost, source });
    return true;
  }

  discoverPotion(recipeId: string): boolean {
    if (this.state.potionsDiscovered.includes(recipeId)) return false;
    this.state.potionsDiscovered = [...this.state.potionsDiscovered, recipeId];
    this.persist();
    eventBus.emit('potion:discovered', {
      recipeId,
      total: this.state.potionsDiscovered.length,
    });
    return true;
  }

  unlockCostume(costumeId: string): boolean {
    if (this.state.unlockedCostumes.includes(costumeId)) return false;
    this.state.unlockedCostumes = [...this.state.unlockedCostumes, costumeId];
    this.persist();
    eventBus.emit('costume:unlocked', { costumeId });
    return true;
  }

  equipCostume(creatureId: string, costumeId: string | null): void {
    const next = { ...this.state.equippedCostumes };
    if (costumeId) {
      next[creatureId] = costumeId;
    } else {
      delete next[creatureId];
    }
    this.state.equippedCostumes = next;
    this.persist();
    eventBus.emit('costume:equipped', { creatureId, costumeId });
  }

  discoverSecret(id: string, label: string, x: number, y: number): boolean {
    if (this.state.secretsFound.includes(id)) return false;
    this.state.secretsFound = [...this.state.secretsFound, id];
    this.persist();
    eventBus.emit('secret:discovered', { id, label, x, y });
    return true;
  }

  updateAudio(patch: Partial<SaveState['audio']>): void {
    this.state.audio = {
      muted: patch.muted ?? this.state.audio.muted,
      musicVolume: clamp01(patch.musicVolume ?? this.state.audio.musicVolume, this.state.audio.musicVolume),
      sfxVolume: clamp01(patch.sfxVolume ?? this.state.audio.sfxVolume, this.state.audio.sfxVolume),
    };
    this.persist();
    eventBus.emit('audio:state', { ...this.state.audio });
  }

  updateSettings(patch: Partial<Pick<SaveState, 'reducedMotion' | 'ageMode'>>): void {
    if (typeof patch.reducedMotion === 'boolean') {
      this.state.reducedMotion = patch.reducedMotion;
    }
    if (patch.ageMode === 'easy' || patch.ageMode === 'playful') {
      this.state.ageMode = patch.ageMode;
    }
    this.persist();
    eventBus.emit('settings:changed', {
      reducedMotion: this.state.reducedMotion,
      ageMode: this.state.ageMode,
    });
  }

  resetProgress(): void {
    const keepAudio = { ...this.state.audio };
    const keepReduced = this.state.reducedMotion;
    const keepAgeMode = this.state.ageMode;
    this.state = {
      ...createDefaultState(),
      audio: keepAudio,
      reducedMotion: keepReduced,
      ageMode: keepAgeMode,
    };
    this.persist();
    eventBus.emit('state:reset', {});
  }
}

export const gameState = new StateStore();
