import { leapWeekKind, isLeapCloudWeek, LEAP_DISCLAIMER, LEAP_WEEK_MAX } from '@/lib/leaps';
import { weeksOfAge } from '@/lib/dates';

const COLS = 7;

function CloudMark() {
  return (
    <svg className="leap-cloud" viewBox="0 0 20 12" aria-hidden>
      <path
        d="M5.2 10.2h10.2c1.8 0 3.2-1.3 3.2-2.9 0-1.5-1.2-2.7-2.7-2.8C15.6 2.6 13.8 1 11.6 1c-1.6 0-3 .8-3.8 2.1C7.3 2.7 6.4 2.4 5.4 2.4 3.5 2.4 2 3.8 2 5.6c0 .3 0 .6.1.8C.9 6.7 0 7.8 0 9.1c0 .6.6 1.1 1.2 1.1H5.2z"
        fill="currentColor"
      />
    </svg>
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
                  const current = currentWeek === week;
                  return (
                    <span
                      key={week}
                      className={`leap-cell is-${kind}${current ? ' is-current' : ''}`}
                      title={`Semaine ${week}`}>
                      {isLeapCloudWeek(week) ? <CloudMark /> : <span className="leap-cloud-slot" />}
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
          <span className="leap-swatch is-storm" />
          Autour de cette semaine, une période plus orageuse est probable.
        </li>
        <li>
          <span className="leap-swatch is-calm" />
          Phase plus calme — souvent sous son meilleur jour.
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
