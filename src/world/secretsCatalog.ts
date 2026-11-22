export interface SecretMeta {
  id: string;
  label: string;
  emoji: string;
}

export const SECRETS_CATALOG: readonly SecretMeta[] = [
  { id: 'moon', label: 'Smiling Moon', emoji: '🌙' },
  { id: 'window-left', label: 'Kitty Window', emoji: '🐈‍⬛' },
  { id: 'window-right', label: 'Peek-a-Boo Window', emoji: '👀' },
  { id: 'manor-door', label: 'Knock-Knock Door', emoji: '🚪' },
  { id: 'musical-fence', label: 'Musical Fence', emoji: '🎵' },
  { id: 'cauldron', label: "Winnie's Cauldron", emoji: '🧪' },
  { id: 'lantern', label: 'Glowing Lantern', emoji: '🏮' },
  { id: 'spider', label: 'Friendly Spider', emoji: '🕷️' },
  { id: 'pumpkin-patch', label: 'Pumpkin Patch', emoji: '🎃' },
  { id: 'mystery-bushes', label: 'Giggling Bushes', emoji: '🌿' },
] as const;

export const TOTAL_SECRETS = SECRETS_CATALOG.length;

export function getSecretMeta(id: string): SecretMeta | undefined {
  return SECRETS_CATALOG.find((item) => item.id === id);
}
