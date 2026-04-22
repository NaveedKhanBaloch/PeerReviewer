import { type ReactNode, useState } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { AlertCircle, ChevronDown, ChevronUp, Home, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 p-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-1 text-sm text-slate-500">This section could not render. You can retry or return home.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={resetErrorBoundary} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              <Home className="h-4 w-4" />
              Go home
            </button>
          </div>
          {import.meta.env.DEV ? (
            <div className="mt-4">
              <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                Error details {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {open ? <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{error.message}{'\n'}{error.stack}</pre> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error) => void }) {
  return (
    <ReactErrorBoundary FallbackComponent={Fallback} onError={onError}>
      {children}
    </ReactErrorBoundary>
  );
}
