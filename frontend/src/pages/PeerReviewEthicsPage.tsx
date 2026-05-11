import { ArrowLeft, BookOpenCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const principles = [
  ['Review only when qualified', 'A reviewer should accept an invitation only when they have enough subject expertise and enough time to provide a fair assessment.'],
  ['Keep manuscripts confidential', 'Submitted work should not be shared, discussed outside the review process, or used for personal, professional, or competitive advantage.'],
  ['Declare conflicts early', 'Personal, financial, professional, intellectual, political, or institutional conflicts should be disclosed before reviewing.'],
  ['Stay objective and unbiased', 'The review should judge the manuscript, not the authors, institution, nationality, beliefs, identity, or commercial context.'],
  ['Be constructive', 'Useful reviews explain what is strong, what is weak, why it matters, and what the authors can do next.'],
  ['Avoid personal criticism', 'A professional review should be firm when needed, but never hostile, inflammatory, derogatory, or accusatory without evidence.'],
];

const reviewChecklist = [
  'State the manuscript’s main contribution before criticism.',
  'Separate fatal flaws from fixable revision requests.',
  'Tie major concerns to evidence in the manuscript.',
  'Explain whether weaknesses affect novelty, validity, reproducibility, ethics, or presentation.',
  'Give authors a clear path to improvement.',
  'Tell the editor when your expertise covers only part of the manuscript.',
];

export function PeerReviewEthicsPage() {
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
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Reviewer ethics</p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">What ethical peer review should look like</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-600">
              Ethical reviewing protects authors, editors, readers, and the scholarly record. A strong review is confidential, unbiased, evidence-based, timely, and constructive.
            </p>
          </div>
          <div className="rounded-lg bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-3 text-sky-200">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-[0.14em]">Core standard</span>
            </div>
            <p className="mt-4 text-lg font-semibold leading-8">
              The review should help the editor make a fair decision and help the authors improve the manuscript, without exposing confidential information or introducing bias.
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-normal">Key principles</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {principles.map(([title, text]) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-normal">A reviewer-quality report should include</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {reviewChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                <p className="text-sm font-medium leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 text-sm font-medium leading-6 text-slate-500">
          <h2 className="text-base font-bold text-slate-900">Sources used</h2>
          <p className="mt-2">
            Summarized from COPE ethical reviewer guidance and publisher reviewer ethics guidance.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <a href="https://publicationethics.org/files/Ethical_Guidelines_For_Peer_Reviewers.pdf" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">COPE guidelines</a>
            <a href="https://us.sagepub.com/en-us/ant/peer-review-ethics" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">SAGE peer-review ethics</a>
            <a href="https://authorservices.wiley.com/author-resources/Journal-Authors/submission-peer-review/peer-review.html" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Wiley peer review</a>
          </div>
        </section>
      </article>
    </main>
  );
}
