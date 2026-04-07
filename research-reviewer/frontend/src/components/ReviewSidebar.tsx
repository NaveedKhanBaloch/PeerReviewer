import { useEffect, useMemo, useState } from 'react';
import { Download, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import { formatDistanceToNow } from './dateUtils';

function badgeClass(status: string, recommendation: string | null) {
  if (status === 'processing' || status === 'pending') {
    return 'bg-blue-500 text-white';
  }
  if (status === 'failed') {
    return 'bg-slate-500 text-white';
  }
  if (recommendation === 'Accept') {
    return 'bg-green-500 text-white';
  }
  if (recommendation === 'Minor revision') {
    return 'bg-yellow-500 text-white';
  }
  if (recommendation === 'Major revision') {
    return 'bg-orange-500 text-white';
  }
  return 'bg-red-500 text-white';
}

export function ReviewSidebar() {
  const [query, setQuery] = useState('');
  const { isProcessing, pushToast, removeReview, reviews, selectedReviewId, setReviews, setSelectedReview } = useReviewStore();

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.getReviews(),
    refetchInterval: isProcessing ? 5000 : false,
  });

  useEffect(() => {
    if (reviewsQuery.data) {
      setReviews(reviewsQuery.data);
    }
  }, [reviewsQuery.data, setReviews]);

  useEffect(() => {
    if (reviewsQuery.error) {
      pushToast('Failed to load review history.');
    }
  }, [reviewsQuery.error, pushToast]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase();
    return reviews.filter((review) => review.title.toLowerCase().includes(lowered));
  }, [query, reviews]);

  return (
    <aside className="flex h-screen w-[280px] flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Paper Reviews</h2>
          <button
            type="button"
            onClick={() => setSelectedReview(null)}
            className="rounded-full bg-slate-800 p-2 transition hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reviews"
            className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No reviews yet. Upload a paper to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setSelectedReview(review.id)}
                className={`group w-full rounded-2xl p-4 text-left transition ${
                  selectedReviewId === review.id ? 'bg-slate-700' : 'bg-slate-800/70 hover:bg-slate-800'
                }`}
              >
                <div className="truncate text-sm font-medium">{review.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDistanceToNow(review.created_at)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(review.status, review.recommendation)}`}>
                    {review.status === 'processing' ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                    {review.status === 'processing' ? 'Processing' : review.status === 'failed' ? 'Failed' : review.recommendation ?? 'Pending'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <a
                      href={api.getPdfUrl(review.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => review.status !== 'complete' && event.preventDefault()}
                      className="rounded-full p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={async (event) => {
                        event.stopPropagation();
                        try {
                          await api.deleteReview(review.id);
                          removeReview(review.id);
                        } catch {
                          pushToast('Failed to delete review.');
                        }
                      }}
                      onKeyDown={() => undefined}
                      className="rounded-full p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
