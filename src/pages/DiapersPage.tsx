import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Card } from '@/components/ui';
import { addDiaper, listDiapers } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperEvent, DiaperKind } from '@/db/types';
import { diaperEventToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';

export function DiapersPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [events, setEvents] = useState<DiaperEvent[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listDiapers(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  const note = async (kind: DiaperKind) => {
    if (!baby) return;
    await addDiaper(baby.id, kind);
    navigate('/');
  };

  return (
    <div className="screen">
      <ModuleHeader title="Couche" toolId="diapers" />
      <div className="grid-2">
        <button type="button" className="big pee" onClick={() => void note('PEE')}>
          Pipi
        </button>
        <button type="button" className="big poo" onClick={() => void note('POO')}>
          Caca
        </button>
      </div>
      <button type="button" className="big" onClick={() => void note('BOTH')}>
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
