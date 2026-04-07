import { useEffect, useState, type ReactNode } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import { ScoreGauge } from './ScoreGauge';

function badgeClass(recommendation: string | null) {
  if (recommendation === 'Accept') return 'bg-green-500 text-white';
  if (recommendation === 'Minor revision') return 'bg-yellow-500 text-white';
  if (recommendation === 'Major revision') return 'bg-orange-500 text-white';
  if (recommendation === 'Reject') return 'bg-red-500 text-white';
  return 'bg-slate-500 text-white';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function ReviewReport() {
  const { pushToast, selectedReviewId } = useReviewStore();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['review', selectedReviewId],
    queryFn: () => api.getReview(selectedReviewId as string),
    enabled: Boolean(selectedReviewId),
  });

  useEffect(() => {
    if (isError) {
      pushToast('Failed to load the selected review.');
    }
  }, [isError, pushToast]);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/70" />)}</div>;
  }

  if (isError || !data) {
    return <div className="rounded-3xl bg-white p-8 text-slate-600">Unable to load the selected review.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="line-clamp-2 text-2xl font-bold text-slate-900">{data.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {[data.authors, data.field].filter(Boolean).join(' | ') || 'Author and field metadata unavailable'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-4 py-2 text-sm font-semibold ${badgeClass(data.recommendation)}`}>
              {data.recommendation ?? 'Pending'}
            </span>
            <a
              href={api.getPdfUrl(data.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_3fr]">
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-panel">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Overall Score</div>
          <div className="mt-3 text-5xl font-bold">{(data.overall_score ?? 0).toFixed(1)} <span className="text-xl font-medium text-slate-300">/ 10</span></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {data.dimension_scores.map((score) => (
            <ScoreGauge key={score.dimension} dimension={score.dimension} score={score.score} />
          ))}
        </div>
      </div>

      <Section title="Summary">
        <div className="rounded-2xl bg-blue-50 p-5 leading-7 text-slate-700">{data.summary}</div>
      </Section>

      <Section title="General Comments">
        <div className="leading-7 text-slate-700">{data.general_comments}</div>
      </Section>

      <Section title="Major Flaws">
        <div className="space-y-4">
          {data.major_flaws.length === 0 ? (
            <div className="text-slate-500">No major flaws were recorded.</div>
          ) : (
            data.major_flaws.map((flaw, index) => (
              <div key={`${flaw.issue}-${index}`} className="rounded-2xl border-l-4 border-red-400 bg-red-50 p-5">
                <div><span className="font-semibold text-slate-900">Issue:</span> <span className="text-slate-700">{flaw.issue}</span></div>
                <div className="mt-2 italic text-slate-600"><span className="font-semibold not-italic text-slate-900">Evidence:</span> {flaw.evidence}</div>
                <div className="mt-2"><span className="font-semibold text-green-700">Suggested Remedy:</span> <span className="text-slate-700">{flaw.remedy}</span></div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Minor Points">
        <ul className="space-y-2 pl-5 text-slate-700">
          {data.minor_points.length === 0 ? <li>No minor points were recorded.</li> : data.minor_points.map((point, index) => <li key={`${point}-${index}`} className="list-disc">{point}</li>)}
        </ul>
      </Section>

      <Section title="Related Literature">
        {data.related_papers.length === 0 ? (
          <div className="text-slate-500">No related papers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl">
              <thead className="bg-slate-100 text-left text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Citations</th>
                  <th className="px-4 py-3">Relevance Note</th>
                </tr>
              </thead>
              <tbody>
                {data.related_papers.map((paper, index) => (
                  <tr key={`${paper.title}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-sm text-slate-700">{paper.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{paper.year ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{paper.citation_count ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{paper.relevance_note ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Gemini Research Node Raw Output">
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100 whitespace-pre-wrap">
          {data.research_llm_raw_output?.trim() || 'No raw research-node Gemini output was stored for this review.'}
        </pre>
      </Section>

      <Section title="Gemini Review Node Raw Output">
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100 whitespace-pre-wrap">
          {data.review_llm_raw_output?.trim() || 'No raw review-node Gemini output was stored for this review.'}
        </pre>
      </Section>

      <div className="pb-6 text-sm text-slate-500">
        Review generated on {new Date(data.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
