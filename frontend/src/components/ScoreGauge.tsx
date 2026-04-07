interface ScoreGaugeProps {
  dimension: string;
  score: number;
}

export function ScoreGauge({ dimension, score }: ScoreGaugeProps) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(1, Math.min(10, score));
  const dash = (clampedScore / 10) * circumference;
  const color = clampedScore >= 7 ? '#22c55e' : clampedScore >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
          {clampedScore.toFixed(1)}
        </text>
      </svg>
      <div className="max-w-[84px] text-center text-xs text-slate-600">{dimension}</div>
    </div>
  );
}
