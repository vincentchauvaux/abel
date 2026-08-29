import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip } from '@/components/ui';
import { addDiaper, deleteDiaper, listDiapers, updateDiaper } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperEvent } from '@/db/types';
import { formatTime, startOfLocalDay } from '@/lib/dates';
import { diaperLabel } from '@/lib/labels';

export function DiapersPage() {
  const { baby, tick } = useDb();
  const [events, setEvents] = useState<DiaperEvent[]>([]);
  const [editing, setEditing] = useState<DiaperEvent | null>(null);

  useEffect(() => {
    if (!baby) return;
    listDiapers(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Couche" />
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
            <button
              key={row.id}
              type="button"
              className="line"
              style={{ width: '100%', background: 'none', border: 0, padding: '8px 0', cursor: 'pointer' }}
              onClick={() => setEditing(row)}>
              <strong>{formatTime(row.occurredAt)}</strong>
              <span className="muted">{diaperLabel[row.kind]}</span>
            </button>
          ))
        )}
      </Card>
      {editing ? (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Modifier</h2>
            <div className="row">
              {(['PEE', 'POO', 'BOTH'] as const).map((kind) => (
                <Chip
                  key={kind}
                  label={diaperLabel[kind]}
                  selected={editing.kind === kind}
                  onClick={() => {
                    updateDiaper(editing.id, kind);
                    setEditing({ ...editing, kind });
                  }}
                />
              ))}
            </div>
            <Button
              tone="danger"
              onClick={() => {
                if (confirm('Supprimer cette couche ?')) {
                  deleteDiaper(editing.id);
                  setEditing(null);
                }
              }}>
              Supprimer
            </Button>
            <Button tone="muted" onClick={() => setEditing(null)}>
              Fermer
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
