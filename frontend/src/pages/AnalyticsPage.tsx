import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  Clock3,
  FileText,
  Lightbulb,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import type { FullReview, ReviewListItem } from '../types';

type Outcome = 'Accept' | 'Minor revision' | 'Major revision' | 'Reject' | 'Already Published';

const outcomes: Outcome[] = ['Accept', 'Minor revision', 'Major revision', 'Reject', 'Already Published'];
const outcomeColors: Record<Outcome, string> = {
  Accept: '#16a34a',
  'Minor revision': '#eab308',
  'Major revision': '#f97316',
  Reject: '#ef4444',
  'Already Published': '#d97706',
};

const scoreBuckets = [
  { label: '1-2', min: 1, max: 2 },
  { label: '3-4', min: 3, max: 4 },
  { label: '5-6', min: 5, max: 6 },
  { label: '7-8', min: 7, max: 8 },
  { label: '9-10', min: 9, max: 10 },
];

function normalizeOutcome(recommendation: string | null): Outcome {
  if (recommendation === 'Accept') return 'Accept';
  if (recommendation === 'Minor revision') return 'Minor revision';
  if (recommendation === 'Major revision') return 'Major revision';
  if (recommendation === 'Reject') return 'Reject';
  if (recommendation === 'Already Published') return 'Already Published';
  return 'Major revision';
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function MetricCard({
  Icon,
  iconClass,
  label,
  suffix,
  trend,
  value,
}: {
  Icon: LucideIcon;
  iconClass: string;
  label: string;
  suffix?: string;
  trend: number | null;
  value: string;
}) {
  const isPositive = trend !== null && trend >= 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {trend === null ? 'n/a' : Math.abs(trend).toFixed(1)}
        </span>
      </div>
      <div className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold leading-none text-slate-950">{value}</span>
        {suffix ? <span className="pb-1 text-xl font-semibold text-slate-400">{suffix}</span> : null}
      </div>
      <div className="mt-3 text-sm font-medium text-slate-400">vs prior period</div>
    </section>
  );
}

function buildActivityData(reviews: ReviewListItem[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      counts: Object.fromEntries(outcomes.map((outcome) => [outcome, 0])) as Record<Outcome, number>,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));
  reviews.forEach((review) => {
    const created = safeDate(review.created_at);
    if (!created) return;
    const month = monthMap.get(monthKey(created));
    if (!month) return;
    month.counts[normalizeOutcome(review.recommendation)] += 1;
  });

  return months;
}

function ActivityChart({ data }: { data: ReturnType<typeof buildActivityData> }) {
  const width = 1350;
  const height = 300;
  const left = 38;
  const right = 30;
  const top = 20;
  const bottom = 58;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const rawMaxTotal = Math.max(1, ...data.map((month) => outcomes.reduce((sum, outcome) => sum + month.counts[outcome], 0)));
  const maxTotal = Math.max(1, Math.ceil(rawMaxTotal));
  const tickCount = Math.min(maxTotal, 4);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => Math.round((maxTotal / tickCount) * (tickCount - index)));
  const xFor = (index: number) => left + (data.length === 1 ? 0 : (chartWidth / (data.length - 1)) * index);
  const yFor = (value: number) => top + chartHeight - (value / maxTotal) * chartHeight;

  return (
    <svg className="mt-5 h-[300px] w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Review activity over time">
      {ticks.map((tick) => (
        <line key={tick} x1={left} x2={width - right} y1={yFor(tick)} y2={yFor(tick)} stroke="#e2e8f0" strokeDasharray="4 5" />
      ))}
      {ticks.map((tick) => (
        <text key={tick} x="0" y={yFor(tick) + 4} fill="#718096" fontSize="12">
          {tick}
        </text>
      ))}
      {outcomes.map((outcome) => {
        let cumulative = 0;
        const points = data.map((month, index) => {
          cumulative = month.counts[outcome];
          return `${xFor(index)},${yFor(cumulative)}`;
        }).join(' ');
        const fillPoints = `${points} ${xFor(data.length - 1)},${yFor(0)} ${xFor(0)},${yFor(0)}`;
        return (
          <g key={outcome}>
            <polygon points={fillPoints} fill={`${outcomeColors[outcome]}22`} />
            <polyline points={points} fill="none" stroke={outcomeColors[outcome]} strokeWidth="3" />
          </g>
        );
      })}
      {data.map((month, index) => (
        <text key={month.key} x={xFor(index)} y="262" textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'} fill="#718096" fontSize="13">
          {month.label}
        </text>
      ))}
    </svg>
  );
}

