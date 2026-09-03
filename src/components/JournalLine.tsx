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
  const mine = me?.sub === createdBy;
  const picture = member?.picture || (mine ? me.picture : '') || '';
  const name = member?.name || (mine ? me.name : '') || 'Compte';
  const initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span className="journal-actor" aria-label={name} title={name}>
      {picture ? (
        <img src={picture} alt="" referrerPolicy="no-referrer" />
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
