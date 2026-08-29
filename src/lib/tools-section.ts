const KEY = 'abel-tools-section';

export type ToolsSection = 'apports' | 'suivi';

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
