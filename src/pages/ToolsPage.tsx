import { Apple, Droplets, Heart, Milk, Moon, NotebookPen, Pill, Scale, Thermometer, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActiveNowPanel } from '@/components/ActiveNowPanel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TOOLS, toolsInSection, type ToolId } from '@/lib/tools';
import { readToolsSection, writeToolsSection, TOOL_SECTION_OPTIONS, type ToolsSection } from '@/lib/tools-section';

const ICONS: Record<ToolId, LucideIcon> = {
  feeding: Heart,
  bottle: Milk,
  solids: Apple,
  supplements: Pill,
  diapers: Droplets,
  pumping: Milk,
  growth: Scale,
  sleep: Moon,
  temperature: Thermometer,
  notes: NotebookPen,
};

export function ToolsPage() {
  const [section, setSection] = useState<ToolsSection>(() => readToolsSection());
  const navigate = useNavigate();

  const choose = (next: ToolsSection) => {
    setSection(next);
    writeToolsSection(next);
  };

  const items = toolsInSection(section);

  return (
    <div className="screen">
      <h1>Outils</h1>
      <ActiveNowPanel />
      <SegmentedControl
        size="lg"
        value={section}
        onChange={choose}
        options={TOOL_SECTION_OPTIONS}
        ariaLabel="Section d’outils"
      />
      <p className="muted">{section === 'apports' ? 'Ce que l’on donne' : 'Ce que l’on observe'}</p>
      <div className="tiles">
        {items.map((id) => {
          const Icon = ICONS[id];
          const tool = TOOLS[id];
          return (
            <button key={id} type="button" className="tile" onClick={() => navigate(tool.route)}>
              <span className="icon-wrap">
                <Icon size={28} />
              </span>
              {tool.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
