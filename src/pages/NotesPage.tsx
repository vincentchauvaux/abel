import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Field } from '@/components/ui';
import { addNote, listNotes } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Note } from '@/db/types';
import { formatDateTime } from '@/lib/dates';

export function NotesPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [asTodo, setAsTodo] = useState(false);

  useEffect(() => {
    if (!baby) return;
    listNotes(baby.id).then(setRows);
  }, [baby, tick]);

  return (
    <div className="screen">
      <ModuleHeader title="Notes" />
      <Card>
        <h2>Nouvelle note</h2>
        <Field
          label="Texte"
          value={body}
          onChange={setBody}
          placeholder="Quelque chose à retenir…"
          inputMode="text"
          multiline
        />
        <label className="check-inline">
          <input type="checkbox" checked={asTodo} onChange={(e) => setAsTodo(e.target.checked)} />
          À faire sur le dashboard
        </label>
        <p className="muted">Reste visible sur le dashboard jusqu’à ce que tu coches « fait ».</p>
        <Button
          disabled={!body.trim()}
          onClick={() => {
            if (!baby || !body.trim()) return;
            addNote(baby.id, body, undefined, asTodo);
            setBody('');
            setAsTodo(false);
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        <h2>Historique</h2>
        {rows.length === 0 ? (
          <p className="muted">Pas encore de note.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="muted">
                {formatDateTime(row.notedAt)}
                {row.isTodo ? (row.doneAt ? ' · fait' : ' · à faire') : ''}
              </span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{row.body}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
