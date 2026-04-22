import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ReviewProgress } from './components/ReviewProgress';
import { ReviewReport } from './components/ReviewReport';
import { ReviewSidebar } from './components/ReviewSidebar';
import { UploadZone } from './components/UploadZone';
import { useSSE } from './hooks/useSSE';
import { AdminPage } from './pages/AdminPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
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
  const { dismissToast, isProcessing, processingReviewId, selectedReviewId, toasts } = useReviewStore();
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  useSSE(processingReviewId);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ErrorBoundary>
        <ReviewSidebar />
      </ErrorBoundary>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-sm">
          <div className="text-sm text-slate-500">
            Home / <span className="font-medium capitalize text-slate-800">{location.pathname === '/app' ? 'Paper Review' : location.pathname.replace('/', '')}</span>
          </div>
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium">@{user.username}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">{user.role}</span>
            </div>
          ) : (
            <a href="/login?redirect=/app" className="text-sm font-medium text-blue-600">Sign In</a>
          )}
        </div>
        <ErrorBoundary>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
              {!selectedReviewId && !isProcessing ? <UploadZone /> : null}
              {isProcessing ? <ReviewProgress /> : null}
              {selectedReviewId && !isProcessing ? <ReviewReport /> : null}
            </div>
          </main>
        </ErrorBoundary>
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

function AdminRoute({ children }: { children: JSX.Element }) {
  const { accessToken, isAdmin, user } = useAuthStore();
  const hasSession = Boolean(accessToken && user);
  if (!hasSession) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/app" replace />;
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
          <Route path="/app" element={<ProtectedRoute redirect="/app"><AppLayout /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute redirect="/profile"><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
