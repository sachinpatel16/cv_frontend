'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { register } from '@/lib/api/auth';
import { ApiError } from '@/types/api';
import toast from 'react-hot-toast';

function getStrength(p: string) {
  if (!p) return { label: '', color: 'bg-gray-200', w: 'w-0' };
  if (p.length < 6) return { label: 'Weak', color: 'bg-red-500', w: 'w-1/3' };
  if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p))
    return { label: 'Medium', color: 'bg-[#F59E0B]', w: 'w-2/3' };
  return { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' };
}

export function SignupForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const strength = getStrength(form.password);

  function update(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Call backend register — cookies are auto-set by the browser
      const response = await register({
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
      });
      const user = response.data;

      // Step 2: Create NextAuth session by passing user data
      const result = await signIn('credentials', {
        redirect: false,
        email: user.email,
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        tenantId: user.tenant_id,
      });

      if (result?.error) {
        toast.error('Failed to create session');
        router.push('/login');
      } else {
        toast.success('Account created successfully');
        router.push('/dashboard');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        error.message.split('\n').forEach((line) => toast.error(line));
        setError(error.message);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Start analysing footage in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              placeholder="Alex"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              placeholder="Morgan"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Work email
          </label>
          <input
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              className={inputCls + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.password && (
            <div className="space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${strength.color} ${strength.w}`}
                />
              </div>
              <p className="text-xs text-gray-400">
                Password strength:{' '}
                <span className="font-medium text-gray-600">
                  {strength.label}
                </span>
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-9 w-full items-center justify-center rounded-md bg-[#1565C0] text-sm font-medium text-white hover:bg-[#1565C0]/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Create account'
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          By creating an account you agree to our{' '}
          <a href="#" className="underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="underline">
            Privacy Policy
          </a>
        </p>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        {onSwitchToLogin ? (
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-[#1565C0] hover:underline"
          >
            Sign in
          </button>
        ) : (
          <Link
            href="/login"
            className="font-medium text-[#1565C0] hover:underline"
          >
            Sign in
          </Link>
        )}
      </p>
    </div>
  );
}

const inputCls =
  'w-full h-9 rounded-md border border-gray-200 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0]';
