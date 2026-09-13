import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { addBath, deleteBath, listBaths, updateBath } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BathEvent } from '@/db/types';
import { formatTime, fromDatetimeLocalValue, startOfLocalDay, toDatetimeLocalValue } from '@/lib/dates';

export function BathsPage() {
  const { baby, tick } = useDb();
  const [events, setEvents] = useState<BathEvent[]>([]);
  const [editing, setEditing] = useState<BathEvent | null>(null);
  const [when, setWhen] = useState('');

  useEffect(() => {
    if (!baby) return;
    listBaths(baby.id).then(setEvents);
  }, [baby, tick]);

  const today = events.filter((row) => row.occurredAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Bain" toolId="baths" />
      <button type="button" className="big" onClick={() => baby && addBath(baby.id)}>
        Bain
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
              onClick={() => {
                setEditing(row);
                setWhen(toDatetimeLocalValue(row.occurredAt));
              }}>
              <strong>{formatTime(row.occurredAt)}</strong>
              <span className="muted">Bain</span>
            </button>
          ))
        )}
      </Card>
      {editing ? (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Modifier</h2>
            <label className="field">
              <span>Date et heure</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
            <Button
              onClick={() => {
                updateBath(editing.id, fromDatetimeLocalValue(when));
                setEditing(null);
              }}>
              Enregistrer
            </Button>
            <Button
              tone="danger"
              onClick={() => {
                if (confirm('Supprimer ce bain ?')) {
                  deleteBath(editing.id);
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
