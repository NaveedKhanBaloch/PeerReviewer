import { useRef, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';

import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';

export function UploadZone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [arxivUrl, setArxivUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addReview, pushToast, startProcessing } = useReviewStore();

  const beginProcessing = (reviewId: string) => {
    startProcessing(reviewId);
    addReview({
      id: reviewId,
      title: 'Processing...',
      created_at: new Date().toISOString(),
      status: 'processing',
      recommendation: null,
      overall_score: null,
    });
  };

  const startFileReview = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      const message = 'Only PDF files are supported.';
      setError(message);
      pushToast(message);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      const message = 'PDF is larger than the 50MB limit.';
      setError(message);
      pushToast(message);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.startReviewWithFile(file);
      beginProcessing(res.review_id);
    } catch (err) {
      const message = 'Failed to start review for the uploaded PDF.';
      setError(message);
      pushToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startArxivReview = async () => {
    if (!arxivUrl.trim()) {
      setError('Please paste an arXiv URL.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.startReviewWithArxiv(arxivUrl.trim());
      beginProcessing(res.review_id);
      setArxivUrl('');
    } catch (_err) {
      const message = 'Failed to start review for that arXiv URL.';
      setError(message);
      pushToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-[36px] bg-white/90 p-8 shadow-panel backdrop-blur">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">AI Research Reviewer</h1>
        <p className="mt-3 text-slate-500">Upload a manuscript or paste an arXiv URL to generate a structured peer review with live progress updates.</p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files.item(0);
          if (dropped) {
            void startFileReview(dropped);
          }
        }}
        className={`rounded-xl border-2 border-dashed p-12 transition ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-slate-900 p-4 text-white">
            <Upload className="h-8 w-8" />
          </div>
          <div className="text-2xl font-semibold text-slate-800">Drop a PDF here</div>
          <div className="text-sm text-slate-500">or click to browse</div>
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) {
            void startFileReview(selected);
          }
        }}
      />

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">OR</div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={arxivUrl}
          onChange={(event) => setArxivUrl(event.target.value)}
          placeholder="Paste arXiv URL (e.g. https://arxiv.org/abs/2503.08569)"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm outline-none transition focus:border-blue-400"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => void startArxivReview()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Review
        </button>
      </div>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
