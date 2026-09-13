import { useEffect, useState } from 'react';

import { Button, Chip, Field } from '@/components/ui';
import {
  addExerciseItem,
  deleteExerciseItem,
  listExerciseItems,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem } from '@/db/types';
import {
  EXERCISE_DURATION_PRESETS,
  EXERCISE_MAX,
  EXERCISE_TITLE_MAX,
  clampExerciseDuration,
  formatExerciseDuration,
} from '@/lib/exercises';

type Props = {
  babyId: string;
  canEdit: boolean;
};

export function BabyExercises({ babyId, canEdit }: Props) {
  const { tick } = useDb();
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    listExerciseItems(babyId).then(setItems);
  }, [babyId, tick]);

  const add = async (duration: number | null) => {
    const durationMinutes = duration == null ? null : clampExerciseDuration(duration);
    if (!title.trim() || durationMinutes == null) return;
    await addExerciseItem(babyId, title, durationMinutes);
    setTitle('');
    setMinutes(null);
    setCustom('');
  };

  const customMinutes = clampExerciseDuration(Number.parseInt(custom, 10));

  return (
    <>
      <p className="muted">
        Intitulé + durée. Chaque exercice apparaît dans Outils, peut être épinglé en favori, et sonne à la fin. Ce n’est
        pas un conseil médical.
      </p>
      {items.length === 0 && !canEdit ? <p className="muted">Aucun exercice pour l’instant.</p> : null}
      {items.map((item) => (
        <div key={item.id} className="info-line exercise-config-row">
          <span className="muted">{formatExerciseDuration(item.durationMinutes)}</span>
          <strong>{item.title}</strong>
          {canEdit ? (
            <button type="button" className="linkish" onClick={() => void deleteExerciseItem(item.id)}>
              Retirer
            </button>
          ) : null}
        </div>
      ))}
      {canEdit ? (
        <>
          {items.length >= EXERCISE_MAX ? (
            <p className="muted">Maximum {EXERCISE_MAX} exercices.</p>
          ) : (
            <>
              <Field
                label="Intitulé"
                value={title}
                onChange={(value) => setTitle(value.slice(0, EXERCISE_TITLE_MAX))}
                placeholder="Tummy time"
                inputMode="text"
              />
              <p className="goal-label">Temps</p>
              <div className="row">
                {EXERCISE_DURATION_PRESETS.map((item) => (
                  <Chip
                    key={item.minutes}
                    label={item.label}
                    selected={minutes === item.minutes}
                    onClick={() => setMinutes(item.minutes)}
                  />
                ))}
              </div>
              <label className="field">
                <span>Personnalisé (minutes)</span>
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  inputMode="numeric"
                  placeholder="12"
                />
              </label>
              <Button
                tone="muted"
                onClick={() => {
                  if (customMinutes) setMinutes(customMinutes);
                }}>
                OK temps
              </Button>
              <Button
                disabled={!title.trim() || (minutes == null && customMinutes == null)}
                onClick={() => void add(minutes ?? customMinutes)}>
                Ajouter
              </Button>
            </>
          )}
        </>
      ) : (
        <p className="muted">Un parent paramètre les exercices. Tu peux lancer les comptes à rebours dans Outils.</p>
      )}
    </>
  );
}
