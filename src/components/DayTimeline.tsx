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
const ZOOM_MIN = 6;
const ZOOM_MAX = 24;
const ZOOM_KEY = 'abel.dash-day-zoom';
const FEED_Y = 8;
const SLEEP_Y = 36;
const ROW_H = 24;
const AXIS_Y = 72;
const VB_H = 98;

function readZoomHours(): number {
  try {
    const n = Number(localStorage.getItem(ZOOM_KEY));
    if (Number.isFinite(n) && n >= ZOOM_MIN && n <= ZOOM_MAX) return Math.round(n);
  } catch {
    /* hors ligne / mode privé */
  }
  return ZOOM_MIN;
}

function writeZoomHours(hours: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(hours));
  } catch {
    /* hors ligne / mode privé */
  }
}

function tickStep(viewMin: number): number {
  if (viewMin <= 8 * 60) return 1;
  if (viewMin <= 12 * 60) return 2;
  if (viewMin <= 18 * 60) return 3;
  return 6;
}

function tickAnchor(hour: number): 'start' | 'middle' | 'end' {
  if (hour === 0) return 'start';
  if (hour === 24) return 'end';
  return 'middle';
}

function hourTicks(viewMin: number): number[] {
  const step = tickStep(viewMin);
  const out: number[] = [];
  for (let hour = 0; hour <= 24; hour += step) out.push(hour);
  if (out[out.length - 1] !== 24) out.push(24);
  return out;
}

export function DayTimeline({ feeds, sleeps, now, hint, header }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickEnd = useRef(true);
  const aligning = useRef(false);
  const [viewHours, setViewHours] = useState(readZoomHours);
  const [wrapW, setWrapW] = useState(0);
  const dayKey = localDateKey(new Date(now).toISOString());
  const nowMin = Math.max(0, Math.min(DAY_MIN, new Date(now).getHours() * 60 + new Date(now).getMinutes()));
  const viewMin = viewHours * 60;
  const feedRows = spansOnLocalDay(feeds, dayKey, now);
  const sleepRows = spansOnLocalDay(sleeps, dayKey, now);
  const pxPerMin = (wrapW > 0 ? wrapW : 360) / viewMin;
  const svgW = DAY_MIN * pxPerMin;
  const xAt = (min: number) => Math.max(0, Math.min(DAY_MIN, min)) * pxPerMin;
  const ticks = hourTicks(viewMin);
  const minBar = Math.max(8, pxPerMin * 8);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) setWrapW((prev) => (prev === w ? prev : w));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !stickEnd.current) return;
    const align = () => {
      aligning.current = true;
      el.scrollLeft = Math.max(0, (nowMin / DAY_MIN) * el.scrollWidth - el.clientWidth);
      requestAnimationFrame(() => {
        aligning.current = false;
      });
    };
    align();
    const id = requestAnimationFrame(align);
    return () => cancelAnimationFrame(id);
  }, [nowMin, viewMin, wrapW, feedRows.length, sleepRows.length]);

  const onScroll = () => {
    if (aligning.current) return;
    const el = wrapRef.current;
    if (!el) return;
    const target = Math.max(0, (nowMin / DAY_MIN) * el.scrollWidth - el.clientWidth);
    stickEnd.current = Math.abs(el.scrollLeft - target) < 20;
  };

  const changeZoom = (hours: number) => {
    stickEnd.current = true;
    setViewHours(hours);
    writeZoomHours(hours);
  };

  const toSpan = (kind: 'tétée' | 'sieste', row: (typeof feedRows)[number]) => {
    const x = xAt(row.startMin);
    const w = Math.max(minBar, xAt(row.endMin) - x);
    const label = row.minutes > 0 && row.minutes >= viewMin / 18 ? formatCompactMinutes(row.minutes) : '';
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
            <svg
              className="day-timeline"
              width={svgW}
              height={VB_H}
              viewBox={`0 0 ${svgW} ${VB_H}`}
              role="img"
              aria-label={`Tétées et siestes, ${viewHours} heures visibles`}>
              <line x1={0} y1={AXIS_Y} x2={DAY_MIN} y2={AXIS_Y} stroke="var(--border)" strokeWidth="1" />
              <rect x={0} y={FEED_Y} width={DAY_MIN} height={ROW_H} rx="5" className="day-timeline-track" />
              <rect x={0} y={SLEEP_Y} width={DAY_MIN} height={ROW_H} rx="5" className="day-timeline-track" />
              {ticks.map((hour) => {
                const x = xAt(hour * 60);
                return (
                  <g key={hour}>
                    <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="var(--text-muted)" strokeWidth="1" />
                    <text x={x} y={AXIS_Y + 18} textAnchor={tickAnchor(hour)} className="day-timeline-tick">
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
                      className="day-timeline-value">
                      {span.label}
                    </text>
                  ) : null}
                </g>
              ))}
              <line x1={xAt(nowMin)} y1={4} x2={xAt(nowMin)} y2={AXIS_Y} className="day-timeline-now" />
            </svg>
          </div>
          <label className="day-timeline-zoom">
            <span>6 h</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={1}
              value={viewHours}
              onChange={(event) => changeZoom(Number(event.target.value))}
              aria-label="Heures visibles"
              aria-valuetext={`${viewHours} heures visibles`}
            />
            <span>24 h</span>
          </label>
          <div className="bar-legend">
            <span className="leg-breast">Tétées</span>
            <span className="leg-sleep">Siestes</span>
          </div>
          {hint ? <p className="muted bars-hint">{hint}</p> : null}
        </>
      )}
    </Card>
  );
}
