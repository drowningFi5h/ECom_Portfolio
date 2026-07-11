'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/management';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/management/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      router.push(body.redirect ?? next);
      router.refresh();
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? 'Login failed.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rahul Business Services</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