function buildDimensionData(fullReviews: FullReview[]) {
  const scores = new Map<string, { total: number; count: number }>();
  fullReviews.forEach((review) => {
    review.dimension_scores.forEach((dimension) => {
      const current = scores.get(dimension.dimension) || { total: 0, count: 0 };
      scores.set(dimension.dimension, { total: current.total + dimension.score, count: current.count + 1 });
    });
  });

  const preferredOrder = ['Methodology', 'Novelty', 'Clarity', 'Significance', 'Ethics', 'Ethics & Reproducibility', 'Literature'];
  const values = Array.from(scores.entries()).map(([label, value]) => ({ label, score: value.total / value.count }));
  return values
    .sort((a, b) => {
      const aIndex = preferredOrder.findIndex((label) => a.label.toLowerCase().includes(label.toLowerCase()));
      const bIndex = preferredOrder.findIndex((label) => b.label.toLowerCase().includes(label.toLowerCase()));
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    })
    .slice(0, 6);
}

function RadarChart({ dimensions }: { dimensions: Array<{ label: string; score: number }> }) {
  const labels = dimensions.length ? dimensions : [
    { label: 'Methodology', score: 0 },
    { label: 'Novelty', score: 0 },
    { label: 'Clarity', score: 0 },
    { label: 'Significance', score: 0 },
    { label: 'Ethics', score: 0 },
    { label: 'Literature', score: 0 },
  ];
  const center = { x: 180, y: 135 };
  const maxRadius = 106;
  const angleFor = (index: number) => (Math.PI * 2 * index) / labels.length - Math.PI / 2;
  const pointFor = (index: number, score: number) => {
    const angle = angleFor(index);
    const radius = (Math.max(0, Math.min(10, score)) / 10) * maxRadius;
    return `${center.x + Math.cos(angle) * radius},${center.y + Math.sin(angle) * radius}`;
  };
  const scorePoints = labels.map((dimension, index) => pointFor(index, dimension.score)).join(' ');
  const thresholdPoints = labels.map((_, index) => pointFor(index, 7)).join(' ');

  return (
    <svg viewBox="0 0 360 280" className="mx-auto mt-5 h-[280px] max-w-[360px]" aria-label="Score by dimension radar chart">
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={labels.map((_, index) => pointFor(index, ratio * 10)).join(' ')}
          fill="none"
          stroke="#dbe6f3"
        />
      ))}
      {labels.map((_, index) => {
        const angle = angleFor(index);
        return <line key={index} x1={center.x} y1={center.y} x2={center.x + Math.cos(angle) * maxRadius} y2={center.y + Math.sin(angle) * maxRadius} stroke="#e5edf7" />;
      })}
      <polygon points={scorePoints} fill="rgba(37,99,235,0.32)" stroke="#2b6cb0" strokeWidth="3" />
      <polygon points={thresholdPoints} fill="none" stroke="#94a3b8" strokeDasharray="5 5" />
      {labels.map((dimension, index) => {
        const angle = angleFor(index);
        const x = center.x + Math.cos(angle) * 134;
        const y = center.y + Math.sin(angle) * 124 + 4;
        const shortLabel = dimension.label.replace('Ethics & Reproducibility', 'Ethics');
        return (
          <text key={dimension.label} x={x} y={y} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">
            {shortLabel}
          </text>
        );
      })}
      {[2.5, 5, 7.5, 10].map((score) => (
        <text key={score} x={center.x + 4} y={center.y - (score / 10) * maxRadius + 4} fill="#94a3b8" fontSize="9">
          {score}
        </text>
      ))}
    </svg>
  );
}

