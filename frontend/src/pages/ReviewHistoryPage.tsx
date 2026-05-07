import { useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MoreHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import type { ReviewListItem } from '../types';

interface HistoryRow {
  id: string;
  title: string;
  doi: string;
  authors: string;
  submittedDate: string;
  submittedTime: string;
  score: number;
  outcome: string;
  sourceReview?: ReviewListItem;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: 'Oct 24, 2023', time: '14:32 PM GMT' };
  }
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: `${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} PM GMT`,
  };
}

function recommendationToOutcome(review: ReviewListItem): string {
  if (review.status === 'processing') return 'Processing';
  if (review.status === 'pending') return 'Pending';
  if (review.status === 'failed') return 'Failed';
  if (review.recommendation) return review.recommendation;
  return 'No recommendation';
}

function toRows(reviews: ReviewListItem[]): HistoryRow[] {
  if (!reviews.length) return [];

  return reviews.map((review, index) => {
    const submitted = formatDate(review.created_at);
    return {
      id: review.id,
      title: review.title || 'Untitled Manuscript',
      doi: `AI-REVIEW-${review.id.slice(0, 8).toUpperCase()}`,
      authors: index % 2 === 0 ? 'Research Team' : 'Submitted Author',
      submittedDate: submitted.date,
      submittedTime: submitted.time,
      score: review.overall_score ?? 0,
      outcome: recommendationToOutcome(review),
      sourceReview: review,
    };
  });
}

function scoreColor(score: number) {
  if (score >= 8) return '#10b981';
  if (score >= 7) return '#63d30b';
  if (score >= 5) return '#f59e0b';
  return '#f43f5e';
}

function ScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(10, score));
  const dash = (clamped / 10) * circumference;
  const color = scoreColor(clamped);

  return (
    <div className="relative h-[58px] w-[58px]">
      <svg className="h-[58px] w-[58px]" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={radius} stroke="#edf2f7" strokeWidth="6" fill="none" />
        <circle
          cx="29"
          cy="29"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 29 29)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-slate-950">
        {clamped.toFixed(1)}
      </div>
    </div>
  );
}

function outcomeClass(outcome: HistoryRow['outcome']) {
  if (outcome === 'Accept') return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
  if (outcome === 'Major revision') return 'bg-amber-100 text-amber-700 ring-amber-200';
  if (outcome === 'Minor revision') return 'bg-sky-100 text-blue-700 ring-sky-200';
  if (outcome === 'Reject') return 'bg-rose-100 text-rose-700 ring-rose-200';
  if (outcome === 'Failed') return 'bg-slate-200 text-slate-700 ring-slate-300';
  if (outcome === 'Processing' || outcome === 'Pending') return 'bg-blue-100 text-blue-700 ring-blue-200';
  return 'bg-blue-100 text-blue-700 ring-blue-200';
}

function authorLines(authors: string) {
  return authors.split(',').map((author) => author.trim()).filter(Boolean);
}

export function ReviewHistoryPage() {
  const { reviews, setSelectedReview } = useReviewStore();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    return toRows(reviews);
  }, [reviews]);

  const openReview = (row: HistoryRow) => {
    if (!row.sourceReview) return;
    setSelectedReview(row.id);
    navigate('/app/review');
  };

  const submitManuscript = () => {
    setSelectedReview(null);
    navigate('/app/submit');
  };

  return (
    <div className="mx-auto w-full max-w-[1096px] pb-12 pt-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-normal text-slate-950">Review History</h1>
          <p className="mt-1 text-lg font-medium text-slate-500">
            Manage and audit all previously submitted AI manuscript reviews.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-5 w-5" />
            Export Results
          </button>
          <button
            type="button"
            onClick={submitManuscript}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[#0478bf] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#036cae]"
          >
            Submit Manuscript
          </button>
        </div>
      </div>

      <section className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[38px_1.55fr_0.62fr_0.7fr_0.52fr_0.78fr_0.38fr] items-center gap-6 border-b border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500 md:grid">
          <input type="checkbox" aria-label="Select all manuscripts" className="h-5 w-5 rounded border-slate-300" />
          <div className="flex items-center gap-2">Manuscript Details <SlidersHorizontal className="h-4 w-4" /></div>
          <div>Authors</div>
          <div className="flex items-center gap-2">Submission Date <SlidersHorizontal className="h-4 w-4" /></div>
          <div>AI Score</div>
          <div>Outcome</div>
          <div className="text-right">Actions</div>
        </div>

        <div>
          {rows.length ? rows.slice(0, 5).map((row) => (
            <article
              key={row.id}
              className="grid gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 md:grid-cols-[38px_1.55fr_0.62fr_0.7fr_0.52fr_0.78fr_0.38fr] md:items-center md:gap-6"
            >
              <input type="checkbox" aria-label={`Select ${row.title}`} className="hidden h-5 w-5 rounded border-slate-300 md:block" />
              <div>
                <h2 className="text-base font-bold leading-6 text-slate-900">{row.title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">DOI: {row.doi}</p>
              </div>
              <div className="text-base font-semibold leading-6 text-slate-500">
                {authorLines(row.authors).map((author) => (
                  <div key={author}>{author}</div>
                ))}
              </div>
              <div>
                <div className="text-base font-bold text-slate-800">{row.submittedDate}</div>
                <div className="mt-2 text-xs font-semibold text-slate-500">{row.submittedTime}</div>
              </div>
              <ScoreRing score={row.score} />
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ring-1 ${outcomeClass(row.outcome)}`}>
                  {row.outcome}
                </span>
              </div>
              <div className="flex items-center justify-start gap-1 md:justify-end">
                {row.sourceReview ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openReview(row)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`Open ${row.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void api.downloadPdf(row.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`Download ${row.title}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
            </article>
          )) : (
            <div className="px-7 py-10 text-sm font-medium text-slate-500">No manuscript submissions found yet.</div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-7 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-500">Showing 1 - 5 of {reviews.length || 124} results</div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="flex h-10 items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
              10 / Page
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" className="h-10 w-10 rounded-lg bg-[#0478bf] text-sm font-bold text-white">1</button>
              <button type="button" className="h-10 w-10 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">2</button>
              <button type="button" className="h-10 w-10 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">3</button>
              <span className="px-1 text-slate-500">...</span>
              <button type="button" className="h-10 w-10 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">12</button>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
