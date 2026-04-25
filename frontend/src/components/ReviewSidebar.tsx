import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Download, LoaderCircle, Plus, Shield, Trash2, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
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
  if (!recommendation) {
    return 'bg-slate-500 text-white';
  }
  return 'bg-red-500 text-white';
}

function reviewLabel(review: { status: string; recommendation: string | null; overall_score: number | null }) {
  if (review.status === 'processing') return 'Processing';
  if (review.status === 'failed') return 'Failed';
  if (review.recommendation) return review.recommendation;
  if (review.status === 'complete' && review.overall_score === null) return 'Not applicable';
  return 'Pending';
}

export function ReviewSidebar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { isAdmin, isAuthenticated, logout, user } = useAuthStore();
  const [mineOnly, setMineOnly] = useState(!isAdmin());
  const { isProcessing, pushToast, removeReview, reviews, selectedReviewId, setReviews, setSelectedReview } = useReviewStore();
  const navigate = useNavigate();

  const reviewsQuery = useQuery({
    queryKey: ['reviews', mineOnly],
    queryFn: () => api.getReviews(50, 0, mineOnly),
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

  useEffect(() => {
    if (!isAdmin()) {
      setMineOnly(true);
    }
  }, [isAdmin]);

  return (
    <aside className="flex h-screen w-[280px] flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 p-4">
        {isAuthenticated && user ? (
          <div className="relative">
            <button type="button" onClick={() => setShowUserMenu((value) => !value)} className="flex w-full items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-left hover:bg-slate-700">
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">{(user.full_name || user.username).slice(0, 1).toUpperCase()}</span>}
              <span className="min-w-0 flex-1 truncate text-xs text-slate-300">@{user.username}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            {showUserMenu ? (
              <div className="absolute left-0 right-0 top-11 z-20 rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm shadow-xl">
                <button type="button" onClick={() => navigate('/profile')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-700">My Profile</button>
                {isAdmin() ? <button type="button" onClick={() => navigate('/admin')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-700">Admin Panel</button> : null}
                <div className="my-1 border-t border-slate-700" />
                <button type="button" onClick={async () => { try { await api.auth.logout(); } catch { /* ignore */ } logout(); toast.success('Signed out'); navigate('/'); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-700">Sign Out</button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link to="/login?redirect=/app" className="text-xs text-slate-400 hover:text-white">Sign In</Link>
        )}
      </div>
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Paper Reviews</h2>
          <button
            type="button"
            onClick={() => setSelectedReview(null)}
            className="rounded-full bg-slate-800 p-2 transition hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto p-3 after:sticky after:bottom-0 after:block after:h-8 after:bg-gradient-to-t after:from-slate-900 after:content-['']">
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No reviews yet. Upload a paper to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setSelectedReview(review.id)}
                className={`group w-full rounded-2xl p-4 text-left transition-colors duration-150 ${
                  selectedReviewId === review.id ? 'border-l-2 border-blue-500 bg-slate-700' : 'bg-slate-800/70 hover:bg-slate-800'
                }`}
              >
                <div className="truncate text-sm font-medium">{review.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDistanceToNow(review.created_at)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ${badgeClass(review.status, review.recommendation)}`}>
                    {review.status === 'processing' ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                    {reviewLabel(review)}
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
      <div className="border-t border-slate-700 p-3 text-xs">
        {isAdmin() ? <button type="button" onClick={() => navigate('/admin')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800"><Shield className="h-4 w-4" /> Admin Panel</button> : null}
        {isAdmin() ? (
          <button type="button" onClick={() => setMineOnly((value) => !value)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-800 ${mineOnly ? 'text-blue-300' : 'text-slate-300'}`}><BookOpen className="h-4 w-4" /> {mineOnly ? 'My Reviews' : 'All Reviews'}</button>
        ) : (
          <div className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-blue-300"><BookOpen className="h-4 w-4" /> My Reviews</div>
        )}
        {isAuthenticated ? <button type="button" onClick={() => navigate('/profile')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800"><User className="h-4 w-4" /> My Profile</button> : null}
      </div>
    </aside>
  );
}
