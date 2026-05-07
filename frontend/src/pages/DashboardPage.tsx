import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Star,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';
import { useReviewStore } from '../stores/reviewStore';
import type { ReviewListItem } from '../types';

type Outcome = 'Accept' | 'Minor revision' | 'Major revision' | 'Reject' | 'Already Published';

interface ReviewRow {
  id: string;
  title: string;
  outcome: Outcome;
  score: number;
  date: string;
  source?: ReviewListItem;
}

const fallbackReviews: ReviewRow[] = [
  {
    id: 'demo-dashboard-1',
    title: 'Lattice-Based Post-Quantum Cryptographic Schemes',
    outcome: 'Major revision',
    score: 5.7,
    date: '3w ago',
  },
  {
    id: 'demo-dashboard-2',
    title: 'Latent Space Editing for Controllable Image Synthesis',
    outcome: 'Minor revision',
    score: 7.4,
    date: '3w ago',
  },
  {
    id: 'demo-dashboard-3',
    title: 'Geometric Deep Learning on Protein Folding Trajectories',
    outcome: 'Accept',
    score: 8.3,
    date: '3w ago',
  },
  {
    id: 'demo-dashboard-4',
    title: 'Diffusion Models for Synthetic Tabular Data Generation',
    outcome: 'Reject',
    score: 3.6,
    date: '3w ago',
  },
  {
    id: 'demo-dashboard-5',
    title: 'Sim-to-Real Adaptation for Surgical Robotics',
    outcome: 'Minor revision',
    score: 7.3,
    date: 'Mar 15',
  },
];

function recommendationToOutcome(review: ReviewListItem): Outcome {
  if (review.recommendation === 'Accept') return 'Accept';
  if (review.recommendation === 'Minor revision') return 'Minor revision';
  if (review.recommendation === 'Major revision') return 'Major revision';
  if (review.recommendation === 'Reject') return 'Reject';
  return 'Major revision';
}

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '3w ago';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 35) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toDashboardRows(reviews: ReviewListItem[]) {
  const completeReviews = reviews.filter((review) => review.status === 'complete');
  if (!completeReviews.length) return fallbackReviews;

  return completeReviews.slice(0, 5).map((review) => ({
    id: review.id,
    title: review.title,
    outcome: recommendationToOutcome(review),
    score: review.overall_score ?? 0,
    date: relativeDate(review.created_at),
    source: review,
  }));
}

