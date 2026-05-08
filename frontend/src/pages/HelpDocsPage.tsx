import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  FileText,
  HelpCircle,
  LifeBuoy,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react';

const categories = [
  {
    title: 'Getting started',
    text: 'Learn the core workflow: sign in, submit a manuscript, monitor progress, and open the report.',
    Icon: BookOpenCheck,
    href: '#getting-started',
  },
  {
    title: 'Understanding reviews',
    text: 'Interpret AI score, recommendation labels, dimensions, history, analytics, and report sections.',
    Icon: ClipboardCheck,
    href: '#understanding-reviews',
  },
  {
    title: 'Troubleshooting',
    text: 'Resolve upload failures, stuck processing, missing reports, extraction issues, and login problems.',
    Icon: AlertCircle,
    href: '#troubleshooting',
  },
  {
    title: 'Privacy and security',
    text: 'Understand manuscript handling, account access, profile security, and responsible usage guidance.',
    Icon: LockKeyhole,
    href: '#privacy-security',
  },
];

const workflow = [
  ['Submit manuscript', 'Upload a PDF manuscript from the Submit manuscript button or the dashboard submission card.'],
  ['Review processing', 'The system extracts manuscript content, gathers research context, evaluates dimensions, and generates a structured critique.'],
  ['Track progress', 'If a review is running, use the Current Manuscript card on the dashboard to return to the progress screen.'],
  ['Read the report', 'Open the completed review from Submissions or Recent Reviews to inspect score, recommendation, strengths, weaknesses, and suggested revisions.'],
  ['Use analytics', 'Use Dashboard and Analytics to understand outcome patterns, score distribution, and recurring improvement areas.'],
];

const reviewConcepts = [
  {
    title: 'AI score',
    text: 'A 1-10 readiness score summarizing manuscript quality signals. Scores above 7 generally indicate a stronger submission, while lower scores call for focused revision.',
  },
  {
    title: 'Recommendations',
    text: 'Accept, Minor revision, Major revision, and Reject summarize likely review posture. They should guide revision decisions, not replace expert editorial judgment.',
  },
  {
    title: 'Dimension scores',
    text: 'Dimension charts break quality into areas such as methodology, novelty, clarity, significance, ethics, reproducibility, and literature coverage.',
  },
  {
    title: 'Review history',
    text: 'Submissions lists prior manuscripts, score, recommendation/status, submission date, and actions for opening or downloading reports.',
  },
  {
    title: 'Analytics',
    text: 'Analytics turns completed review data into outcome trends, score distribution, field breakdowns, and dimension-level patterns.',
  },
];

const troubleshooting = [
  ['Upload failed', 'Confirm the file is a PDF and below the configured size limit. Try a text-based PDF if the original is scanned or image-only.'],
  ['Review is stuck', 'Return to Dashboard and open Current Manuscript. If the review has not moved for several minutes, refresh once and check whether the backend worker is running.'],
  ['Report is missing', 'Reports become available after review status is complete. If the status is failed, submit the manuscript again or contact support with the submission title.'],
  ['PDF extraction looks weak', 'Use a clean manuscript PDF with selectable text, clear section headings, and embedded references. OCR scanned documents before uploading.'],
  ['Login or verification issue', 'Check email verification status in Settings. If tokens expire, sign in again and request a fresh verification link if available.'],
];

const faqs = [
  ['Does this replace peer review?', 'No. It is a pre-submission review assistant. Use it to prepare stronger drafts before journal, conference, supervisor, or internal review.'],
  ['Can I submit unpublished work?', 'Yes, if your organization permits it. Treat manuscripts as confidential research material and only upload work you are authorized to process.'],
  ['How accurate are the scores?', 'Scores are decision-support signals generated from manuscript content and review criteria. Always validate critical conclusions with human expertise.'],
  ['What should I revise first?', 'Start with major flaws, low dimension scores, unsupported claims, missing methodology details, and unclear related-work positioning.'],
  ['Why do analytics change over time?', 'Analytics are generated from completed reviews in your account. New submissions, status changes, and report scores update the charts.'],
];

