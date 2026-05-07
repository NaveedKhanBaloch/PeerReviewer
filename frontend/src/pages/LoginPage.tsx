import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpenCheck, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import { toErrorMessage } from '../api/errorMessage';
import { useAuthStore } from '../stores/authStore';

type AuthMode = 'signin' | 'signup';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function passwordStrength(password: string) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { accessToken, login, user } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/app';
  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const handleGoogle = async (response: { credential?: string }) => {
      if (!response.credential) {
        setError('Google did not return a sign-in credential.');
        return;
      }
      setGoogleLoading(true);
      setError('');
      try {
        const tokenResponse = await api.auth.google(response.credential);
        login(tokenResponse);
        navigate(redirect, { replace: true });
      } catch (err: any) {
        setError(toErrorMessage(err?.response?.data?.detail, 'Could not continue with Google.'));
      } finally {
        setGoogleLoading(false);
      }
    };

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogle });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        width: 360,
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  }, [login, mode, navigate, redirect]);

  if (accessToken && user) return <Navigate to="/app" replace />;

  const submit = async () => {
    setError('');
    if (mode === 'signin') {
      if (!identifier.trim()) {
        setError('Enter your email or username.');
        return;
      }
      if (!password) {
        setError('Password is required.');
        return;
      }
    } else {
      if (!email.trim() || !username.trim() || !password || !confirmPassword) {
        setError('Email, username, password, and password confirmation are required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (strength < 3) {
        setError('Use at least 8 characters with an uppercase letter and a number.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const response = await api.auth.login(identifier.trim(), password);
        login(response);
        navigate(redirect, { replace: true });
        return;
      }

      const response = await api.auth.signup({
          email: email.trim(),
          username: username.trim(),
          full_name: fullName.trim() || null,
          organisation: organisation.trim() || null,
          password,
        });
      setNotice(response.message);
      setDevVerificationUrl(response.verification_url || null);
      setMode('signin');
      setIdentifier(email.trim());
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const detail = toErrorMessage(err?.response?.data?.detail, mode === 'signin' ? 'Could not sign in.' : 'Could not create your account.');
      if (err?.response?.status === 401) setError('Invalid email or password.');
      else if (!err?.response) setError('Network error. Please check your connection.');
      else setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_30%),linear-gradient(145deg,rgba(15,23,42,0.94),rgba(2,6,23,1))]" />
        <div className="relative">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-sky-400 text-slate-950">
            <BookOpenCheck className="h-8 w-8" />
          </div>
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-normal">Create your pre-submission review workspace.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Sign up to review manuscripts, save report history, download PDF feedback, and build a repeatable quality gate before submission.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-slate-200">
            {[
              'Private manuscript review history',
              'Structured reviewer-style critique',
              'Professional profile for authors and teams',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-sky-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="relative rounded-lg border border-white/10 bg-white/10 p-5 text-sm text-slate-200">
          <div className="mb-3 flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            Built for serious research workflows
          </div>
          Accounts keep each author’s manuscripts, progress, reports, and profile separated from everyone else.
        </div>
      </section>

      <main className="flex items-center justify-center bg-slate-50 p-5">
        <div className="w-full max-w-md rounded-lg border border-slate-100 bg-white p-5 shadow-xl sm:p-6">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-slate-900">{mode === 'signup' ? 'Start reviewing manuscripts' : 'Welcome back'}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === 'signup' ? 'Create your AI Research Reviewer account.' : 'Sign in to continue your review work.'}</p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={`rounded-md px-3 py-2 ${mode === 'signup' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Sign up</button>
            <button type="button" onClick={() => { setMode('signin'); setError(''); }} className={`rounded-md px-3 py-2 ${mode === 'signin' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Sign in</button>
          </div>

          {googleClientId ? (
            <div className="flex justify-center">
              <div ref={googleButtonRef} className={googleLoading ? 'pointer-events-none opacity-60' : ''} />
            </div>
          ) : (
            <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-400">
              Continue with Google
            </button>
          )}

          {notice ? (
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
              {devVerificationUrl ? (
                <a href={devVerificationUrl} className="mt-2 block font-semibold text-emerald-800 underline">Open local verification link</a>
              ) : null}
            </div>
          ) : null}

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            or
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            {mode === 'signup' ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-sky-500">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Dr. Aisha Rahman" className="w-full outline-none" />
                  </div>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-sky-500">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" className="w-full outline-none" />
                  </div>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Username
                    <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="aisha_research" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:ring-2 focus:ring-sky-500" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Organisation
                    <input value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder="University / lab" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:ring-2 focus:ring-sky-500" />
                  </label>
                </div>
              </>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                Email or username
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-sky-500">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you@university.edu" className="w-full outline-none" />
                </div>
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Password
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-sky-500">
                <Lock className="h-4 w-4 text-slate-400" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="w-full outline-none" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {mode === 'signup' ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm password
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-sky-500">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="w-full outline-none" />
                  </div>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-2 rounded ${index < strength ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength - 1] : 'bg-slate-100'}`} />)}
                </div>
              </>
            ) : null}
          </div>

          <button type="button" disabled={loading} onClick={() => void submit()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
            {loading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Create account' : 'Sign in')}
            <ArrowRight className="h-4 w-4" />
          </button>
          {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
      </main>
    </div>
  );
}