function badgeClass(outcome: Outcome) {
  if (outcome === 'Accept') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (outcome === 'Minor revision') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (outcome === 'Major revision') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (outcome === 'Reject') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function scoreClass(score: number) {
  if (score >= 8) return 'bg-emerald-50 text-emerald-700';
  if (score >= 7) return 'bg-amber-50 text-amber-700';
  if (score >= 5) return 'bg-orange-50 text-orange-700';
  return 'bg-rose-50 text-rose-700';
}

function StatCard({
  Icon,
  iconClass,
  label,
  trend,
  trendClass,
  value,
}: {
  Icon: LucideIcon;
  iconClass: string;
  label: string;
  trend: string;
  trendClass: string;
  value: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold ${trendClass}`}>
          {trend.startsWith('↘') ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {trend.replace(/[↘↗]\s?/, '')}
        </span>
      </div>
      <div className="mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold leading-none text-slate-950">{value}</span>
        {label === 'Acceptance Rate' ? <span className="pb-1 text-xl font-semibold text-slate-400">%</span> : null}
        {label === 'Average Score' ? <span className="pb-1 text-xl font-semibold text-slate-400">/ 10</span> : null}
      </div>
      <div className="mt-3 text-sm font-medium text-slate-400">vs last 30 days</div>
    </section>
  );
}

function DonutChart({ counts, total }: { counts: Array<{ color: string; count: number }>; total: number }) {
  let offset = 0;
  const gradient = total
    ? counts
      .filter((segment) => segment.count > 0)
      .map((segment) => {
        const start = offset;
        offset += (segment.count / total) * 100;
        return `${segment.color} ${start}% ${offset}%`;
      })
      .join(', ')
    : '#e2e8f0 0% 100%';

  return (
    <div className="relative h-[250px] w-[250px] rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
      <div className="absolute inset-[42px] rounded-full bg-white" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-950">{total}</span>
        <span className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-400">Total Reviews</span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [outcomeDays, setOutcomeDays] = useState<7 | 30>(30);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentProgress, isProcessing, processingReviewId, reviews, setSelectedReview } = useReviewStore();

  const dashboardRows = useMemo(() => toDashboardRows(reviews), [reviews]);
  const processingItems = reviews.filter((review) => review.status === 'processing' || review.status === 'pending');
  const activeProcessingReview = processingReviewId
    ? reviews.find((review) => review.id === processingReviewId) || processingItems[0]
    : processingItems[0];
  const totalReviews = reviews.length || 47;
  const completeReviews = reviews.filter((review) => review.status === 'complete');
  const acceptanceRate = completeReviews.length
    ? Math.round((completeReviews.filter((review) => review.recommendation === 'Accept').length / completeReviews.length) * 100)
    : 23;
  const averageScore = completeReviews.length
    ? (completeReviews.reduce((sum, review) => sum + (review.overall_score ?? 0), 0) / completeReviews.length).toFixed(1)
    : '6.7';
  const thisMonth = reviews.filter((review) => {
    const created = new Date(review.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length || 3;
  const firstName = (user?.full_name || user?.username || 'Aria').split(/\s+/)[0];
  const lastCompleted = dashboardRows[0];
  const outcomeRows = useMemo(() => {
    const colors: Record<Outcome, string> = {
      Accept: '#16a34a',
      'Minor revision': '#f5bd05',
      'Major revision': '#f97316',
      Reject: '#ef4444',
      'Already Published': '#d97706',
    };
    const recentReviews = completeReviews.filter((review) => isWithinDays(review.created_at, outcomeDays));
    const rows = (['Accept', 'Minor revision', 'Major revision', 'Reject', 'Already Published'] as Outcome[]).map((outcome) => {
      const count = recentReviews.filter((review) => recommendationToOutcome(review) === outcome).length;
      const percent = recentReviews.length ? Math.round((count / recentReviews.length) * 100) : 0;
      return { label: outcome, color: colors[outcome], count, percent };
    });
    return { rows, total: recentReviews.length };
  }, [completeReviews, outcomeDays]);

  const openReview = (row: ReviewRow) => {
    if (!row.source) return;
    setSelectedReview(row.id);
    navigate('/app/review');
  };

  const openActiveProgress = () => {
    if (activeProcessingReview) {
      setSelectedReview(activeProcessingReview.id);
      navigate('/app/review');
      return;
    }
    if (isProcessing) {
      navigate('/app/review');
      return;
    }
    setSelectedReview(null);
    navigate('/app/submit');
  };

  return (
    <div className="mx-auto w-full max-w-[1620px] px-10 py-10">
      <section>
        <h1 className="text-4xl font-bold tracking-normal text-slate-950">Dashboard</h1>
        <p className="mt-3 text-lg font-medium text-slate-500">
          Welcome back, {firstName} — here's what's happening in your review queue.
        </p>
      </section>

      <section className="mt-9 grid gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Submit for Review</h2>
              <p className="mt-1 text-base font-medium text-slate-500">Upload PDF or paste arXiv URL — drop a file here.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedReview(null);
              navigate('/app/submit');
            }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-base font-bold text-white transition hover:bg-blue-800"
          >
            Start Review
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={openActiveProgress}
          className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/20"
        >
          <div className="flex items-start gap-4">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Clock3 className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">{processingItems.length || (isProcessing ? 1 : 0)}</span>
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Current Manuscript</h2>
              <p className="mt-1 text-base font-medium text-slate-500">{activeProcessingReview || isProcessing ? 'Continue the running review workflow' : 'No manuscript is currently processing'}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3">
            {activeProcessingReview || isProcessing ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="truncate text-sm font-semibold text-slate-600">
                    {activeProcessingReview?.title || 'Manuscript review in progress'}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-bold text-orange-600">{currentProgress?.step || 'Running'}</span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-500">Submit a manuscript to start a tracked review.</div>
            )}
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-base font-bold text-blue-700">
            {activeProcessingReview || isProcessing ? 'Open progress' : 'Submit manuscript'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Last Completed</h2>
              <p className="mt-1 text-base font-medium text-slate-500">{lastCompleted.date}</p>
            </div>
          </div>
          <h3 className="mt-7 line-clamp-2 text-lg font-bold leading-7 text-slate-700">{lastCompleted.title}</h3>
          <div className="mt-4 flex items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${badgeClass(lastCompleted.outcome)}`}>
              {lastCompleted.outcome}
            </span>
            <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${scoreClass(lastCompleted.score)}`}>{lastCompleted.score.toFixed(1)}</span>
          </div>
          <button type="button" onClick={() => openReview(lastCompleted)} className="mt-6 inline-flex items-center gap-2 text-base font-bold text-blue-700">
            View report
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard Icon={FileText} iconClass="bg-blue-50 text-blue-700" label="Total Reviews" trend="↘ 25" trendClass="bg-rose-50 text-rose-600" value={String(totalReviews)} />
        <StatCard Icon={TrendingUp} iconClass="bg-emerald-50 text-emerald-600" label="Acceptance Rate" trend="↘ 1.6pp" trendClass="bg-rose-50 text-rose-600" value={String(acceptanceRate)} />
        <StatCard Icon={Star} iconClass="bg-amber-50 text-amber-600" label="Average Score" trend="↗ 1.2" trendClass="bg-emerald-50 text-emerald-600" value={averageScore} />
        <StatCard Icon={CalendarDays} iconClass="bg-violet-50 text-violet-600" label="This Month" trend="↘ 1" trendClass="bg-rose-50 text-rose-600" value={String(thisMonth)} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Outcomes Breakdown</h2>
              <p className="mt-1 text-base font-medium text-slate-500">Distribution across review recommendations</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-bold text-slate-600">
              {[30, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setOutcomeDays(days as 7 | 30)}
                  className={`rounded-md px-3 py-2 ${outcomeDays === days ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                >
                  Last {days} days
                </button>
              ))}
            </div>
          </div>
          <div className="mt-10 grid items-center gap-10 md:grid-cols-[1fr_1.15fr]">
            <div className="flex justify-center">
              <DonutChart counts={outcomeRows.rows} total={outcomeRows.total} />
            </div>
            <div className="space-y-4">
              {outcomeRows.rows.map(({ color, count, label, percent }) => (
                <div key={label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 text-base">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-slate-600">{label}</span>
                  <span className="font-bold text-slate-700">{count}</span>
                  <span className="w-12 text-right font-semibold text-slate-400">{percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">Recent Reviews</h2>
            <button type="button" onClick={() => navigate('/app')} className="inline-flex items-center gap-2 text-base font-bold text-blue-700">
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {dashboardRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openReview(row)}
                className="grid w-full gap-3 py-4 text-left first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-slate-700">{row.title}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg border px-2 py-1 text-sm font-bold ${badgeClass(row.outcome)}`}>{row.outcome}</span>
                    <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${scoreClass(row.score)}`}>{row.score.toFixed(1)}</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-400 sm:pt-8">{row.date}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
