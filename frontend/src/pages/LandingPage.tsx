import { ArrowRight, BookOpenCheck, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';

export function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">AI Research Reviewer</div>
              <div className="text-xs text-slate-500">Gemini + LangGraph review agent</div>
            </div>
          </div>
          <Link to="/login?redirect=/app" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-300 hover:text-white">
            Sign in
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Professional peer-review workflow
            </div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white md:text-6xl">
              Research paper reviews with structure, evidence, and editorial discipline.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Upload a manuscript or arXiv link and generate a structured review with novelty analysis,
              six-dimension scoring, related-literature checks, progress tracking, and downloadable PDF reports.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login?redirect=/app" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">
                Sign in to continue
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400">
                Admin creates user accounts. Public access is disabled for the web app.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-slate-950">
            <div className="rounded-2xl bg-white p-5 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-sm font-semibold text-slate-500">Review Agent</div>
                  <div className="text-xl font-bold">Q1-style assessment</div>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Reject</span>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ['Originality & Significance', 'Novelty and contribution analysis'],
                  ['Methodology & Rigour', 'Design, reproducibility, and controls'],
                  ['Related Literature', 'Semantic Scholar context for comparison'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      {title === 'Related Literature' ? <FileText className="h-4 w-4 text-blue-600" /> : <ShieldCheck className="h-4 w-4 text-blue-600" />}
                      {title}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
