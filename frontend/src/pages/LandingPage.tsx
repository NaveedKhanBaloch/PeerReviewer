import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Layers3,
  Library,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';

const heroImage =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Laptop_on_desk_book_stacks_(Unsplash).jpg';

const problemPoints = [
  'Novelty can be hard to judge before reviewers compare your claims with adjacent literature.',
  'Methodology gaps, missing controls, unclear metrics, and weak reproducibility details often surface too late.',
  'Authors need reviewer-style feedback while there is still time to revise the manuscript with discipline.',
];

const reviewDimensions = [
  'Originality and significance',
  'Methodology and rigour',
  'Evidence and reproducibility',
  'Related literature coverage',
  'Clarity and organization',
  'Ethics, limitations, and fit',
];

const workflowSteps = [
  {
    title: 'Submit the manuscript',
    text: 'Upload a manuscript PDF. The reviewer extracts paper content, metadata, sections, figures, tables, and references.',
    Icon: FileText,
  },
  {
    title: 'Map the research context',
    text: 'The system checks nearby literature, compares contribution claims, and prepares a field-aware research brief.',
    Icon: Library,
  },
  {
    title: 'Generate structured critique',
    text: 'The review agent produces dimension scores, major flaws, minor points, summary, recommendation, and a downloadable report.',
    Icon: ClipboardCheck,
  },
];

const featureCards = [
  {
    title: 'Reviewer-style scoring',
    text: 'Six-dimension scoring helps authors see whether the paper is weak in novelty, method, evidence, writing, literature, or ethics.',
    Icon: BarChart3,
  },
  {
    title: 'Evidence-first comments',
    text: 'Major concerns are tied to manuscript evidence, so feedback reads like an actionable review rather than generic advice.',
    Icon: Target,
  },
  {
    title: 'Related-literature checks',
    text: 'Semantic Scholar context helps identify nearby work, citation gaps, and claims that need sharper positioning.',
    Icon: FileSearch,
  },
  {
    title: 'Real-time progress',
    text: 'Progress tracking keeps authors informed while extraction, literature search, analysis, and report generation run.',
    Icon: TimerReset,
  },
  {
    title: 'PDF report output',
    text: 'Download a clean report that can guide revision meetings, co-author discussion, or pre-submission polishing.',
    Icon: MessageSquareText,
  },
  {
    title: 'Private account access',
    text: 'Self-serve accounts keep each author’s manuscript review history, reports, and profile organized in one workspace.',
    Icon: LockKeyhole,
  },
];

const audienceCards = [
  ['Authors', 'Find weak claims, missing details, and unclear structure before journal or conference submission.'],
  ['Supervisors', 'Give students repeatable feedback checkpoints before spending time on line-by-line review.'],
  ['Research groups', 'Create a shared pre-submission quality gate for manuscripts, revisions, and internal drafts.'],
];

