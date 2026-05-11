import { AlertTriangle, ArrowLeft, BookOpenCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const reasons = [
  ['Out of scope', 'The manuscript may be technically sound but not aligned with the journal’s audience, aims, article type, or impact threshold.'],
  ['Weak novelty or contribution', 'Editors and reviewers look for a clear advance over existing work, not only a correct or well-written study.'],
  ['Incomplete methods', 'Readers should be able to understand and repeat the study. Missing controls, sample details, protocols, or parameters can block review.'],
  ['Poor analysis', 'Inappropriate statistics, missing uncertainty estimates, weak baselines, or unsupported interpretation can undermine the results.'],
  ['Unsupported conclusions', 'Claims must follow from the data. Overstated implications, speculative claims, and ignored limitations are common rejection risks.'],
  ['Ethics or integrity problems', 'Missing consent, ethics approval, conflict disclosures, plagiarism concerns, duplicate submission, or publication ethics violations can stop a manuscript quickly.'],
  ['Poor structure or language', 'If reviewers cannot follow the logic, figures, tables, or writing, they may not be able to assess the science fairly.'],
  ['Weak references', 'Outdated literature, missing key studies, excessive self-citation, or poor positioning can make a contribution look less convincing.'],
];

const beforeSubmit = [
  'Check the journal scope before formatting the manuscript.',
  'State the exact research gap and contribution in the introduction.',
  'Make methods detailed enough for an independent reader to repeat the work.',
  'Match every conclusion to a result, table, figure, or analysis.',
  'Add ethics, funding, conflict-of-interest, data, and code availability statements where relevant.',
  'Ask whether a critical reviewer would find the work novel, rigorous, clear, and reproducible.',
];

export function CommonRejectionReasonsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-3 font-bold text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            AI Research Reviewer
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Rejection risks</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">Why manuscripts are rejected before or after review</h1>
          <p className="mt-5 text-base font-medium leading-7 text-slate-600">
            Rejection is often caused by fixable problems: poor fit, unclear novelty, incomplete methods, weak analysis, unsupported conclusions, ethics gaps, or presentation issues that make the work difficult to evaluate.
          </p>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {reasons.map(([title, text]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 flex-none text-amber-600" />
                <div>
                  <h2 className="font-bold text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg bg-slate-950 p-6 text-white">
          <h2 className="text-2xl font-bold tracking-normal">Pre-submission checklist</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {beforeSubmit.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-sky-300" />
                <p className="text-sm font-medium leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 text-sm font-medium leading-6 text-slate-500">
          <h2 className="text-base font-bold text-slate-900">Sources used</h2>
          <p className="mt-2">
            Summarized from Springer Nature, Wiley, and publisher author guidance on technical and editorial rejection reasons.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <a href="https://www.springernature.com/gp/authors/campaigns/how-to-submit-a-journal-article-manuscript/common-rejection-reasons" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Springer Nature rejection reasons</a>
            <a href="https://www.wiley.com/en-us/network/publishing/research-publishing/submission-peer-review/9-common-reasons-for-manuscript-rejection" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Wiley rejection reasons</a>
            <a href="https://authorservices.wiley.com/author-resources/Journal-Authors/submission-peer-review/peer-review.html" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Wiley peer review process</a>
          </div>
        </section>
      </article>
    </main>
  );
}
