import { AlertCircle } from 'lucide-react';

export function ErrorCard({
  message,
  retry,
  action,
}: {
  message: string;
  retry?: () => void;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Could not load data</div>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          <div className="mt-4 flex gap-2">
            {retry ? (
              <button type="button" onClick={retry} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Retry
              </button>
            ) : null}
            {action ? (
              <button type="button" onClick={action.onClick} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                {action.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
