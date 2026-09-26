import { useEffect, useState } from 'react';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Field } from '@/components/ui';
import { addNote, listNotes } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Note } from '@/db/types';
import { noteToActivity, type ActivityItem } from '@/lib/activity';

export function NotesPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [asTodo, setAsTodo] = useState(false);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listNotes(baby.id).then(setRows);
  }, [baby, tick]);

  return (
    <div className="screen">
      <ModuleHeader title="Notes" toolId="notes" />
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
            <JournalLine
              key={row.id}
              item={noteToActivity(row)}
              onClick={() => setEditing(noteToActivity(row))}
            />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
