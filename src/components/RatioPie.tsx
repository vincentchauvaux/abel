type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
  legendClass: string;
};

type Props = {
  slices: Slice[];
  centerValue: string | number;
  centerLabel: string;
  detail: string;
};

function pieGradient(slices: Slice[]): string {
  const present = slices.filter((slice) => slice.value > 0);
  const total = present.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return 'var(--muted-bg)';
  if (present.length === 1) return present[0].color;
  let deg = 0;
  const stops = present.map((slice) => {
    const next = deg + (slice.value / total) * 360;
    const stop = `${slice.color} ${deg}deg ${next}deg`;
    deg = next;
    return stop;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function RatioPie({ slices, centerValue, centerLabel, detail }: Props) {
  const visible = slices.filter((slice) => slice.value > 0);
  return (
    <div className="pie-wrap">
      <div className="pie-chart">
        <div className="pie" style={{ background: pieGradient(slices) }} aria-hidden />
        <div className="pie-center">
          <b>{centerValue}</b>
          <span className="muted">{centerLabel}</span>
        </div>
      </div>
      {visible.length > 0 ? (
        <div className="pie-legend">
          {visible.map((slice) => (
            <span key={slice.key} className={slice.legendClass}>
              {slice.label} ({slice.value})
            </span>
          ))}
        </div>
      ) : null}
      <p className="muted pie-detail">{detail}</p>
    </div>
  );
}