function buildScoreDistribution(reviews: ReviewListItem[]) {
  return scoreBuckets.map((bucket) => ({
    ...bucket,
    count: reviews.filter((review) => {
      const score = review.overall_score ?? 0;
      return score >= bucket.min && score <= bucket.max;
    }).length,
  }));
}

function DistributionChart({ data }: { data: ReturnType<typeof buildScoreDistribution> }) {
  const maxCount = Math.max(1, ...data.map((bucket) => bucket.count));
  const colors = ['#e2e8f0', '#f97316', '#eab308', '#84cc16', '#16a34a'];

  return (
    <div className="mt-4">
      <div className="relative h-[260px] border-b border-slate-200">
        {[0, 1, 2, 3].map((line) => (
          <div key={line} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${line * 31 + 8}%` }} />
        ))}
        <div className="absolute bottom-0 left-[70%] top-0 border-l-2 border-dashed border-blue-500" />
        <span className="absolute left-[68%] top-0 text-xs font-bold text-blue-500">{'>= 7.0'}</span>
        <div className="absolute inset-x-7 bottom-0 flex h-full items-end justify-between gap-9">
          {data.map((bucket, index) => (
            <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-lg" style={{ height: `${(bucket.count / maxCount) * 88}%`, backgroundColor: colors[index] }} />
              <span className="text-sm font-medium text-slate-400">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildOutcomeTrend(reviews: ReviewListItem[]) {
  const now = new Date();
  return Array.from({ length: 4 }, (_, index) => {
    const end = new Date(now);
    end.setDate(now.getDate() - (3 - index) * 30);
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    const periodReviews = reviews.filter((review) => {
      const created = safeDate(review.created_at);
      return created ? inRange(created, start, end) : false;
    });
    return {
      label: `${monthLabel(start)}-${monthLabel(end)}`,
      counts: outcomes.slice(0, 4).map((outcome) => periodReviews.filter((review) => normalizeOutcome(review.recommendation) === outcome).length),
    };
  });
}

function OutcomeTrendChart({ data }: { data: ReturnType<typeof buildOutcomeTrend> }) {
  const maxCount = Math.max(1, ...data.flatMap((period) => period.counts));
  const colors = outcomes.slice(0, 4).map((outcome) => outcomeColors[outcome]);

  return (
    <div className="mt-6 h-[235px]">
      <div className="relative h-[185px] border-b border-slate-200">
        {[0, 1, 2].map((line) => (
          <div key={line} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${line * 33 + 22}%` }} />
        ))}
        <div className="absolute inset-x-7 bottom-0 flex h-full items-end justify-between">
          {data.map((period) => (
            <div key={period.label} className="flex h-full items-end gap-2">
              {period.counts.map((count, index) => (
                <div key={`${period.label}-${index}`} className="w-4 rounded-t-md" style={{ height: `${(count / maxCount) * 92}%`, backgroundColor: colors[index] }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 text-center text-xs font-medium text-slate-400">
        {data.map((period) => <span key={period.label}>{period.label}</span>)}
      </div>
    </div>
  );
}

function buildFieldData(fullReviews: FullReview[]) {
  const grouped = new Map<string, { total: number; accepted: number }>();
  fullReviews.forEach((review) => {
    const field = review.field || 'Unspecified';
    const current = grouped.get(field) || { total: 0, accepted: 0 };
    grouped.set(field, {
      total: current.total + 1,
      accepted: current.accepted + (review.recommendation === 'Accept' ? 1 : 0),
    });
  });
  const maxTotal = Math.max(1, ...Array.from(grouped.values()).map((field) => field.total));
  return Array.from(grouped.entries())
    .map(([field, value]) => ({
      field,
      count: value.total,
      acceptRate: Math.round((value.accepted / value.total) * 100),
      width: (value.total / maxTotal) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border border-slate-200 border-l-4 border-l-amber-500 bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">{text}</p>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsPage() {
  const { reviews } = useReviewStore();
  const detailQueries = useQueries({
    queries: reviews.slice(0, 50).map((review) => ({
      queryKey: ['review', review.id],
      queryFn: () => api.getReview(review.id),
      enabled: review.status === 'complete',
      staleTime: 60_000,
    })),
  });

  const fullReviews = detailQueries
    .map((query) => query.data)
    .filter((review): review is FullReview => Boolean(review));

  const analytics = useMemo(() => {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 90);
    const priorStart = new Date(currentStart);
    priorStart.setDate(currentStart.getDate() - 90);

    const completeReviews = reviews.filter((review) => review.status === 'complete');
    const current = completeReviews.filter((review) => {
      const created = safeDate(review.created_at);
      return created ? inRange(created, currentStart, now) : false;
    });
    const prior = completeReviews.filter((review) => {
      const created = safeDate(review.created_at);
      return created ? inRange(created, priorStart, currentStart) : false;
    });

    const average = (items: ReviewListItem[]) => {
      const scored = items.filter((review) => review.overall_score !== null);
      if (!scored.length) return 0;
      return scored.reduce((sum, review) => sum + (review.overall_score || 0), 0) / scored.length;
    };
    const acceptRate = (items: ReviewListItem[]) => {
      if (!items.length) return 0;
      return (items.filter((review) => review.recommendation === 'Accept').length / items.length) * 100;
    };

    const currentAverage = average(current);
    const priorAverage = average(prior);
    const currentAcceptRate = acceptRate(current);
    const priorAcceptRate = acceptRate(prior);
    const scoreDistribution = buildScoreDistribution(completeReviews);
    const abovePublishable = completeReviews.length
      ? Math.round((completeReviews.filter((review) => (review.overall_score || 0) >= 7).length / completeReviews.length) * 100)
      : 0;

    return {
      totalReviews: reviews.length,
      reviewedPapers: current.length,
      acceptanceRate: Math.round(currentAcceptRate),
      averageScore: currentAverage,
      reviewedTrend: current.length - prior.length,
      acceptanceTrend: currentAcceptRate - priorAcceptRate,
      averageTrend: currentAverage - priorAverage,
      activity: buildActivityData(completeReviews),
      dimensions: buildDimensionData(fullReviews),
      distribution: scoreDistribution,
      abovePublishable,
      fields: buildFieldData(fullReviews),
      outcomeTrend: buildOutcomeTrend(completeReviews),
    };
  }, [fullReviews, reviews]);

  const strongestDimension = analytics.dimensions[0];
  const weakestDimension = analytics.dimensions.length
    ? [...analytics.dimensions].sort((a, b) => a.score - b.score)[0]
    : null;
  const strongestField = analytics.fields[0];

  return (
    <div className="mx-auto w-full max-w-[1620px] px-10 py-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-normal text-slate-950">Analytics</h1>
          <p className="mt-3 text-base font-medium text-slate-500">
            Based on your <span className="font-bold text-slate-700">{analytics.totalReviews}</span> reviews - actionable patterns and trends.
          </p>
        </div>
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          Last 3 months
        </button>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard Icon={FileText} iconClass="bg-blue-50 text-blue-700" label="Reviewed Papers" trend={analytics.reviewedTrend} value={String(analytics.reviewedPapers)} />
        <MetricCard Icon={TrendingUp} iconClass="bg-emerald-50 text-emerald-600" label="Acceptance Rate" suffix="%" trend={analytics.acceptanceTrend} value={String(analytics.acceptanceRate)} />
        <MetricCard Icon={Star} iconClass="bg-amber-50 text-amber-600" label="Avg Review Score" suffix="/ 10" trend={analytics.averageTrend} value={analytics.averageScore.toFixed(1)} />
        <MetricCard Icon={Clock3} iconClass="bg-violet-50 text-violet-600" label="Avg Processing Time" trend={null} value="n/a" />
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Review Activity Over Time</h2>
            <p className="mt-1 text-base font-medium text-slate-500">Generated from completed reviews grouped by recommendation outcome</p>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-bold">
            <button type="button" className="rounded-md bg-white px-4 py-2 text-slate-700 shadow-sm">Monthly</button>
          </div>
        </div>
        <ActivityChart data={analytics.activity} />
        <div className="mt-2 flex flex-wrap gap-5 text-sm font-medium text-slate-600">
          {outcomes.map((outcome) => (
            <span key={outcome} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: outcomeColors[outcome] }} />
              {outcome}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Score by Dimension</h2>
          <p className="mt-1 text-base font-medium text-slate-500">Average per dimension from generated review reports vs publication threshold (7.0)</p>
          <RadarChart dimensions={analytics.dimensions} />
          <div className="mt-2 flex justify-center gap-7 text-sm font-medium text-slate-500">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-400" />Your avg</span>
            <span className="inline-flex items-center gap-2"><span className="h-px w-5 border-t border-dashed border-slate-400" />Publication threshold</span>
          </div>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {weakestDimension
              ? <>Weakest area: {weakestDimension.label} (avg {weakestDimension.score.toFixed(1)})</>
              : 'Dimension data will appear after completed review details load.'}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Score Distribution</h2>
          <p className="mt-1 text-base font-medium text-slate-500">Number of papers per score range from completed reviews</p>
          <DistributionChart data={analytics.distribution} />
          <div className="mt-7 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-slate-600">
            <span className="font-bold">{analytics.abovePublishable}%</span> of your papers score above 7.0 (publishable range).
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Research Field Breakdown</h2>
          <p className="mt-1 text-base font-medium text-slate-500">Top fields by submission count from review metadata</p>
          <div className="mt-7 space-y-5">
            {analytics.fields.length ? analytics.fields.map((field) => (
              <div key={field.field}>
                <div className="mb-2 flex items-center justify-between text-base font-bold text-slate-600">
                  <span>{field.field}</span>
                  <span>{field.count} <span className="ml-4 font-medium text-slate-400">{field.acceptRate}% accept</span></span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-700" style={{ width: `${field.width}%` }} />
                </div>
              </div>
            )) : (
              <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">Field data will appear after completed review details load.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Review Outcome Trend</h2>
          <p className="mt-1 text-base font-medium text-slate-500">Outcome counts over the last 4 periods</p>
          <OutcomeTrendChart data={analytics.outcomeTrend} />
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-800">
            <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" />Generated from the latest completed review dates.</span>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <InsightCard
          title={strongestDimension ? `Strongest dimension: ${strongestDimension.label}` : 'Strongest dimension'}
          text={strongestDimension ? `${strongestDimension.label} has the highest average score at ${strongestDimension.score.toFixed(1)}.` : 'Complete reviews with dimension scores to populate this insight.'}
        />
        <InsightCard
          title={weakestDimension ? `Area to improve: ${weakestDimension.label}` : 'Area to improve'}
          text={weakestDimension ? `${weakestDimension.label} is currently the lowest scoring dimension at ${weakestDimension.score.toFixed(1)}.` : 'Complete reviews with dimension scores to populate this insight.'}
        />
        <InsightCard
          title="Submission pattern"
          text={strongestField ? `You submit most often in ${strongestField.field} (${strongestField.count} reviews, ${strongestField.acceptRate}% accept).` : 'Field metadata will populate this insight after completed review details load.'}
        />
      </section>
    </div>
  );
}