function ArticleSection({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
      <h2 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function HelpDocsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-8 text-slate-950">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
                <HelpCircle className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-4xl font-bold tracking-normal text-slate-950">Help & docs</h1>
                <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-500">
                  Practical guidance for submitting manuscripts, reading AI review reports, managing account settings, and resolving common workflow issues.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {categories.map(({ href, Icon, text, title }) => (
              <a key={title} href={href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                      Open section
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            <ArticleSection id="getting-started" title="Getting started">
              <div className="grid gap-3">
                {workflow.map(([title, text], index) => (
                  <div key={title} className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-[auto_1fr]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">{index + 1}</span>
                    <div>
                      <h3 className="font-bold text-slate-900">{title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ArticleSection>

            <ArticleSection id="understanding-reviews" title="Understanding reviews">
              <div className="grid gap-4 md:grid-cols-2">
                {reviewConcepts.map(({ text, title }) => (
                  <div key={title} className="rounded-lg bg-slate-50 p-4">
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </ArticleSection>

            <ArticleSection id="troubleshooting" title="Troubleshooting">
              <div className="divide-y divide-slate-200">
                {troubleshooting.map(([title, text]) => (
                  <div key={title} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="flex items-center gap-2 font-bold text-slate-900">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      {title}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </ArticleSection>

            <ArticleSection id="privacy-security" title="Privacy and security">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Manuscript access
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Manuscripts and reports are tied to authenticated accounts. Only submit files you are authorized to process and keep sensitive unpublished work within approved institutional policies.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    <UserRound className="h-4 w-4 text-blue-700" />
                    Account protection
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Keep email verified, use a strong password, and sign out on shared machines. Update profile details in Settings when your organisation or contact information changes.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    <LockKeyhole className="h-4 w-4 text-slate-700" />
                    Responsible usage
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    AI-generated review feedback is advisory. Do not use it as the sole basis for publication, authorship, research integrity, or ethics decisions. Human review remains necessary for high-stakes judgments.
                  </p>
                </div>
              </div>
            </ArticleSection>

            <ArticleSection id="faq" title="Frequently asked questions">
              <div className="divide-y divide-slate-200">
                {faqs.map(([question, answer]) => (
                  <div key={question} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="font-bold text-slate-900">{question}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{answer}</p>
                  </div>
                ))}
              </div>
            </ArticleSection>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Quick links</h2>
            <div className="mt-4 grid gap-2">
              {[
                ['Getting started', '#getting-started'],
                ['Understanding reviews', '#understanding-reviews'],
                ['Troubleshooting', '#troubleshooting'],
                ['Privacy and security', '#privacy-security'],
                ['FAQ', '#faq'],
              ].map(([label, href]) => (
                <a key={label} href={href} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950">
                  {label}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-slate-950">
              <LifeBuoy className="h-5 w-5 text-blue-700" />
              Contact support
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              Include the manuscript title, submission date, account email, and a short description of the issue.
            </p>
            <a href="mailto:support@example.com" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800">
              <Mail className="h-4 w-4" />
              Email support
            </a>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="flex items-center gap-2 font-bold text-amber-900">
              <FileQuestion className="h-5 w-5" />
              Before contacting support
            </h2>
            <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-amber-900">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Confirm the PDF opens and contains selectable text.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Check whether the review status is processing, complete, or failed.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Refresh once before reporting a stuck progress screen.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-slate-950">
              <FileText className="h-5 w-5 text-slate-500" />
              Useful pages
            </h2>
            <div className="mt-4 grid gap-2 text-sm font-bold">
              <a href="/app/dashboard" className="text-blue-700 hover:text-blue-900">Dashboard</a>
              <a href="/app" className="text-blue-700 hover:text-blue-900">Submissions</a>
              <a href="/app/analytics" className="text-blue-700 hover:text-blue-900">Analytics</a>
              <a href="/app/profile" className="text-blue-700 hover:text-blue-900">Settings</a>
              <a href="/app/submit" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900">
                <Upload className="h-4 w-4" />
                Submit manuscript
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
