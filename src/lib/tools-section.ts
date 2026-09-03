const KEY = 'abel-tools-section';

export type ToolsSection = 'apports' | 'suivi';

export const TOOL_SECTION_OPTIONS: { key: ToolsSection; label: string }[] = [
  { key: 'apports', label: 'Apports' },
  { key: 'suivi', label: 'Suivi' },
];

export function readToolsSection(): ToolsSection {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'suivi' ? 'suivi' : 'apports';
  } catch {
    return 'apports';
  }
}

export function writeToolsSection(section: ToolsSection) {
  localStorage.setItem(KEY, section);
}
