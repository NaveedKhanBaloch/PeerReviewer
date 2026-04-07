import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ReviewProgress } from './components/ReviewProgress';
import { ReviewReport } from './components/ReviewReport';
import { ReviewSidebar } from './components/ReviewSidebar';
import { UploadZone } from './components/UploadZone';
import { useSSE } from './hooks/useSSE';
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
  useSSE(processingReviewId);

  return (
    <div className="flex min-h-screen">
      <ReviewSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          {!selectedReviewId && !isProcessing ? <UploadZone /> : null}
          {isProcessing ? <ReviewProgress /> : null}
          {selectedReviewId && !isProcessing ? <ReviewReport /> : null}
        </div>
      </main>

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}
