import { ArrowLeft, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Overview',
    body: [
      'This Privacy Policy explains how AI Research Reviewer handles account information, manuscript submissions, generated reports, and technical data when you use the public service.',
      'The service is designed to process manuscripts for the purpose of generating a private review report for the submitting user. We do not sell manuscripts, publish submissions, or use submitted manuscripts to create public datasets.',
    ],
  },
  {
    title: '2. Information we process',
    body: [
      'Account information: email address, username, name, organization, password authentication data, verification status, and profile settings.',
      'Manuscript and review information: uploaded PDF content or submitted manuscript source, extracted metadata, title, authors, abstract, field, generated review comments, scores, recommendations, related-literature results, downloadable reports, and review history shown in your account.',
      'Technical information: timestamps, authentication tokens, error logs, request metadata, and operational records needed to secure, maintain, debug, and improve the service.',
    ],
  },
  {
    title: '3. How we use information',
    body: [
      'We use submitted manuscript content to extract text, analyze research context, generate review feedback, create downloadable reports, and display results to the submitting account.',
      'We use account and technical information to provide login, protect accounts, prevent abuse, troubleshoot errors, maintain reliability, and respond to user requests.',
      'We do not use submitted manuscripts for advertising, resale, public posting, or unrelated profiling.',
    ],
  },
  {
    title: '4. AI and third-party processing',
    body: [
      'To generate review feedback, the service may send manuscript text, metadata, and related context to configured AI and research infrastructure providers, such as language-model APIs, literature-search services, PDF extraction tools, hosting providers, databases, and storage systems.',
      'These providers process data on behalf of the service or according to their own service terms. Do not submit content if your obligations prohibit external automated processing.',
    ],
  },
  {
    title: '5. Storage and retention',
    body: [
      'The service may retain review history, generated reports, metadata, account records, and operational logs so users can access completed reviews and so the service can function reliably.',
      'Uploaded files and generated outputs may also exist temporarily in processing or storage locations needed to complete the review workflow.',
      'You may request deletion of your account or review records through the support channel provided for this deployment. Some limited records may be retained where needed for security, backup, legal, abuse-prevention, or operational reasons.',
    ],
  },
  {
    title: '6. Sharing',
    body: [
      'We do not sell submitted manuscripts or review reports.',
      'We may share information with service providers that host, secure, process, analyze, or operate the application; when required by law; to protect users or the service; or with your consent.',
      'Users are responsible for deciding whether to share generated reports with co-authors, supervisors, journals, conferences, or other third parties.',
    ],
  },
  {
    title: '7. Security',
    body: [
      'We use reasonable technical and organizational safeguards designed to protect accounts, submitted manuscripts, generated reports, and service infrastructure.',
      'No internet service can guarantee absolute security. You should use strong credentials, sign out on shared devices, and avoid submitting content you are not authorized to process.',
    ],
  },
  {
    title: '8. Your choices',
    body: [
      'You can update profile information from your account settings where available.',
      'You can request deletion of account or review records through the support channel provided for this deployment.',
      'You can choose not to upload manuscripts that contain confidential, embargoed, regulated, or restricted content.',
    ],
  },
  {
    title: '9. Children',
    body: [
      'The service is intended for researchers, authors, students, supervisors, and professional users. It is not directed to children.',
    ],
  },
  {
    title: '10. Changes to this policy',
    body: [
      'We may update this Privacy Policy as the service changes. The updated version will be posted on this page with a new effective date when material changes are made.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
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

      <div className="mx-auto max-w-5xl px-5 py-10">
        <article className="bg-white px-8 py-9 shadow-sm ring-1 ring-slate-200 sm:px-10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Effective date: May 10, 2026</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950">Privacy Policy</h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-500">
            This policy describes how manuscript submissions and account information are handled when AI Research Reviewer generates private review feedback for users.
          </p>

          <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold tracking-normal text-slate-950">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-medium leading-7 text-slate-600">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
          </div>
        </article>
      </div>
    </main>
  );
}