export function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section
        className="relative min-h-[92vh] overflow-hidden bg-slate-950 text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(2, 6, 23, 0.96) 0%, rgba(15, 23, 42, 0.88) 46%, rgba(15, 23, 42, 0.42) 100%), url("${heroImage}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400 text-slate-950">
              <BookOpenCheck className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold">AI Research Reviewer</span>
              <span className="block text-xs text-slate-300">Pre-submission manuscript intelligence</span>
            </span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
            <a href="#problem" className="transition hover:text-white">Why it matters</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#for-teams" className="transition hover:text-white">For teams</a>
          </div>
          <Link to="/login?redirect=/app" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-100">
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <div id="top" className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200/25 bg-sky-300/15 px-3 py-1 text-xs font-semibold text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              Reviewer-style feedback before submission
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-normal text-white md:text-6xl">
              Find the reviewer objections before the reviewer does.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              AI Research Reviewer helps authors strengthen manuscripts before journal or conference submission by combining content extraction, related-literature context, novelty analysis, scoring, and editorial critique in one guided workflow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login?redirect=/app" className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-300">
                Review a manuscript
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#workflow" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-semibold text-white transition hover:border-white/50">
                See how it works
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-200 sm:grid-cols-3">
              {['PDF manuscript input', 'Six-dimension scoring', 'Downloadable report'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="self-end rounded-lg border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl shadow-slate-950/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Manuscript readiness</div>
                <div className="mt-1 text-2xl font-bold">Pre-submission report</div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Revise first
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {reviewDimensions.slice(0, 4).map((dimension, index) => (
                <div key={dimension} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="text-sm font-semibold">{dimension}</div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${78 - index * 12}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-700">{(7.8 - index * 1.2).toFixed(1)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Reviewer concern
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                The contribution needs sharper positioning against related work, and the experimental protocol should describe controls, parameter settings, and reproducibility details more explicitly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase text-sky-700">Why authors need this</div>
            <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
              Submission is expensive. Preventable reviewer objections are even more expensive.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Publisher guidance repeatedly points to issues such as weak novelty, poor fit, unsupported conclusions, incomplete methods, unclear writing, and outdated or incomplete references. This tool helps authors inspect those risks before the manuscript enters formal review.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {problemPoints.map((point, index) => (
              <div key={point} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                  {index + 1}
                </div>
                <p className="mt-5 text-base leading-7 text-slate-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-sm font-semibold uppercase text-sky-300">Workflow</div>
              <h2 className="mt-3 text-4xl font-bold tracking-normal">From draft to reviewer-style report.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The system turns a manuscript into a structured critique that authors can act on before submission, revision, or supervisor review.
              </p>
            </div>
            <div className="grid gap-4">
              {workflowSteps.map(({ title, text, Icon }, index) => (
                <div key={title} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-[auto_1fr]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-400 text-slate-950">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-sky-200">Step {index + 1}</div>
                    <h3 className="mt-1 text-xl font-bold">{title}</h3>
                    <p className="mt-2 leading-7 text-slate-300">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase text-sky-700">Capabilities</div>
              <h2 className="mt-3 text-4xl font-bold tracking-normal">Built for the questions reviewers actually ask.</h2>
            </div>
            <Link to="/login?redirect=/app" className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800">
              Start reviewing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ title, text, Icon }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="for-teams" className="border-y border-slate-200 bg-slate-100 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-sm font-semibold uppercase text-sky-700">Who it helps</div>
              <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
                A practical quality gate for authors, labs, and research teams.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Use it before first submission, after major revisions, or during internal manuscript meetings. It does not replace expert peer review; it helps authors arrive better prepared.
              </p>
            </div>
            <div className="grid gap-4">
              {audienceCards.map(([title, text]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-white p-6">
                  <div className="flex items-start gap-4">
                    <BadgeCheck className="mt-1 h-5 w-5 flex-none text-sky-700" />
                    <div>
                      <h3 className="text-xl font-bold">{title}</h3>
                      <p className="mt-2 leading-7 text-slate-600">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="rounded-lg bg-slate-950 p-8 text-white md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                  <Layers3 className="h-4 w-4" />
                  Manuscript readiness starts before submission
                </div>
                <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-normal">
                  Give your paper a stronger first impression.
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  Turn drafts into focused revision plans with structured critique, evidence-backed concerns, and clear next steps for authors.
                </p>
              </div>
              <Link to="/login?redirect=/app" className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 py-10 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <BookOpenCheck className="h-5 w-5 text-sky-300" />
              AI Research Reviewer
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              A pre-submission review assistant for research manuscripts. Create an account to start reviewing.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <a href="https://publicationethics.org/resources/guidelines/cope-ethical-guidelines-peer-reviewers" className="transition hover:text-white" rel="noreferrer" target="_blank">
              COPE peer-review ethics
            </a>
            <a href="https://www.springer.com/gp/authors-editors/journal-author/journal-author-helpdesk/common-reasons-for-rejection" className="transition hover:text-white" rel="noreferrer" target="_blank">
              Common rejection reasons
            </a>
            <a href="https://www.elsevier.com/researcher/author/policies-and-guidelines" className="transition hover:text-white" rel="noreferrer" target="_blank">
              Author guidance
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
