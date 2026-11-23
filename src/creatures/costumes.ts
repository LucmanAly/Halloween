import type { CreatureId } from './types.ts';

export type CostumeSlot = 'hat' | 'face' | 'neck';

export interface CostumeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  slot: CostumeSlot;
  accent: string;
}

export const COSTUMES_CATALOG: readonly CostumeDef[] = [
  {
    id: 'party-hat',
    name: 'Party Cone Hat',
    emoji: '🎉',
    cost: 0,
    slot: 'hat',
    accent: '#ff7eb6',
  },
  {
    id: 'sparkle-bowtie',
    name: 'Rainbow Bowtie',
    emoji: '🎀',
    cost: 0,
    slot: 'neck',
    accent: '#6ef3b3',
  },
  {
    id: 'royal-crown',
    name: 'Golden Crown',
    emoji: '👑',
    cost: 10,
    slot: 'hat',
    accent: '#ffd166',
  },
  {
    id: 'star-shades',
    name: 'Disco Star Shades',
    emoji: '⭐',
    cost: 15,
    slot: 'face',
    accent: '#7ef9ff',
  },
  {
    id: 'flower-crown',
    name: 'Autumn Flower Crown',
    emoji: '🌼',
    cost: 20,
    slot: 'hat',
    accent: '#ff9f43',
  },
  {
    id: 'wizard-hat',
    name: 'Galaxy Wizard Hat',
    emoji: '🧙',
    cost: 25,
    slot: 'hat',
    accent: '#b892ff',
  },
] as const;

export const TOTAL_COSTUMES = COSTUMES_CATALOG.length;

export function getCostumeDef(costumeId: string): CostumeDef | undefined {
  return COSTUMES_CATALOG.find((item) => item.id === costumeId);
}

export function isCostumeUnlocked(
  costumeId: string,
  unlockedList: readonly string[],
): boolean {
  const def = getCostumeDef(costumeId);
  if (!def) return false;
  return def.cost === 0 || unlockedList.includes(costumeId);
}

export interface AccessoryAnchor {
  y: number;
  scale: number;
}

export const CREATURE_ACCESSORY_ANCHORS: Record<
  CreatureId,
  Record<CostumeSlot, AccessoryAnchor>
> = {
  pip: { hat: { y: -84, scale: 1.05 }, face: { y: -55, scale: 1.05 }, neck: { y: -18, scale: 1.0 } },
  boobell: { hat: { y: -48, scale: 0.95 }, face: { y: -12, scale: 0.95 }, neck: { y: 20, scale: 0.9 } },
  winnie: { hat: { y: -88, scale: 0.95 }, face: { y: -67, scale: 0.82 }, neck: { y: -45, scale: 0.85 } },
  barnaby: { hat: { y: -98, scale: 0.92 }, face: { y: -78, scale: 0.88 }, neck: { y: -55, scale: 0.92 } },
  frankie: { hat: { y: -114, scale: 1.05 }, face: { y: -88, scale: 0.96 }, neck: { y: -60, scale: 1.05 } },
  bitey: { hat: { y: -24, scale: 0.82 }, face: { y: -6, scale: 0.78 }, neck: { y: 17, scale: 0.78 } },
};

