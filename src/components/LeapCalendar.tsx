import { Link } from 'react-router-dom';

import { leapWeekCaption, leapWeekKind, leapWeekMark, LEAP_DISCLAIMER, LEAP_WEEK_MAX } from '@/lib/leaps';
import { weeksOfAge } from '@/lib/dates';

const COLS = 7;

export function CloudMark() {
  return (
    <svg className="leap-mark leap-cloud" viewBox="0 0 20 12" aria-hidden>
      <path
        d="M5.2 10.2h10.2c1.8 0 3.2-1.3 3.2-2.9 0-1.5-1.2-2.7-2.7-2.8C15.6 2.6 13.8 1 11.6 1c-1.6 0-3 .8-3.8 2.1C7.3 2.7 6.4 2.4 5.4 2.4 3.5 2.4 2 3.8 2 5.6c0 .3 0 .6.1.8C.9 6.7 0 7.8 0 9.1c0 .6.6 1.1 1.2 1.1H5.2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SunMark() {
  return (
    <svg className="leap-mark leap-sun" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.4 4.4l1.1 1.1M14.5 14.5l1.1 1.1M15.6 4.4l-1.1 1.1M5.5 14.5l-1.1 1.1" />
      </g>
    </svg>
  );
}

export function WeekMark({ mark }: { mark: ReturnType<typeof leapWeekMark> }) {
  if (mark === 'sun') return <SunMark />;
  if (mark === 'cloud') return <CloudMark />;
  return <span className="leap-mark-slot" />;
}

export function LeapWeekBadge({ bornOn }: { bornOn?: string | null }) {
  if (!bornOn) return null;
  const week = weeksOfAge(bornOn);
  if (week < 0 || week > LEAP_WEEK_MAX) return null;
  const kind = leapWeekKind(week);
  const mark = leapWeekMark(week);
  const caption = leapWeekCaption(week);
  const label = `Semaine ${week} — ${caption}. Ouvrir Info.`;
  return (
    <Link
      to="/baby"
      state={{ open: 'info' }}
      className={`leap-week-badge is-${kind}${mark !== 'none' ? ` has-${mark}` : ''}`}
      title={label}
      aria-label={label}>
      <WeekMark mark={mark} />
    </Link>
  );
}

export function LeapCalendar({ bornOn }: { bornOn: string | null }) {
  const currentWeek = bornOn ? weeksOfAge(bornOn) : null;
  const rows = Math.ceil((LEAP_WEEK_MAX + 1) / COLS);
  const inRange = currentWeek != null && currentWeek <= LEAP_WEEK_MAX;

  return (
    <div className="leap-calendar">
      <h3 className="leap-title">Les 10 grandes étapes d’agitation de votre bébé</h3>
      <div className="leap-board">
        <div className="leap-grid" role="img" aria-label="Calendrier des bonds, semaines 0 à 84">
          {Array.from({ length: rows }, (_, row) => {
            const start = row * COLS;
            return (
              <div className="leap-row" key={start}>
                {Array.from({ length: COLS }, (_, col) => {
                  const week = start + col;
                  if (week > LEAP_WEEK_MAX) return <span className="leap-cell is-blank" key={week} />;
                  const kind = leapWeekKind(week);
                  const mark = leapWeekMark(week);
                  const current = currentWeek === week;
                  return (
                    <span
                      key={week}
                      className={`leap-cell is-${kind}${current ? ' is-current' : ''}`}
                      title={`Semaine ${week}`}>
                      <WeekMark mark={mark} />
                      <span className="leap-num">{week}</span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        <span className="leap-side">semaines</span>
      </div>
      <ul className="leap-legend">
        <li>
          <span className="leap-swatch is-fussy" />
          À ce moment, bébé peut être plus agité.
        </li>
        <li>
          <span className="leap-legend-icon">
            <CloudMark />
          </span>
          Autour de cette semaine, une période plus orageuse est probable.
        </li>
        <li>
          <span className="leap-swatch is-calm" />
          Phase plus calme.
        </li>
        <li>
          <span className="leap-legend-icon is-sun">
            <SunMark />
          </span>
          Autour de cette semaine, tu le verras souvent sous son meilleur jour.
        </li>
        <li>
          <span className="leap-swatch is-distance" />
          Vers 29–30 semaines, un bébé plus collant n’annonce pas un nouveau bond : il découvre que tu peux
          t’éloigner. C’est une nouvelle compétence (les distances).
        </li>
      </ul>
      {inRange ? (
        <p className="muted">Semaine actuelle : {currentWeek}.</p>
      ) : bornOn && currentWeek != null && currentWeek > LEAP_WEEK_MAX ? (
        <p className="muted">Au-delà de 84 semaines — le calendrier s’arrête ici.</p>
      ) : (
        <p className="muted">Ajoute la date de naissance pour voir la semaine en cours.</p>
      )}
      <p className="muted horoscope-disclaimer">{LEAP_DISCLAIMER}</p>
    </div>
  );
}
