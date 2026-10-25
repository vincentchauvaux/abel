/** Section d’accordéon ouverte sur Bébé (`null` = tout fermé). */

export const BABY_SECTION_IDS = [
  'identity',
  'album',
  'goals',
  'exercises',
  'info',
  'horoscope',
  'alerts',
  'journal',
] as const;

export type BabySectionId = (typeof BABY_SECTION_IDS)[number];

const STORAGE_KEY = 'abel.baby-section';

function isSectionId(value: unknown): value is BabySectionId {
  return typeof value === 'string' && (BABY_SECTION_IDS as readonly string[]).includes(value);
}

/** `undefined` = jamais enregistré (1ʳᵉ visite / guidage identité·objectifs). */
export function readBabyOpenSection(): BabySectionId | null | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return undefined;
    const data = JSON.parse(raw) as { open?: unknown };
    if (data.open === null) return null;
    if (isSectionId(data.open)) return data.open;
    return null;
  } catch {
    return undefined;
  }
}

export function writeBabyOpenSection(open: BabySectionId | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open }));
  } catch {
    /* ignore */
  }
}
