import { Brain, FileDown, FileText, Microscope, Search } from 'lucide-react';
import { useReviewStore } from '../stores/reviewStore';

const steps = [
  { key: 'extracting', label: 'Extracting PDF content', Icon: FileText },
  { key: 'literature', label: 'Searching related literature', Icon: Search },
  { key: 'analysing', label: 'Analysing research field & novelty', Icon: Microscope },
  { key: 'reviewing', label: 'Running peer review analysis', Icon: Brain },
  { key: 'generating_pdf', label: 'Generating PDF report', Icon: FileDown },
];

export function ReviewProgress() {
  const { currentProgress } = useReviewStore();
  const currentStep = currentProgress?.step ?? 'extracting';
  const activeIndex = currentStep === 'complete' ? steps.length : Math.max(steps.findIndex((step) => step.key === currentStep), 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 rounded-[32px] bg-white/85 p-10 shadow-panel backdrop-blur">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reviewing your paper...</h1>
        <p className="mt-2 text-sm text-slate-500">The pipeline is extracting the manuscript, checking related work, and assembling the final report.</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = currentStep === 'complete' || index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
          return (
            <div key={step.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <step.Icon className="h-5 w-5 text-slate-700" />
                <span className="font-medium text-slate-800">{step.label}</span>
              </div>
              {status === 'done' && <span className="h-3 w-3 rounded-full bg-green-500" />}
              {status === 'active' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
              {status === 'pending' && <span className="h-3 w-3 rounded-full bg-slate-300" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        {currentProgress?.message ?? 'Preparing the review workflow...'}
      </div>
    </div>
  );
}
