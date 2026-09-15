import { useCallback, useState } from 'react';

export const DASH_SECTION_IDS = [
  'favorites',
  'charts',
  'growth',
  'notes',
  'alerts',
  'apports',
  'suivi',
  'exercises',
] as const;

export type DashSectionId = (typeof DASH_SECTION_IDS)[number];

export const DASH_SECTION_TITLES: Record<DashSectionId, string> = {
  favorites: 'Favoris',
  charts: 'Graphiques',
  growth: 'Poids et taille',
  notes: 'Notes',
  alerts: 'Alertes',
  apports: 'Apports',
  suivi: 'Suivi',
  exercises: 'Exercices',
};

const STORAGE_KEY = 'abel.dash-sections';

const DEFAULT_COLLAPSED: Partial<Record<DashSectionId, boolean>> = {
  notes: true,
};

export type DashLayout = {
  order: DashSectionId[];
  collapsed: Partial<Record<DashSectionId, boolean>>;
};

function isSectionId(value: unknown): value is DashSectionId {
  return typeof value === 'string' && (DASH_SECTION_IDS as readonly string[]).includes(value);
}

function normalize(raw: unknown): DashLayout {
  const data = raw && typeof raw === 'object' ? (raw as Partial<DashLayout>) : {};
  const seen = new Set<DashSectionId>();
  const order: DashSectionId[] = [];
  if (Array.isArray(data.order)) {
    for (const id of data.order) {
      if (!isSectionId(id) || seen.has(id)) continue;
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of DASH_SECTION_IDS) {
    if (seen.has(id)) continue;
    order.push(id);
  }
  const collapsed: Partial<Record<DashSectionId, boolean>> = { ...DEFAULT_COLLAPSED };
  if (data.collapsed && typeof data.collapsed === 'object') {
    for (const id of DASH_SECTION_IDS) {
      const value = data.collapsed[id];
      if (typeof value === 'boolean') collapsed[id] = value;
    }
  }
  return { order, collapsed };
}

export function readDashLayout(): DashLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return normalize(null);
  }
}

export function writeDashLayout(layout: DashLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function isDashSectionCollapsed(layout: DashLayout, id: DashSectionId): boolean {
  if (layout.collapsed[id] !== undefined) return Boolean(layout.collapsed[id]);
  return Boolean(DEFAULT_COLLAPSED[id]);
}

export function moveDashSection(
  order: DashSectionId[],
  from: DashSectionId,
  over: DashSectionId,
): DashSectionId[] {
  if (from === over) return order;
  const fromIdx = order.indexOf(from);
  const overIdx = order.indexOf(over);
  if (fromIdx < 0 || overIdx < 0) return order;
  const next = order.filter((id) => id !== from);
  const insertAt = next.indexOf(over);
  if (fromIdx < overIdx) next.splice(insertAt + 1, 0, from);
  else next.splice(insertAt, 0, from);
  return next;
}

export function useDashLayout() {
  const [layout, setLayout] = useState(readDashLayout);

  const persist = useCallback((next: DashLayout) => {
    setLayout(next);
    writeDashLayout(next);
  }, []);

  const toggle = useCallback(
    (id: DashSectionId) => {
      persist({
        ...layout,
        collapsed: { ...layout.collapsed, [id]: !isDashSectionCollapsed(layout, id) },
      });
    },
    [layout, persist],
  );

  const move = useCallback(
    (from: DashSectionId, over: DashSectionId) => {
      persist({ ...layout, order: moveDashSection(layout.order, from, over) });
    },
    [layout, persist],
  );

  return {
    order: layout.order,
    isCollapsed: (id: DashSectionId) => isDashSectionCollapsed(layout, id),
    toggle,
    move,
  };
}
