import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { Card } from '@/components/ui';
import type { FeedingSession, SleepSession } from '@/db/types';
import { formatCompactMinutes, formatMinuteCount, localDateKey, spansOnLocalDay } from '@/lib/dates';

type Props = {
  feeds: FeedingSession[];
  sleeps: SleepSession[];
  now: number;
  hint?: string;
  header?: ReactNode;
};

const DAY_MIN = 24 * 60;
const VIEW_MIN = 6 * 60;
const FEED_Y = 8;
const SLEEP_Y = 36;
const ROW_H = 24;
const AXIS_Y = 72;
const VB_H = 98;
const MIN_BAR_PX = 4;

function tickAnchor(hour: number, endMin: number): 'start' | 'middle' | 'end' {
  if (hour === 0) return 'start';
  if (hour * 60 >= endMin - 0.5) return 'end';
  return 'middle';
}

export function DayTimeline({ feeds, sleeps, now, hint, header }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickEnd = useRef(true);
  const aligning = useRef(false);
  const [pxPerMin, setPxPerMin] = useState(0);
  const dayKey = localDateKey(new Date(now).toISOString());
  const nowMin = Math.max(0, Math.min(DAY_MIN, new Date(now).getHours() * 60 + new Date(now).getMinutes()));
  const endMin = Math.max(VIEW_MIN, nowMin);
  const feedRows = spansOnLocalDay(feeds, dayKey, now);
  const sleepRows = spansOnLocalDay(sleeps, dayKey, now);
  const totalW = endMin * pxPerMin;
  const xAt = (min: number) => Math.max(0, Math.min(endMin, min)) * pxPerMin;
  const ticks = Array.from({ length: Math.floor(endMin / 60) + 1 }, (_, hour) => hour);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientWidth / VIEW_MIN;
      setPxPerMin((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || pxPerMin <= 0 || !stickEnd.current) return;
    const align = () => {
      aligning.current = true;
      el.scrollLeft = Math.max(0, nowMin * pxPerMin - el.clientWidth);
      requestAnimationFrame(() => {
        aligning.current = false;
      });
    };
    align();
    const id = requestAnimationFrame(align);
    return () => cancelAnimationFrame(id);
  }, [pxPerMin, nowMin, endMin, feedRows.length, sleepRows.length]);

  const onScroll = () => {
    if (aligning.current) return;
    const el = wrapRef.current;
    if (!el || pxPerMin <= 0) return;
    const target = Math.max(0, nowMin * pxPerMin - el.clientWidth);
    stickEnd.current = Math.abs(el.scrollLeft - target) < 20;
  };

  const toSpan = (kind: 'tétée' | 'sieste', row: (typeof feedRows)[number]) => {
    const x = xAt(row.startMin);
    const w = Math.max(MIN_BAR_PX, xAt(row.endMin) - x);
    const label = row.minutes > 0 && w >= 28 ? formatCompactMinutes(row.minutes) : '';
    return {
      key: `${kind}-${row.id}`,
      x,
      w,
      label,
      title: `${kind} · ${label || (row.minutes > 0 ? formatMinuteCount(row.minutes) : 'notée')}`,
    };
  };
  const feedSpans = feedRows.map((row) => toSpan('tétée', row));
  const sleepSpans = sleepRows.map((row) => toSpan('sieste', row));
  const empty = feedRows.length === 0 && sleepRows.length === 0;
  const canScroll = endMin > VIEW_MIN + 1;

  return (
    <Card>
      <div className="card-head">
        <h2>Tétées et siestes</h2>
        {header}
      </div>
      {empty ? (
        <p className="muted">Aucune tétée ni sieste aujourd’hui.</p>
      ) : (
        <>
          <div className="day-timeline-wrap" ref={wrapRef} onScroll={onScroll}>
            {pxPerMin > 0 ? (
              <svg
                className="day-timeline"
                width={totalW}
                height={VB_H}
                viewBox={`0 0 ${totalW} ${VB_H}`}
                role="img"
                aria-label="Tétées et siestes, 6 heures visibles">
                <line x1={0} y1={AXIS_Y} x2={totalW} y2={AXIS_Y} stroke="var(--border)" strokeWidth="1" />
                <rect x={0} y={FEED_Y} width={totalW} height={ROW_H} rx="5" className="day-timeline-track" />
                <rect x={0} y={SLEEP_Y} width={totalW} height={ROW_H} rx="5" className="day-timeline-track" />
                {ticks.map((hour) => {
                  const x = xAt(hour * 60);
                  return (
                    <g key={hour}>
                      <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="var(--text-muted)" strokeWidth="1" />
                      <text
                        x={x}
                        y={AXIS_Y + 18}
                        textAnchor={tickAnchor(hour, endMin)}
                        fontSize="11"
                        className="day-timeline-tick">
                        {hour} h
                      </text>
                    </g>
                  );
                })}
                {sleepSpans.map((span) => (
                  <g key={span.key}>
                    <rect x={span.x} y={SLEEP_Y} width={span.w} height={ROW_H} rx="5" className="day-timeline-sleep">
                      <title>{span.title}</title>
                    </rect>
                    {span.label ? (
                      <text
                        x={span.x + span.w / 2}
                        y={SLEEP_Y + ROW_H / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11"
                        className="day-timeline-value">
                        {span.label}
                      </text>
                    ) : null}
                  </g>
                ))}
                {feedSpans.map((span) => (
                  <g key={span.key}>
                    <rect x={span.x} y={FEED_Y} width={span.w} height={ROW_H} rx="5" className="day-timeline-feed">
                      <title>{span.title}</title>
                    </rect>
                    {span.label ? (
                      <text
                        x={span.x + span.w / 2}
                        y={FEED_Y + ROW_H / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11"
                        className="day-timeline-value">
                        {span.label}
                      </text>
                    ) : null}
                  </g>
                ))}
                <line x1={xAt(nowMin)} y1={4} x2={xAt(nowMin)} y2={AXIS_Y} className="day-timeline-now" />
              </svg>
            ) : (
              <div className="day-timeline-placeholder" />
            )}
          </div>
          <div className="bar-legend">
            <span className="leg-breast">Tétées</span>
            <span className="leg-sleep">Siestes</span>
          </div>
          {canScroll ? <p className="muted bars-hint">6 h visibles · glisse vers la gauche</p> : null}
          {hint ? <p className="muted bars-hint">{hint}</p> : null}
        </>
      )}
    </Card>
  );
}
