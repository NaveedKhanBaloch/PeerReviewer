import { useEffect } from 'react';
import {
  BarChart3,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useReviewStore } from '../stores/reviewStore';

const navItems = [
  { label: 'Dashboard', path: '/app/dashboard', Icon: LayoutDashboard },
  { label: 'Analytics', path: '/app/analytics', Icon: BarChart3 },
  { label: 'Submissions', path: '/app', Icon: Inbox },
];

function displayName(user: ReturnType<typeof useAuthStore.getState>['user']) {
  return user?.full_name || user?.username || 'Dr. Aria Singh';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AS';
}

export function ReviewSidebar() {
  const { isProcessing, pushToast, setReviews, setSelectedReview } = useReviewStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const name = displayName(user);

  const reviewsQuery = useQuery({
    queryKey: ['reviews', true],
    queryFn: () => api.getReviews(50, 0, true),
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

  return (
    <aside className="flex h-full min-h-screen w-[296px] shrink-0 flex-col bg-[#080d19] text-white">
      <div className="border-b border-white/5 px-7 py-7">
        <Link to="/app/dashboard" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/30">
            <Sparkles className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight tracking-normal">ReviewerAI</span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Research Suite</span>
          </span>
        </Link>
      </div>

      <nav className="mt-8 px-5">
        <div className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Workspace</div>
        <div className="space-y-2">
          {navItems.map(({ label, path, Icon }) => {
            const active = path === '/app'
              ? location.pathname === '/app' || location.pathname === '/app/review'
              : location.pathname === path;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSelectedReview(null);
                  navigate(path);
                }}
                className={`flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-base font-bold transition ${
                  active ? 'border-l-2 border-blue-500 bg-white/[0.08] text-slate-100' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-blue-400' : ''}`} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="px-5 pb-5">
        <div className="mb-5 border-b border-white/7 pb-5">
          <button type="button" onClick={() => navigate('/profile')} className="flex w-full items-center gap-4 rounded-lg text-left">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                {initials(name)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-200">{name}</span>
              <span className="mt-1 block truncate text-sm font-medium text-slate-500">{user?.email || 'aria@lab.io'}</span>
            </span>
          </button>
        </div>
        <div className="space-y-2">
          <button type="button" className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-base font-bold text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200">
            <HelpCircle className="h-5 w-5" />
            Help &amp; docs
          </button>
          <button type="button" onClick={() => navigate('/profile')} className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-base font-bold text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200">
            <Settings className="h-5 w-5" />
            Settings
          </button>
        </div>
      </div>
    </aside>
  );
}
