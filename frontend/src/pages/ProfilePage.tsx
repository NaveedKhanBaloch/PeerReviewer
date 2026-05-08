import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useAuthStore } from '../stores/authStore';

const avatarColors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-teal-600'];

function colorFor(username: string) {
  return avatarColors[username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];
}

function strength(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    organisation: user?.organisation || '',
    avatar_url: user?.avatar_url || '',
  });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const reviewsQuery = useQuery({ queryKey: ['my-reviews'], queryFn: () => api.getReviews(200, 0, true), enabled: Boolean(user) });

  const counts = useMemo(() => {
    const items = reviewsQuery.data || [];
    return {
      total: items.length,
      accept: items.filter((item) => item.recommendation === 'Accept').length,
      minor: items.filter((item) => item.recommendation === 'Minor revision').length,
      major: items.filter((item) => item.recommendation === 'Major revision').length,
      reject: items.filter((item) => item.recommendation === 'Reject').length,
      complete: items.filter((item) => item.status === 'complete').length,
    };
  }, [reviewsQuery.data]);

  if (!user) return null;

  const displayName = user.full_name || user.username;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || user.username.slice(0, 1).toUpperCase();
  const passwordScore = strength(passwords.next);
  const canChange = Boolean(passwords.current && passwords.next === passwords.confirm && passwordScore >= 3);
  const acceptanceRate = counts.complete ? Math.round((counts.accept / counts.complete) * 100) : 0;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await api.auth.updateMe({
        full_name: profile.full_name.trim() || null,
        organisation: profile.organisation.trim() || null,
        avatar_url: profile.avatar_url.trim() || null,
      });
      updateUser(updated);
      toast.success('Profile updated successfully');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    await api.auth.changePassword(passwords.current, passwords.next);
    toast.success('Password changed. Please log in again.');
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 2000);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-8 text-slate-950">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-normal text-slate-950">Profile</h1>
          <p className="mt-2 text-base font-medium text-slate-500">Manage your account, identity, and security settings.</p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          Account active
        </span>
      </div>

      <div>
        <ErrorBoundary>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-950 px-7 py-7 text-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-5">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-white/10" />
                  ) : (
                    <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-white/10 ${colorFor(user.username)}`}>
                      {initials}
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold tracking-normal">{displayName}</h1>
                    <p className="mt-1 text-base font-medium text-slate-400">@{user.username}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
                        <Building2 className="h-4 w-4" />
                        {user.organisation || 'Organisation not set'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:min-w-[360px]">
                  <div className="rounded-lg bg-white/8 p-4">
                    <div className="font-bold text-white">{new Date(user.created_at).toLocaleDateString()}</div>
                    <div className="mt-1">Member since</div>
                  </div>
                  <div className="rounded-lg bg-white/8 p-4">
                    <div className="font-bold text-white">{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'No login yet'}</div>
                    <div className="mt-1">Last login</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-4">
              <StatTile label="Reviews" value={counts.total} />
              <StatTile label="Completed" value={counts.complete} />
              <StatTile label="Accepted" value={counts.accept} />
              <StatTile label="Accept rate" value={`${acceptanceRate}%`} />
            </div>
          </section>
        </ErrorBoundary>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <ErrorBoundary>
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                    <UserRound className="h-5 w-5 text-blue-600" />
                    Profile details
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Keep your author identity and workspace information current.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Full name</span>
                  <input
                    value={profile.full_name}
                    onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
                    placeholder="Dr. Aria Singh"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Organisation</span>
                  <input
                    value={profile.organisation}
                    onChange={(event) => setProfile({ ...profile, organisation: event.target.value })}
                    placeholder="University, lab, or company"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Avatar URL</span>
                  <input
                    value={profile.avatar_url}
                    onChange={(event) => setProfile({ ...profile, avatar_url: event.target.value })}
                    placeholder="https://..."
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => void saveProfile()}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </section>
          </ErrorBoundary>

          <ErrorBoundary>
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Account status
              </h2>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">Email verification</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${user.is_email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {user.is_email_verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {user.is_email_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">Account created</div>
                      <div className="text-sm text-slate-500">{new Date(user.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">Review activity</div>
                      <div className="text-sm text-slate-500">{counts.total} manuscript submissions</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ErrorBoundary>
        </div>

        <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <ErrorBoundary>
            <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <LockKeyhole className="h-5 w-5 text-blue-600" />
                Password & security
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Use a strong password to protect private manuscript review data.</p>

              <div className="mt-6 space-y-3">
                {(['current', 'next', 'confirm'] as const).map((field) => (
                  <div key={field} className="flex h-11 items-center rounded-lg border border-slate-200 px-3 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={passwords[field]}
                      onChange={(event) => setPasswords({ ...passwords, [field]: event.target.value })}
                      placeholder={field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
                      className="w-full bg-transparent text-sm font-medium outline-none"
                    />
                    <button type="button" onClick={() => setShowPasswords((value) => !value)} className="text-slate-400">
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className={`h-2 rounded ${index < passwordScore ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][passwordScore - 1] : 'bg-slate-100'}`} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!canChange}
                onClick={() => void changePassword()}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Update password
              </button>
            </section>
          </ErrorBoundary>

          <ErrorBoundary>
            <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Review statistics</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">A quick readout of your manuscript review outcomes.</p>
              {reviewsQuery.isLoading ? <LoadingSkeleton /> : (
                <div className="mt-6 grid flex-1 content-start gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Accept {counts.accept}</div>
                  <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">Minor revision {counts.minor}</div>
                  <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">Major revision {counts.major}</div>
                  <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Reject {counts.reject}</div>
                </div>
              )}
            </section>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
