import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import { toErrorMessage } from '../api/errorMessage';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const token = params.get('token') || '';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    api.auth.verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(toErrorMessage(error?.response?.data?.detail, 'Could not verify this email address.'));
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-lg border border-slate-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          {status === 'loading' ? <LoaderCircle className="h-7 w-7 animate-spin text-sky-600" /> : null}
          {status === 'success' ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : null}
          {status === 'error' ? <XCircle className="h-8 w-8 text-red-600" /> : null}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Email verification</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <Link to="/login?redirect=/app" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
