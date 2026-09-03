const FAVORITES_KEY = 'abel-tool-favorites';
export const FAVORITES_CHANGED = 'abel-favorites-changed';

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
  | 'notes';

export const TOOL_IDS: ToolId[] = [
  'feeding',
  'bottle',
  'solids',
  'supplements',
  'diapers',
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
  pumping: { label: 'Tire-lait', route: '/pumping', section: 'suivi' },
  growth: { label: 'Croissance', route: '/growth', section: 'suivi' },
  sleep: { label: 'Sommeil', route: '/sleep', section: 'suivi' },
  temperature: { label: 'Température', route: '/temperature', section: 'suivi' },
  notes: { label: 'Notes', route: '/notes', section: 'suivi' },
};

export function toolsInSection(section: 'apports' | 'suivi'): ToolId[] {
  return TOOL_IDS.filter((id) => TOOLS[id].section === section);
}

function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as string[]).includes(value);
}

export function readToolFavorites(): ToolId[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is ToolId => typeof id === 'string' && isToolId(id));
  } catch {
    return [];
  }
}

export function isToolFavorite(id: ToolId): boolean {
  return readToolFavorites().includes(id);
}

export function toggleToolFavorite(id: ToolId): boolean {
  const current = readToolFavorites();
  const next = current.includes(id) ? current.filter((row) => row !== id) : [...current, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FAVORITES_CHANGED));
  return next.includes(id);
}
