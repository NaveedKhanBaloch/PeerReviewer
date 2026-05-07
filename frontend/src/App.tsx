import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bell, ChevronDown, FilePlus2 } from 'lucide-react';
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

function AppLayout() {
  const { dismissToast, isProcessing, processingReviewId, selectedReviewId, setSelectedReview, toasts } = useReviewStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  useSSE(processingReviewId);

  const isDashboardRoute = location.pathname === '/app/dashboard';
  const isAnalyticsRoute = location.pathname === '/app/analytics';
  const isSubmitRoute = location.pathname === '/app/submit';
  const isReviewRoute = location.pathname === '/app/review';
  const isHistoryRoute = location.pathname === '/app';
  const showWorkflow = !isDashboardRoute && !isAnalyticsRoute && (isProcessing || selectedReviewId || isSubmitRoute || isReviewRoute);
  const userName = user?.full_name || user?.username || 'Dr. Aris Thorne';
  const userInitial = userName.slice(0, 1).toUpperCase();
  const currentPage = isDashboardRoute ? 'Dashboard' : isAnalyticsRoute ? 'Analytics' : showWorkflow ? 'Submit Manuscript' : 'All Submissions';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fb]">
      <ErrorBoundary>
        <ReviewSidebar />
      </ErrorBoundary>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-10">
          <div className="text-base font-bold text-slate-500">
            {isDashboardRoute || isAnalyticsRoute ? 'Workspace' : 'Review History'} <span className="mx-2 text-slate-400">›</span>
            <span className="text-slate-900">{currentPage}</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
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
            <button type="button" className="hidden items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-50 xl:flex">
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
              {isHistoryRoute && !showWorkflow ? <ReviewHistoryPage /> : null}
              {showWorkflow && !selectedReviewId && !isProcessing ? <UploadZone /> : null}
              {showWorkflow && isProcessing ? <ReviewProgress /> : null}
              {showWorkflow && selectedReviewId && !isProcessing ? <ReviewReport /> : null}
            </div>
          </main>
        </ErrorBoundary>
        {!isDashboardRoute && !isAnalyticsRoute ? (
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
          <Route path="/profile" element={<ProtectedRoute redirect="/profile"><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
