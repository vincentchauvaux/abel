import { Apple, Bath, Droplets, Heart, Milk, Moon, NotebookPen, Pill, Scale, Thermometer, Timer, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ActiveNowPanel } from '@/components/ActiveNowPanel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { listExerciseItems } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import {
  exerciseIsRunning,
  formatExerciseCountdown,
  formatExerciseDuration,
} from '@/lib/exercises';
import { TOOLS, toolsInSection, type ToolId } from '@/lib/tools';
import {
  readToolsPageSection,
  writeToolsSection,
  TOOLS_PAGE_SECTION_OPTIONS,
  type ToolsPageSection,
} from '@/lib/tools-section';

const ICONS: Record<ToolId, LucideIcon> = {
  feeding: Heart,
  bottle: Milk,
  solids: Apple,
  supplements: Pill,
  diapers: Droplets,
  baths: Bath,
  pumping: Milk,
  growth: Scale,
  sleep: Moon,
  temperature: Thermometer,
  notes: NotebookPen,
};

const HINT: Record<ToolsPageSection, string> = {
  apports: 'Ce que l’on donne',
  suivi: 'Ce que l’on observe',
  exercices: 'Comptes à rebours',
};

export function ToolsPage() {
  const { baby, tick } = useDb();
  const [section, setSection] = useState<ToolsPageSection>(() => readToolsPageSection());
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const navigate = useNavigate();
  const running = exercises.some((row) => exerciseIsRunning(row));
  const now = useNow(section === 'exercices' && running);

  useEffect(() => {
    if (!baby) return;
    listExerciseItems(baby.id).then(setExercises);
  }, [baby, tick]);

  const choose = (next: ToolsPageSection) => {
    setSection(next);
    writeToolsSection(next);
  };

  const items = section === 'exercices' ? [] : toolsInSection(section);

  return (
    <div className="screen">
      <h1>Outils</h1>
      <ActiveNowPanel />
      <SegmentedControl
        size="lg"
        value={section}
        onChange={choose}
        options={TOOLS_PAGE_SECTION_OPTIONS}
        ariaLabel="Section d’outils"
      />
      <p className="muted">{HINT[section]}</p>
      {section === 'exercices' ? (
        exercises.length === 0 ? (
          <p className="muted">
            Ajoute un intitulé et une durée dans <Link to="/baby">Bébé → Exercices</Link>.
          </p>
        ) : (
          <div className="tiles">
            {exercises.map((item) => {
              const live = exerciseIsRunning(item, now);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="tile"
                  onClick={() => navigate(`/exercises/${item.id}`)}>
                  <span className="icon-wrap">
                    <Timer size={28} />
                  </span>
                  {item.title}
                  <small>{live ? formatExerciseCountdown(item, now) : formatExerciseDuration(item.durationMinutes)}</small>
                </button>
              );
            })}
          </div>
        )
      ) : (
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
      )}
    </div>
  );
}
