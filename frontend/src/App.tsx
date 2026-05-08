import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertCircle, Bell, CheckCircle2, ChevronDown, FilePlus2, LoaderCircle, Mail, X } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AnalyticsPage } from './pages/AnalyticsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReviewProgress } from './components/ReviewProgress';
import { ReviewReport } from './components/ReviewReport';
import { ReviewSidebar } from './components/ReviewSidebar';
import { UploadZone } from './components/UploadZone';
import { useSSE } from './hooks/useSSE';
import { HelpDocsPage } from './pages/HelpDocsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReviewHistoryPage } from './pages/ReviewHistoryPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { useAuthStore } from './stores/authStore';
import { useReviewStore } from './stores/reviewStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

type AppNotification = {
  actionLabel: string;
  id: string;
  message: string;
  route: string;
  reviewId?: string;
  time: string;
  title: string;
  type: 'success' | 'warning' | 'info' | 'error';
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function notificationIconClass(type: AppNotification['type']) {
  if (type === 'success') return 'bg-emerald-50 text-emerald-700';
  if (type === 'error') return 'bg-rose-50 text-rose-700';
  if (type === 'warning') return 'bg-amber-50 text-amber-700';
  return 'bg-blue-50 text-blue-700';
}

function AppLayout() {
  const { dismissToast, isProcessing, processingReviewId, reviews, selectedReviewId, setSelectedReview, toasts } = useReviewStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('reviewer-notifications-read') || '[]') as string[];
    } catch {
      return [];
    }
  });
  useSSE(processingReviewId);

  const isDashboardRoute = location.pathname === '/app/dashboard';
  const isAnalyticsRoute = location.pathname === '/app/analytics';
  const isProfileRoute = location.pathname === '/app/profile';
  const isHelpRoute = location.pathname === '/app/help';
  const isSubmitRoute = location.pathname === '/app/submit';
  const isReviewRoute = location.pathname === '/app/review';
  const isHistoryRoute = location.pathname === '/app';
  const showWorkflow = !isDashboardRoute && !isAnalyticsRoute && !isProfileRoute && !isHelpRoute && (isProcessing || selectedReviewId || isSubmitRoute || isReviewRoute);
  const userName = user?.full_name || user?.username || 'Dr. Aris Thorne';
  const userInitial = userName.slice(0, 1).toUpperCase();
  const currentPage = isDashboardRoute ? 'Dashboard' : isAnalyticsRoute ? 'Analytics' : isProfileRoute ? 'Profile' : isHelpRoute ? 'Help & docs' : showWorkflow ? 'Submit Manuscript' : 'All Submissions';
  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];

    if (isProcessing && processingReviewId) {
      const activeReview = reviews.find((review) => review.id === processingReviewId);
      items.push({
        actionLabel: 'Open progress',
        id: `processing-${processingReviewId}`,
        message: activeReview?.title ? `${activeReview.title} is currently being reviewed.` : 'Your manuscript review is currently running.',
        reviewId: processingReviewId,
        route: '/app/review',
        time: 'Now',
        title: 'Review in progress',
        type: 'info',
      });
    }

    reviews
      .filter((review) => review.status === 'failed')
      .slice(0, 3)
      .forEach((review) => {
        items.push({
          actionLabel: 'View submission',
          id: `failed-${review.id}`,
          message: `${review.title || 'A manuscript'} could not be reviewed. Check the submission and try again.`,
          reviewId: review.id,
          route: '/app',
          time: relativeTime(review.created_at),
          title: 'Review failed',
          type: 'error',
        });
      });

    reviews
      .filter((review) => review.status === 'complete')
      .slice(0, 5)
      .forEach((review) => {
        items.push({
          actionLabel: 'View report',
          id: `complete-${review.id}`,
          message: `${review.title || 'Your manuscript'} is ready with ${review.recommendation || 'a recommendation'}${review.overall_score ? ` and score ${review.overall_score.toFixed(1)}` : ''}.`,
          reviewId: review.id,
          route: '/app/review',
          time: relativeTime(review.created_at),
          title: 'Review completed',
          type: 'success',
        });
      });

    return items.slice(0, 8);
  }, [isProcessing, processingReviewId, reviews, user]);
  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

  useEffect(() => {
    window.localStorage.setItem('reviewer-notifications-read', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  const markRead = (id: string) => {
    setReadNotificationIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const openNotification = (notification: AppNotification) => {
    markRead(notification.id);
    setNotificationsOpen(false);
    if (notification.reviewId) {
      setSelectedReview(notification.reviewId);
    }
    navigate(notification.route);
  };

  const markAllRead = () => {
    setReadNotificationIds((current) => Array.from(new Set([...current, ...notifications.map((notification) => notification.id)])));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fb]">
      <ErrorBoundary>
        <ReviewSidebar />
      </ErrorBoundary>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-10">
          <div className="text-base font-bold text-slate-500">
            {isDashboardRoute || isAnalyticsRoute || isProfileRoute || isHelpRoute ? 'Workspace' : 'Review History'} <span className="mx-2 text-slate-400">›</span>
            <span className="text-slate-900">{currentPage}</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-5 w-5" />
                {unreadCount ? (
                  <span className="absolute right-1.5 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 top-12 z-40 w-[380px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <div className="font-bold text-slate-950">Notifications</div>
                      <div className="text-xs font-medium text-slate-500">{unreadCount ? `${unreadCount} unread` : 'All caught up'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notifications.length ? (
                        <button type="button" onClick={markAllRead} className="text-xs font-bold text-blue-700 hover:text-blue-900">
                          Mark all read
                        </button>
                      ) : null}
                      <button type="button" onClick={() => setNotificationsOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[430px] overflow-y-auto">
                    {notifications.length ? notifications.map((notification) => {
                      const unread = !readNotificationIds.includes(notification.id);
                      const Icon = notification.type === 'success' ? CheckCircle2 : notification.type === 'error' ? AlertCircle : notification.type === 'warning' ? Mail : LoaderCircle;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => openNotification(notification)}
                          className="grid w-full grid-cols-[auto_1fr] gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                        >
                          <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${notificationIconClass(notification.type)}`}>
                            <Icon className={`h-4 w-4 ${notification.type === 'info' ? 'animate-spin' : ''}`} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-start justify-between gap-3">
                              <span className="font-bold text-slate-900">{notification.title}</span>
                              {unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                            </span>
                            <span className="mt-1 block text-sm font-medium leading-5 text-slate-500">{notification.message}</span>
                            <span className="mt-3 flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-400">{notification.time}</span>
                              <span className="text-blue-700">{notification.actionLabel}</span>
                            </span>
                          </span>
                        </button>
                      );
                    }) : (
                      <div className="px-4 py-8 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="mt-3 font-bold text-slate-900">No notifications</div>
                        <p className="mt-1 text-sm font-medium text-slate-500">Review updates and account alerts will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedReview(null);
                navigate('/app/submit');
              }}
              className="hidden h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 sm:inline-flex"
            >
              <FilePlus2 className="h-5 w-5" />
              Submit manuscript
            </button>
            <button type="button" onClick={() => navigate('/app/profile')} className="hidden items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-50 xl:flex">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-sky-500 text-sm font-bold text-white">
                  {userInitial}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>
        <ErrorBoundary>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className={showWorkflow ? 'mx-auto max-w-7xl px-8 py-8' : ''}>
              {isDashboardRoute ? <DashboardPage /> : null}
              {isAnalyticsRoute ? <AnalyticsPage /> : null}
              {isProfileRoute ? <ProfilePage /> : null}
              {isHelpRoute ? <HelpDocsPage /> : null}
              {isHistoryRoute && !showWorkflow ? <ReviewHistoryPage /> : null}
              {showWorkflow && !selectedReviewId && !isProcessing ? <UploadZone /> : null}
              {showWorkflow && isProcessing ? <ReviewProgress /> : null}
              {showWorkflow && selectedReviewId && !isProcessing ? <ReviewReport /> : null}
            </div>
          </main>
        </ErrorBoundary>
        {!isDashboardRoute && !isAnalyticsRoute && !isProfileRoute && !isHelpRoute ? (
          <footer className="flex min-h-[62px] flex-col gap-3 border-t border-slate-200 bg-white px-10 py-4 text-sm font-semibold text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <div>© 2024 AI Research Paper Reviewer. All rights reserved.</div>
            <div className="flex flex-wrap gap-8">
              <span>System Status: Operational</span>
              <a href="/terms" className="hover:text-slate-900">Terms of Service</a>
              <a href="/privacy" className="hover:text-slate-900">Privacy Policy</a>
            </div>
          </footer>
        ) : null}
      </div>

      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="block rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm text-white shadow-lg"
          >
            {toast.message}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProtectedRoute({ children, redirect }: { children: JSX.Element; redirect: string }) {
  const { accessToken, user } = useAuthStore();
  const hasSession = Boolean(accessToken && user);
  if (!hasSession) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/app/*" element={<ProtectedRoute redirect="/app"><AppLayout /></ProtectedRoute>} />
          <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
