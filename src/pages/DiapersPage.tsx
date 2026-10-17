import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Card } from '@/components/ui';
import { addDiaper, listDiapers } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperEvent, DiaperKind } from '@/db/types';
import { useOnceLock } from '@/hooks/use-once-lock';
import { diaperEventToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';
import { returnHome } from '@/lib/return-home';

export function DiapersPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const { busy, run } = useOnceLock();
  const [events, setEvents] = useState<DiaperEvent[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listDiapers(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  const note = (kind: DiaperKind) => {
    if (!baby) return;
    void run(async () => {
      await addDiaper(baby.id, kind);
      returnHome(navigate);
    });
  };

  return (
    <div className="screen">
      <ModuleHeader title="Couche" toolId="diapers" />
      <div className="grid-2">
        <button type="button" className="big pee" disabled={busy} onClick={() => note('PEE')}>
          Pipi
        </button>
        <button type="button" className="big poo" disabled={busy} onClick={() => note('POO')}>
          Caca
        </button>
      </div>
      <button type="button" className="big" disabled={busy} onClick={() => note('BOTH')}>
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
