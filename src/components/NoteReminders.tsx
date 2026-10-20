import { useEffect, useState } from 'react';

import { listOpenNoteTodos } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Note } from '@/db/types';
import { clearNoteReminderTimers, syncNoteReminderTimers } from '@/lib/note-reminders';

/** Programme les notifications des notes « Rappel » tant que l’app est ouverte. */
export function NoteReminders() {
  const { baby, tick } = useDb();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!baby) {
      setNotes([]);
      return;
    }
    listOpenNoteTodos(baby.id).then(setNotes);
  }, [baby, tick]);

  useEffect(() => {
    syncNoteReminderTimers(notes);
    return () => clearNoteReminderTimers();
  }, [notes]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') syncNoteReminderTimers(notes);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [notes]);

  return null;
}
