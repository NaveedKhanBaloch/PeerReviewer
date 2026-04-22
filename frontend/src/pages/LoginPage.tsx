import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, SearchCheck, Sparkles } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import { toErrorMessage } from '../api/errorMessage';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { accessToken, login, user } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/app';

  if (accessToken && user) return <Navigate to="/app" replace />;

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.auth.login(email, password);
      login(response);
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const detail = toErrorMessage(err?.response?.data?.detail, 'Could not sign in.');
      if (detail.includes('deactivated')) setError('Your account has been deactivated. Contact your administrator.');
      else if (err?.response?.status === 401) setError('Invalid email or password');
      else if (!err?.response) setError('Network error. Please check your connection.');
      else setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
        <div>
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
            <SearchCheck className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Research Reviewer</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">Peer review powered by AI — to Q1 journal standards</p>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            {['Instant structured review', '6-dimension scoring', 'PDF report download'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-blue-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500">Powered by Gemini + LangGraph</div>
      </section>
      <main className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to your account</p>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-blue-500">
            <Mail className="h-4 w-4 text-slate-400" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" className="w-full outline-none" />
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 focus-within:ring-2 focus-within:ring-blue-500">
            <Lock className="h-4 w-4 text-slate-400" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} className="w-full outline-none" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="button" disabled={loading} onClick={() => void submit()} className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
          <p className="mt-6 text-center text-xs text-slate-400">Forgot your password? Contact your administrator.</p>
        </div>
      </main>
    </div>
  );
}
