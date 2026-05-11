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
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';

const heroImage =
  'https://commons.wikimedia.org/wiki/Special:FilePath/Laptop_on_desk_book_stacks_(Unsplash).jpg';

const problemPoints = [
  'Reviewer objections are predictable: weak novelty, unclear methods, unsupported claims, missing baselines, and thin reproducibility details.',
  'Most authors discover these issues only after weeks or months inside formal review, when revision pressure is already high.',
  'A strong pre-submission review gives authors a sharper manuscript, a clearer revision plan, and fewer preventable surprises.',
];

const reviewDimensions = [
  'Reviewer calibration',
  'Evidence-backed flaws',
  'Score validation',
  'Revision priorities',
];

const workflowSteps = [
  {
    title: 'Upload the manuscript',
    text: 'Submit a PDF and get a structured pre-submission review workspace built around the paper, not a generic writing checklist.',
    Icon: FileText,
  },
  {
    title: 'Map the review risk',
    text: 'The paper is assessed for novelty, methodology, evidence, presentation, ethics, reproducibility, and likely reviewer concerns.',
    Icon: Library,
  },
  {
    title: 'Revise with confidence',
    text: 'Receive a reviewer-style report with calibrated scoring, evidence-backed major flaws, minor fixes, and prioritized next steps.',
    Icon: ClipboardCheck,
  },
];

const featureCards = [
  {
    title: 'Human-review calibrated',
    text: 'The critique reflects how expert reviewers evaluate papers: summary, strengths, weaknesses, evidence, rating logic, and confidence.',
    Icon: BarChart3,
  },
  {
    title: 'Evidence-backed concerns',
    text: 'Major flaws are tied to manuscript locations such as sections, figures, tables, claims, methods, and missing reporting details.',
    Icon: Target,
  },
  {
    title: 'Literature-aware positioning',
    text: 'The report flags contribution overlap, missing citations, and claims that need sharper separation from nearby work.',
    Icon: FileSearch,
  },
  {
    title: 'Validated scoring',
    text: 'Overall readiness is checked against dimension scores so the recommendation stays consistent with the paper’s actual weaknesses.',
    Icon: ShieldCheck,
  },
  {
    title: 'Revision priority plan',
    text: 'Separate critical blockers from minor polish so authors know what to fix first before resubmission or supervisor review.',
    Icon: MessageSquareText,
  },
  {
    title: 'Private review workspace',
    text: 'Keep manuscript reports, scores, outcomes, downloads, and progress history organized in a secure author workspace.',
    Icon: LockKeyhole,
  },
];

const audienceCards = [
  ['Authors', 'Find the objections reviewers are likely to raise before the manuscript reaches a journal or conference desk.'],
  ['Supervisors', 'Give students a consistent quality checkpoint before investing time in detailed line-by-line feedback.'],
  ['Research groups', 'Create a repeatable readiness gate for drafts, revisions, internal reviews, and collaborative writing cycles.'],
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
              Peer-review intelligence before submission
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-normal text-white sm:text-5xl md:text-6xl">
              Know what reviewers will question before you submit.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              AI Research Reviewer turns your draft into a calibrated pre-submission report with evidence-backed flaws, readiness scoring, literature-aware positioning, and a clear revision plan authors can act on immediately.
            </p>
            <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <Link to="/login?redirect=/app" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 py-3 text-center font-semibold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-300">
                Review a manuscript
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#workflow" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-center font-semibold text-white transition hover:border-white/60">
                See how it works
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-200 sm:grid-cols-3">
              {['Reviewer-calibrated critique', 'Validated readiness score', 'Downloadable revision report'].map((item) => (
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
                <div className="text-xs font-semibold uppercase text-slate-500">Reviewer readiness</div>
                <div className="mt-1 text-2xl font-bold">Author action report</div>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                Major revision risk
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {reviewDimensions.slice(0, 4).map((dimension, index) => (
                <div key={dimension} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="text-sm font-semibold">{dimension}</div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${index === 1 ? 'bg-rose-500' : index === 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${84 - index * 14}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-700">{['8.4', '6.1', '7.3', '5 fixes'][index]}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Highest-priority reviewer concern
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                The contribution is promising, but the methods section needs clearer controls, reproducibility details, and stronger positioning against nearby work before submission.
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
              A manuscript should not meet its first serious reviewer at the journal desk.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The most damaging review comments are often avoidable: missing methodological detail, unclear contribution, unsupported conclusions, weak literature positioning, and reproducibility gaps. This tool helps authors find those risks while there is still time to revise with discipline.
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
              <h2 className="mt-3 text-4xl font-bold tracking-normal">From rough draft to submission-ready revision plan.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The report reads like a serious pre-review: calibrated, specific, constructive, and focused on the changes most likely to improve publication readiness.
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

      <section className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase text-sky-700">What the report gives you</div>
              <h2 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">
                Not just feedback. A submission decision rehearsal.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The report helps authors understand how a reviewer may interpret the paper, why the readiness score was assigned, and which revisions matter most before submission.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Calibrated review tone', 'Feedback follows the structure and specificity authors expect from serious academic review.', 'bg-emerald-50 text-emerald-700'],
                ['Evidence trail', 'Major issues point to manuscript evidence so authors can verify and fix the concern quickly.', 'bg-sky-50 text-sky-700'],
                ['Consistency check', 'Scores and recommendations are checked so the outcome matches the severity of the findings.', 'bg-amber-50 text-amber-700'],
                ['Action order', 'Critical blockers, major revisions, and minor polish are separated into a practical revision path.', 'bg-rose-50 text-rose-700'],
              ].map(([title, text, tone]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${tone}`}>{title}</span>
                  <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{text}</p>
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
              <h2 className="mt-3 text-4xl font-bold tracking-normal">Built for the objections reviewers actually raise.</h2>
            </div>
            <Link to="/login?redirect=/app" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-800 sm:w-fit">
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
                A practical quality gate for authors, supervisors, and research teams.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Use it before first submission, after major revisions, before supervisor meetings, or as a lab-wide manuscript readiness checkpoint. It does not replace expert peer review; it helps authors arrive better prepared.
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
                  Turn reviewer risk into a focused revision plan.
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  Upload a manuscript, identify the strongest objections, and leave with a clear order of fixes before the paper enters formal review.
                </p>
              </div>
              <Link to="/login?redirect=/app" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-sky-300 sm:w-auto">
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
              Literature-aware, reviewer-calibrated pre-submission feedback for research manuscripts.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/peer-review-ethics" className="transition hover:text-white">
              COPE peer-review ethics
            </Link>
            <Link to="/common-rejection-reasons" className="transition hover:text-white">
              Common rejection reasons
            </Link>
            <Link to="/author-guidance" className="transition hover:text-white">
              Author guidance
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
