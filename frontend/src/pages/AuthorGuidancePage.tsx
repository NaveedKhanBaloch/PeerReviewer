import { ArrowLeft, BookOpenCheck, ClipboardCheck, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Choose the right journal before writing the final version',
    text: 'A strong manuscript can still be rejected if it does not fit the journal’s aims, audience, article type, novelty threshold, or methodological expectations.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Make the contribution impossible to miss',
    text: 'The introduction should identify the gap, explain why it matters, and state exactly what is new compared with current literature.',
    Icon: FileText,
  },
  {
    title: 'Report methods and data transparently',
    text: 'Readers need enough detail to understand, evaluate, and repeat the work. Describe design, sample, controls, materials, analysis, software, and limitations clearly.',
    Icon: ShieldCheck,
  },
];

const guidance = [
  ['Authorship', 'Only people who made substantial scholarly contributions should be listed as authors; contribution transparency helps avoid later disputes.'],
  ['Originality', 'Use proper citation and avoid plagiarism, duplicate submission, redundant publication, and unsupported reuse of prior work.'],
  ['Data and reproducibility', 'Be ready to provide data or materials where journal policy, ethics, and participant privacy allow.'],
  ['Conflicts and funding', 'Disclose relationships, funding, or interests that readers and editors may reasonably view as influential.'],
  ['Human or animal subjects', 'Document ethics approval, consent, privacy handling, and relevant compliance statements where applicable.'],
  ['Figures and media', 'Submit clear figures, readable tables, correct labels, and media files that meet journal instructions.'],
  ['Response to review', 'When revising, answer each reviewer point directly, respectfully, and with a clear description of the manuscript change.'],
  ['After rejection', 'Use reviewer feedback to strengthen the manuscript before choosing whether to resubmit or target another journal.'],
];

export function AuthorGuidancePage() {
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
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Author guidance</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">Prepare a manuscript editors can evaluate with confidence</h1>
          <p className="mt-5 text-base font-medium leading-7 text-slate-600">
            Strong author preparation is not only formatting. It is about journal fit, transparent methods, responsible ethics, clear contribution, complete reporting, and a professional response to critique.
          </p>
        </div>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          {sections.map(({ Icon, text, title }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-normal">{title}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold tracking-normal">Author readiness checklist</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {guidance.map(([title, text]) => (
              <div key={title}>
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 text-sm font-medium leading-6 text-slate-500">
          <h2 className="text-base font-bold text-slate-900">Sources used</h2>
          <p className="mt-2">
            Summarized from Elsevier author policy guidance, Wiley peer-review guidance, and Springer Nature manuscript submission guidance.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <a href="https://www.elsevier.com/researcher/author/policies-and-guidelines" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Elsevier author policies</a>
            <a href="https://authorservices.wiley.com/author-resources/Journal-Authors/submission-peer-review/peer-review.html" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Wiley peer review</a>
            <a href="https://www.springernature.com/gp/authors/campaigns/how-to-submit-a-journal-article-manuscript/common-rejection-reasons" className="font-bold text-blue-700 hover:text-blue-900" rel="noreferrer" target="_blank">Springer Nature author guidance</a>
          </div>
        </section>
      </article>
    </main>
  );
}
