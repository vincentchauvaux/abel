import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field, NativePickerInput } from '@/components/ui';
import { addNote, listNotes } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Note } from '@/db/types';
import { useOnceLock } from '@/hooks/use-once-lock';
import { noteToActivity, type ActivityItem } from '@/lib/activity';
import { addMinutesToLocal, fromDatetimeLocalValue, toDatetimeLocalValue } from '@/lib/dates';
import { ensureNoteNotifyPermission } from '@/lib/note-reminders';
import { returnHome } from '@/lib/return-home';

type NoteMode = 'note' | 'todo' | 'remind';

export function NotesPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const { busy, run } = useOnceLock();
  const [rows, setRows] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<NoteMode>('note');
  const [remindWhen, setRemindWhen] = useState(() => addMinutesToLocal(toDatetimeLocalValue(), 60));
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
        <div className="row">
          <Chip label="Note" selected={mode === 'note'} onClick={() => setMode('note')} />
          <Chip label="À faire" selected={mode === 'todo'} onClick={() => setMode('todo')} />
          <Chip
            label="Rappel"
            selected={mode === 'remind'}
            onClick={() => {
              setMode('remind');
              if (!remindWhen) setRemindWhen(addMinutesToLocal(toDatetimeLocalValue(), 60));
            }}
          />
        </div>
        {mode === 'todo' ? (
          <p className="muted">Reste visible sur le dashboard jusqu’à ce que tu coches « fait ».</p>
        ) : null}
        {mode === 'remind' ? (
          <>
            <label className="field">
              <span>Rappeler à</span>
              <NativePickerInput
                type="datetime-local"
                value={remindWhen}
                onChange={(e) => setRemindWhen(e.target.value)}
              />
            </label>
            <p className="muted">
              Notification sur le téléphone ou l’ordi si Mimom (onglet ou PWA) reste ouvert. Sinon, le
              rappel reste dans « À faire » sur le dashboard.
            </p>
          </>
        ) : null}
        <Button
          disabled={busy || !body.trim() || (mode === 'remind' && !remindWhen.trim())}
          onClick={() => {
            if (!baby || !body.trim()) return;
            void run(async () => {
              if (mode === 'remind') {
                await ensureNoteNotifyPermission();
                const at = fromDatetimeLocalValue(remindWhen);
                await addNote(baby.id, body, undefined, true, at);
              } else {
                await addNote(baby.id, body, undefined, mode === 'todo', null);
              }
              returnHome(navigate);
            });
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
