import type { ReactNode } from 'react';

import { Card } from '@/components/ui';
import type { FeedingSession, SleepSession } from '@/db/types';
import { clipToLocalDay, formatMinuteCount, localDateKey } from '@/lib/dates';

type Props = {
  feeds: FeedingSession[];
  sleeps: SleepSession[];
  now: number;
  hint?: string;
  header?: ReactNode;
};

const DAY_MIN = 24 * 60;
const VB_W = 320;
const PAD_L = 12;
const PAD_R = 14;
const PLOT_W = VB_W - PAD_L - PAD_R;
const FEED_Y = 8;
const SLEEP_Y = 36;
const ROW_H = 24;
const AXIS_Y = 72;
const VB_H = 98;

function tickAnchor(hour: number): 'start' | 'middle' | 'end' {
  if (hour === 0) return 'start';
  if (hour === 24) return 'end';
  return 'middle';
}

function xAt(min: number): number {
  return PAD_L + (Math.max(0, Math.min(DAY_MIN, min)) / DAY_MIN) * PLOT_W;
}

function compactLabel(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return String(Math.round(minutes));
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours}h` : `${hours}h${mins}`;
}

type Span = {
  key: string;
  x: number;
  w: number;
  label: string;
  title: string;
};

function spansFor(
  rows: { id: string; startedAt: string; endedAt?: string | null }[],
  dayKey: string,
  now: number,
  kind: 'tétée' | 'sieste',
): Span[] {
  const out: Span[] = [];
  for (const row of rows) {
    const clip = clipToLocalDay(row.startedAt, row.endedAt ?? null, dayKey, now);
    if (!clip) continue;
    const minutes = clip.endMin - clip.startMin;
    const x = xAt(clip.startMin);
    const w = Math.max(3, xAt(clip.endMin) - x);
    out.push({
      key: `${kind}-${row.id}`,
      x,
      w,
      label: w >= 22 ? compactLabel(minutes) : '',
      title: `${kind} · ${compactLabel(minutes) || formatMinuteCount(Math.round(minutes))}`,
    });
  }
  return out;
}

export function DayTimeline({ feeds, sleeps, now, hint, header }: Props) {
  const dayKey = localDateKey(new Date(now).toISOString());
  const feedSpans = spansFor(feeds, dayKey, now, 'tétée');
  const sleepSpans = spansFor(sleeps, dayKey, now, 'sieste');
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const nowX = xAt(nowMin);
  const ticks = [0, 6, 12, 18, 24];

  if (feedSpans.length === 0 && sleepSpans.length === 0) {
    return (
      <Card>
        <div className="card-head">
          <h2>Tétées et siestes</h2>
          {header}
        </div>
        <p className="muted">Aucune tétée ni sieste aujourd’hui.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="card-head">
        <h2>Tétées et siestes</h2>
        {header}
      </div>
      <svg
        className="day-timeline"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Tétées et siestes sur 24 heures">
        <line
          x1={PAD_L}
          y1={AXIS_Y}
          x2={VB_W - PAD_R}
          y2={AXIS_Y}
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x={PAD_L}
          y={FEED_Y}
          width={PLOT_W}
          height={ROW_H}
          rx="5"
          className="day-timeline-track"
        />
        <rect
          x={PAD_L}
          y={SLEEP_Y}
          width={PLOT_W}
          height={ROW_H}
          rx="5"
          className="day-timeline-track"
        />
        {ticks.map((hour) => {
          const x = xAt(hour * 60);
          return (
            <g key={hour}>
              <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="var(--text-muted)" strokeWidth="1" />
              <text x={x} y={AXIS_Y + 18} textAnchor={tickAnchor(hour)} fontSize="9" className="day-timeline-tick">
                {hour} h
              </text>
            </g>
          );
        })}
        {sleepSpans.map((span) => (
          <g key={span.key}>
            <rect
              x={span.x}
              y={SLEEP_Y}
              width={span.w}
              height={ROW_H}
              rx="5"
              className="day-timeline-sleep"
            >
              <title>{span.title}</title>
            </rect>
            {span.label ? (
              <text
                x={span.x + span.w / 2}
                y={SLEEP_Y + ROW_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="day-timeline-value">
                {span.label}
              </text>
            ) : null}
          </g>
        ))}
        {feedSpans.map((span) => (
          <g key={span.key}>
            <rect
              x={span.x}
              y={FEED_Y}
              width={span.w}
              height={ROW_H}
              rx="5"
              className="day-timeline-feed"
            >
              <title>{span.title}</title>
            </rect>
            {span.label ? (
              <text
                x={span.x + span.w / 2}
                y={FEED_Y + ROW_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="day-timeline-value">
                {span.label}
              </text>
            ) : null}
          </g>
        ))}
        <line
          x1={nowX}
          y1={4}
          x2={nowX}
          y2={AXIS_Y}
          className="day-timeline-now"
        />
      </svg>
      <div className="bar-legend">
        <span className="leg-breast">Tétées</span>
        <span className="leg-sleep">Siestes</span>
      </div>
      {hint ? <p className="muted bars-hint">{hint}</p> : null}
    </Card>
  );
}
