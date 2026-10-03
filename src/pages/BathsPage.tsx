import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Card } from '@/components/ui';
import { addBath, listBaths } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BathEvent } from '@/db/types';
import { bathEventToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';

export function BathsPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [events, setEvents] = useState<BathEvent[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listBaths(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Bain" toolId="baths" />
      <button
        type="button"
        className="big"
        onClick={async () => {
          if (!baby) return;
          await addBath(baby.id);
          navigate('/');
        }}>
        Bain
      </button>
      <Card>
        <h2>Aujourd’hui · {today.length}</h2>
        {today.length === 0 ? (
          <p className="muted">Un appui enregistre l’heure tout de suite.</p>
        ) : (
          today.map((row) => (
            <JournalLine
              key={row.id}
              item={bathEventToActivity(row)}
              onClick={() => setEditing(bathEventToActivity(row))}
            />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
