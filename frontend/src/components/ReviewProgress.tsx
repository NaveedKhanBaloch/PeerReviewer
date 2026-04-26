import { BookOpen, Brain, Check, FileDown, FileText, Microscope, Search, X } from 'lucide-react';
import { useReviewStore } from '../stores/reviewStore';

const steps = [
  { key: 'extracting', label: 'Extracting PDF content', Icon: FileText },
  { key: 'literature', label: 'Searching related literature', Icon: Search },
  { key: 'analysing', label: 'Analysing research field & novelty', Icon: Microscope },
  { key: 'openreview', label: 'Fetching real review examples', Icon: BookOpen },
  { key: 'reviewing', label: 'Running peer review analysis', Icon: Brain },
  { key: 'generating_pdf', label: 'Generating PDF report', Icon: FileDown },
];

export function ReviewProgress() {
  const { currentProgress } = useReviewStore();
  const message = currentProgress?.message ?? '';
  const currentStep = /openreview/i.test(message) ? 'openreview' : currentProgress?.step ?? 'extracting';
  const isFailed = currentStep === 'failed';
  const activeIndex = currentStep === 'complete' ? steps.length : Math.max(steps.findIndex((step) => step.key === currentStep), 0);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Reviewing your paper...</h1>
        <p className="mt-2 text-sm text-slate-500">This typically takes 30–60 seconds.</p>
      </div>

      <div className="space-y-4 border-l-2 border-dashed border-slate-200 pl-5">
        {steps.map((step, index) => {
          const status = currentStep === 'complete' || (!isFailed && index < activeIndex) ? 'done' : index === activeIndex ? 'active' : 'pending';
          return (
            <div key={step.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <step.Icon className="h-5 w-5 text-slate-700" />
                <span className="font-medium text-slate-800">{step.label}</span>
              </div>
              {status === 'done' && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600"><Check className="h-4 w-4" /></span>}
              {status === 'active' && !isFailed && <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
              {isFailed && index === activeIndex ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600"><X className="h-4 w-4" /></span> : null}
              {status === 'pending' && !isFailed && <span className="h-4 w-4 rounded-full border border-slate-300" />}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm italic text-slate-500">
        {currentProgress?.message ?? 'Preparing the review workflow...'}
      </div>
    </div>
  );
}
