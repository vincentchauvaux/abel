import { User } from 'lucide-react';

import { useDb } from '@/db/DbProvider';
import type { ActivityItem } from '@/lib/activity';
import { formatTime } from '@/lib/dates';
import { readGoogleUser } from '@/lib/google';
import { temperatureLevelClass } from '@/lib/temperature';

export function JournalActor({ createdBy }: { createdBy?: string | null }) {
  const { sharingMembers } = useDb();
  const me = readGoogleUser();
  if (!createdBy) return null;
  const member = sharingMembers.find((row) => row.userId === createdBy);
  const actor = member
    ? { name: member.name || 'Compte', picture: member.picture }
    : me?.sub === createdBy
      ? { name: me.name || 'Vous', picture: me.picture }
      : { name: 'Compte', picture: '' };
  const initial = (actor.name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span className="journal-actor" aria-label={actor.name} title={actor.name}>
      {actor.picture ? (
        <img src={actor.picture} alt="" />
      ) : initial !== '?' ? (
        <span aria-hidden>{initial}</span>
      ) : (
        <User size={14} aria-hidden />
      )}
    </span>
  );
}

export function JournalLine({
  item,
  onClick,
}: {
  item: ActivityItem;
  onClick?: () => void;
}) {
  const detailClass = item.tempCelsius != null ? temperatureLevelClass(item.tempCelsius) : 'muted';
  const inner = (
    <>
      <span className="log-line-body">
        <span>
          <strong>{formatTime(item.at)}</strong>
          <span className="muted"> · {item.title}</span>
        </span>
        <span className={detailClass}>{item.detail}</span>
      </span>
      <JournalActor createdBy={item.createdBy} />
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="line log-line" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="line log-line-static">{inner}</div>;
}
