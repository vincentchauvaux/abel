const KEY = 'abel-tools-section';

export type ToolsSection = 'apports' | 'suivi';
export type ToolsPageSection = ToolsSection | 'exercices';

export const TOOL_SECTION_OPTIONS: { key: ToolsSection; label: string }[] = [
  { key: 'apports', label: 'Apports' },
  { key: 'suivi', label: 'Suivi' },
];

export const TOOLS_PAGE_SECTION_OPTIONS: { key: ToolsPageSection; label: string }[] = [
  { key: 'apports', label: 'Apports' },
  { key: 'suivi', label: 'Suivi' },
  { key: 'exercices', label: 'Exercices' },
];

export function readToolsSection(): ToolsSection {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'suivi' ? 'suivi' : 'apports';
  } catch {
    return 'apports';
  }
}

export function readToolsPageSection(): ToolsPageSection {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'suivi' || v === 'exercices') return v;
    return 'apports';
  } catch {
    return 'apports';
  }
}

export function writeToolsSection(section: ToolsPageSection) {
  localStorage.setItem(KEY, section);
}
