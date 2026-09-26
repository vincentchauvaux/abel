import { useEffect, useState } from 'react';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Card } from '@/components/ui';
import { addDiaper, listDiapers } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperEvent } from '@/db/types';
import { diaperEventToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';

export function DiapersPage() {
  const { baby, tick } = useDb();
  const [events, setEvents] = useState<DiaperEvent[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listDiapers(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Couche" toolId="diapers" />
      <div className="grid-2">
        <button type="button" className="big pee" onClick={() => baby && addDiaper(baby.id, 'PEE')}>
          Pipi
        </button>
        <button type="button" className="big poo" onClick={() => baby && addDiaper(baby.id, 'POO')}>
          Caca
        </button>
      </div>
      <button type="button" className="big" onClick={() => baby && addDiaper(baby.id, 'BOTH')}>
        Les deux
      </button>
      <Card>
        <h2>Aujourd’hui · {today.length}</h2>
        {today.length === 0 ? (
          <p className="muted">Un appui enregistre l’heure tout de suite.</p>
        ) : (
          today.map((row) => (
            <JournalLine
              key={row.id}
              item={diaperEventToActivity(row)}
              onClick={() => setEditing(diaperEventToActivity(row))}
            />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
