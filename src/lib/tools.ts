const FAVORITES_KEY = 'abel-tool-favorites';
export const FAVORITES_CHANGED = 'abel-favorites-changed';
const EXERCISE_PREFIX = 'exercise:';

export type ToolId =
  | 'feeding'
  | 'bottle'
  | 'solids'
  | 'supplements'
  | 'diapers'
  | 'pumping'
  | 'growth'
  | 'sleep'
  | 'temperature'
  | 'notes'
  | 'baths';

export type FavoriteId = ToolId | `${typeof EXERCISE_PREFIX}${string}`;

export const TOOL_IDS: ToolId[] = [
  'feeding',
  'bottle',
  'solids',
  'supplements',
  'diapers',
  'baths',
  'pumping',
  'growth',
  'sleep',
  'temperature',
  'notes',
];

export const TOOLS: Record<ToolId, { label: string; route: string; section: 'apports' | 'suivi' }> = {
  feeding: { label: 'Allaitement', route: '/feeding', section: 'apports' },
  bottle: { label: 'Biberon', route: '/bottle', section: 'apports' },
  solids: { label: 'Diversification', route: '/solids', section: 'apports' },
  supplements: { label: 'Compléments', route: '/supplements', section: 'apports' },
  diapers: { label: 'Couche', route: '/diapers', section: 'suivi' },
  baths: { label: 'Bain', route: '/baths', section: 'suivi' },
  pumping: { label: 'Tire-lait', route: '/pumping', section: 'suivi' },
  growth: { label: 'Croissance', route: '/growth', section: 'suivi' },
  sleep: { label: 'Sommeil', route: '/sleep', section: 'suivi' },
  temperature: { label: 'Température', route: '/temperature', section: 'suivi' },
  notes: { label: 'Notes', route: '/notes', section: 'suivi' },
};

export function toolsInSection(section: 'apports' | 'suivi'): ToolId[] {
  return TOOL_IDS.filter((id) => TOOLS[id].section === section);
}

export function exerciseFavoriteId(id: string): FavoriteId {
  return `${EXERCISE_PREFIX}${id}`;
}

export function exerciseIdFromFavorite(id: string): string | null {
  return id.startsWith(EXERCISE_PREFIX) ? id.slice(EXERCISE_PREFIX.length) : null;
}

export function exerciseRoute(id: string): string {
  return `/exercises/${id}`;
}

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as string[]).includes(value);
}

function isFavoriteId(value: string): value is FavoriteId {
  if (isToolId(value)) return true;
  return value.startsWith(EXERCISE_PREFIX) && value.length > EXERCISE_PREFIX.length;
}

export function readToolFavorites(): FavoriteId[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is FavoriteId => typeof id === 'string' && isFavoriteId(id));
  } catch {
    return [];
  }
}

function writeFavorites(next: FavoriteId[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FAVORITES_CHANGED));
}

export function isToolFavorite(id: FavoriteId): boolean {
  return readToolFavorites().includes(id);
}

export function toggleToolFavorite(id: FavoriteId): boolean {
  const current = readToolFavorites();
  const next = current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
  writeFavorites(next);
  return next.includes(id);
}

export function removeToolFavorite(id: FavoriteId) {
  const current = readToolFavorites();
  if (!current.includes(id)) return;
  writeFavorites(current.filter((row) => row !== id));
}