export function renderCostumeMarkup(costumeId: string): string {
  switch (costumeId) {
    case 'party-hat':
      return `
        <g>
          <polygon points="-18,6 0,-36 18,6" fill="#ff7eb6" stroke="#260c2e" stroke-width="2.6" stroke-linejoin="round" />
          <path d="M-12,-8 L12,-14 M-7,-21 L8,-24" stroke="#ffd166" stroke-width="3.5" stroke-linecap="round" />
          <ellipse cx="0" cy="6" rx="20" ry="5" fill="#6ef3b3" stroke="#260c2e" stroke-width="2.2" />
          <circle cx="0" cy="-38" r="6.5" fill="#ffe66d" stroke="#260c2e" stroke-width="2" />
        </g>
      `;

    case 'sparkle-bowtie':
      return `
        <g>
          <polygon points="0,0 -20,-10 -17,10" fill="#6ef3b3" stroke="#200b3b" stroke-width="2.4" stroke-linejoin="round" />
          <polygon points="0,0 20,-10 17,10" fill="#ff7eb6" stroke="#200b3b" stroke-width="2.4" stroke-linejoin="round" />
          <circle cx="0" cy="0" r="6" fill="#ffd166" stroke="#200b3b" stroke-width="2.2" />
          <circle cx="-11" cy="0" r="2" fill="#ffffff" />
          <circle cx="11" cy="0" r="2" fill="#ffffff" />
        </g>
      `;

    case 'royal-crown':
      return `
        <g>
          <path d="M-20,6 L-23,-18 L-10,-6 L0,-24 L10,-6 L23,-18 L20,6 Z" fill="#ffd166" stroke="#472000" stroke-width="2.6" stroke-linejoin="round" />
          <rect x="-20" y="2" width="40" height="6.5" rx="3" fill="#ff9f43" stroke="#472000" stroke-width="2.2" />
          <circle cx="0" cy="-24" r="4" fill="#ff5d8f" stroke="#472000" stroke-width="1.6" />
          <circle cx="-12" cy="-3" r="3" fill="#72d6ff" />
          <circle cx="12" cy="-3" r="3" fill="#6ef3b3" />
        </g>
      `;

    case 'star-shades':
      return `
        <g>
          <line x1="-5" y1="-1" x2="5" y2="-1" stroke="#ffd166" stroke-width="3.2" stroke-linecap="round" />
          <polygon points="-13,-13 -9,-4 0,-3 -7,3 -5,12 -13,7 -21,12 -19,3 -26,-3 -17,-4" fill="#7ef9ff" stroke="#200b3b" stroke-width="2.2" stroke-linejoin="round" />
          <polygon points="13,-13 17,-4 26,-3 19,3 21,12 13,7 5,12 7,3 0,-3 9,-4" fill="#ff9ee0" stroke="#200b3b" stroke-width="2.2" stroke-linejoin="round" />
          <line x1="-18" y1="-5" x2="-11" y2="-1" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.85" />
          <line x1="8" y1="-5" x2="15" y2="-1" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.85" />
        </g>
      `;

    case 'flower-crown':
      return `
        <g>
          <path d="M-25,3 Q0,-5 25,3" fill="none" stroke="#5cc447" stroke-width="6" stroke-linecap="round" />
          <g transform="translate(-16, -1)">
            <circle cx="-4" cy="-3" r="4" fill="#ff7eb6" />
            <circle cx="4" cy="-3" r="4" fill="#ff7eb6" />
            <circle cx="0" cy="4" r="4" fill="#ff7eb6" />
            <circle cx="0" cy="0" r="3.5" fill="#ffe66d" />
          </g>
          <g transform="translate(0, -4)">
            <circle cx="-5" cy="-3" r="4.5" fill="#72d6ff" />
            <circle cx="5" cy="-3" r="4.5" fill="#72d6ff" />
            <circle cx="0" cy="4" r="4.5" fill="#72d6ff" />
            <circle cx="0" cy="0" r="3.8" fill="#ffd166" />
          </g>
          <g transform="translate(16, -1)">
            <circle cx="-4" cy="-3" r="4" fill="#ff9f43" />
            <circle cx="4" cy="-3" r="4" fill="#ff9f43" />
            <circle cx="0" cy="4" r="4" fill="#ff9f43" />
            <circle cx="0" cy="0" r="3.5" fill="#fff7b0" />
          </g>
        </g>
      `;

    case 'wizard-hat':
      return `
        <g>
          <ellipse cx="0" cy="5" rx="34" ry="7.5" fill="#3a1b70" stroke="#180833" stroke-width="2.8" />
          <path d="M-19,4 L-5,-34 Q2,-42 15,-27 L19,4 Z" fill="#5e2eb8" stroke="#180833" stroke-width="2.8" stroke-linejoin="round" />
          <path d="M-16,-1 Q0,3 16,-1" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round" />
          <polygon points="-2,-21 0,-16 5,-15 1,-12 2,-7 -2,-10 -6,-7 -5,-12 -9,-15 -4,-16" fill="#ffe066" />
          <circle cx="7" cy="-9" r="2.3" fill="#7ef9ff" />
          <circle cx="-7" cy="-9" r="2" fill="#ff9ee0" />
        </g>
      `;

    default:
      return '';
  }
}

export function renderCostumePreviewSvg(costumeId: string): string {
  return `
    <svg viewBox="-40 -42 80 62" class="costume-preview-svg" aria-hidden="true">
      ${renderCostumeMarkup(costumeId)}
    </svg>
  `.trim();
}
