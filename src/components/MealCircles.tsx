type Props = {
  breastCount: number;
  bottleCount: number;
  feedingMinutes: number;
  bottleMl: number;
};

function circleSize(value: number, max: number): number {
  if (value <= 0) return 36;
  return 36 + Math.round((value / max) * 40);
}

export function MealCircles({ breastCount, bottleCount, feedingMinutes, bottleMl }: Props) {
  const totalMeals = breastCount + bottleCount;
  const maxCount = Math.max(1, breastCount, bottleCount);
  const maxMinutes = Math.max(1, feedingMinutes);

  return (
    <div className="meal-circles">
      <p className="meal-circles-total">
        <b>{totalMeals}</b>
        <span className="muted"> repas</span>
      </p>
      <div className="meal-circles-row">
        <div className="meal-circle-wrap">
          <div
            className="meal-circle breast"
            style={{
              width: circleSize(breastCount, maxCount),
              height: circleSize(breastCount, maxCount),
            }}>
            <span>{breastCount}</span>
          </div>
          <span className="muted">Sein</span>
        </div>
        <div className="meal-circle-wrap">
          <div
            className="meal-circle bottle"
            style={{
              width: circleSize(bottleCount, maxCount),
              height: circleSize(bottleCount, maxCount),
            }}>
            <span>{bottleCount}</span>
          </div>
          <span className="muted">Biberon</span>
        </div>
        <div className="meal-circle-wrap">
          <div
            className="meal-circle duration"
            style={{
              width: circleSize(feedingMinutes, maxMinutes),
              height: circleSize(feedingMinutes, maxMinutes),
            }}>
            <span>{feedingMinutes > 0 ? feedingMinutes : '—'}</span>
          </div>
          <span className="muted">min</span>
        </div>
      </div>
      <p className="muted meal-circles-detail">
        {breastCount} sein · {bottleCount} biberon · {feedingMinutes > 0 ? `${feedingMinutes} min` : '—'} ·{' '}
        {bottleMl} ml
      </p>
    </div>
  );
}
