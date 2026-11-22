export type CreatureId = 'pip' | 'boobell' | 'winnie' | 'barnaby' | 'frankie' | 'bitey';

export type MouthShape = 'closed' | 'small' | 'open' | 'wide' | 'smile';

export type VoiceCategory =
  | 'greeting'
  | 'tap_gag'
  | 'banter_a'
  | 'banter_b'
  | 'world_react'
  | 'hint';

export interface VoiceLine {
  id: string;
  creatureId: CreatureId;
  category: VoiceCategory;
  text: string;
  emoji: string;
  file: string;
  durationMs: number;
  pairId?: string;
}

export interface VoiceManifest {
  version: number;
  generatedAt: string;
  lines: VoiceLine[];
}

export interface CreatureConfig {
  id: CreatureId;
  name: string;
  title: string;
  bubbleColor: string;
  homeX: number;
  homeY: number;
  locomotion: 'walk' | 'float' | 'fly';
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface CreatureInstance {
  config: CreatureConfig;
  root: SVGGElement;
  setPosition: (x: number, y: number, facing: 1 | -1) => void;
  setMouth: (shape: MouthShape) => void;
  lookAt: (svgX: number, svgY: number) => void;
  playTapGag: () => void;
  setCostume: (costumeId: string | null) => void;
}
