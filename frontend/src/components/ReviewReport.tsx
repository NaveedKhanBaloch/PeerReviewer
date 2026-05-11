import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, Download, FileText, Info, MessageSquare } from 'lucide-react';
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

function recommendationLabel(status: string, recommendation: string | null, overallScore: number | null) {
  if (recommendation) return recommendation;
  if (status === 'complete' && overallScore === null) return 'Not applicable';
  return 'Pending';
}

function literatureDiagnostics(data: { literature_search_diagnostics?: unknown; research_llm_raw_output?: string | null }) {
  if (data.literature_search_diagnostics && typeof data.literature_search_diagnostics === 'object') {
    return data.literature_search_diagnostics as { status?: string; result_count?: number; query_strategy?: string };
  }
  try {
    const parsed = JSON.parse(data.research_llm_raw_output || '{}');
    return parsed.literature_search_diagnostics || null;
  } catch {
    return null;
  }
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between border-b border-slate-100 pb-3 text-left transition-all duration-200">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">{icon}{title}</h2>
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

  const scoreLabel = data.overall_score === null ? 'N/A' : data.overall_score.toFixed(1);
  const showScoreSuffix = data.overall_score !== null;
  const publishedMatch = data.related_papers.find((paper) => paper.relevance_note?.toLowerCase().includes('already published match'));
  const alreadyPublished = data.major_flaws.some((flaw) => flaw.issue.toLowerCase().includes('already-published'))
    || data.summary?.toLowerCase().includes('already published paper')
    || Boolean(publishedMatch);
  const publishedIn = publishedMatch?.relevance_note?.match(/Published in ([^.]+)\./)?.[1];
  const publicationDetails = publishedIn
    ? `Published in ${publishedIn}.`
    : publishedMatch?.year
      ? `Published in ${publishedMatch.year}.`
      : 'A matching published record was found.';
  const diagnostics = literatureDiagnostics(data);
  const literatureStatus = diagnostics?.status;
  const showLiteratureNotice = literatureStatus === 'limited_results' || literatureStatus === 'no_results' || literatureStatus === 'no_query';
  const literatureNotice = literatureStatus === 'limited_results'
    ? `Limited literature match found. The system found ${diagnostics?.result_count ?? data.related_papers.length} related paper${(diagnostics?.result_count ?? data.related_papers.length) === 1 ? '' : 's'} after broadening the search.`
    : literatureStatus === 'no_results'
      ? 'No reliable related literature match was found after title, keyword, and reference fallback searches.'
      : literatureStatus === 'no_query'
        ? 'No clean literature-search query could be generated from the manuscript metadata.'
        : '';

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="line-clamp-2 text-2xl font-bold text-slate-900">{data.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {[data.authors, data.field].filter(Boolean).join(' | ') || 'Author and field metadata unavailable'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide ${badgeClass(data.recommendation)}`}>
              {recommendationLabel(data.status, data.recommendation, data.overall_score)}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.downloadPdf(data.id);
                } catch {
                  pushToast('Failed to download PDF.');
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {alreadyPublished ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 flex-none text-red-600" />
            <div>
              <h2 className="text-lg font-semibold">This paper is already published</h2>
              <p className="mt-2 leading-7">{publicationDetails}</p>
            </div>
          </div>
        </div>
      ) : null}

      {!alreadyPublished ? (
        <div className="grid gap-4 rounded-2xl bg-slate-50 p-6 xl:grid-cols-[1.2fr_3fr]">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-panel">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Overall Score</div>
            <div className="mt-3 text-5xl font-bold">
              {scoreLabel} {showScoreSuffix ? <span className="text-xl font-medium text-slate-400">/ 10</span> : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.dimension_scores.map((score) => (
              <ScoreGauge key={score.dimension} dimension={score.dimension} score={score.score} />
            ))}
          </div>
        </div>
      ) : null}

      <Section title="Summary" icon={<FileText className="h-4 w-4" />}>
        <div className="rounded-2xl bg-blue-50 p-5 leading-7 text-slate-700">{data.summary}</div>
      </Section>

      <Section title="General Comments" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="leading-7 text-slate-700">{data.general_comments}</div>
      </Section>

      <Section title="Major Flaws" icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
        <div className="space-y-4">
          {data.major_flaws.length === 0 ? (
            <div className="text-slate-500">No major flaws were recorded.</div>
          ) : (
            data.major_flaws.map((flaw, index) => (
              <div key={`${flaw.issue}-${index}`} className="rounded-lg border-l-4 border-red-400 bg-red-50 p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">Issue:</span>
                  <span className="text-slate-700">{flaw.issue}</span>
                  {flaw.severity ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-red-700">
                      {flaw.severity}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 italic text-slate-600"><span className="font-semibold not-italic text-slate-900">Evidence:</span> {flaw.evidence}</div>
                <div className="mt-2"><span className="font-semibold text-green-700">Suggested Remedy:</span> <span className="text-slate-700">{flaw.remedy}</span></div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Minor Points" icon={<Info className="h-4 w-4 text-amber-500" />}>
        <ul className="space-y-2 pl-5 text-slate-700">
          {data.minor_points.length === 0 ? <li>No minor points were recorded.</li> : data.minor_points.map((point, index) => <li key={`${point}-${index}`} className="list-disc">{point}</li>)}
        </ul>
      </Section>

      <Section title="Related Literature" icon={<BookOpen className="h-4 w-4" />}>
        {showLiteratureNotice ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="font-semibold">{literatureNotice}</div>
            {diagnostics?.query_strategy ? <div className="mt-1 text-amber-800">{diagnostics.query_strategy}</div> : null}
          </div>
        ) : null}
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

      <div className="pb-6 text-sm text-slate-500">
        Review generated on {new Date(data.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
