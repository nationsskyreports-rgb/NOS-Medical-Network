'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader as Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ALLOWED_DOMAIN = 'nationsofsky.com';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const validateDomain = (email: string) => {
    return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateDomain(email)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are accepted.`);
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    });

    if (resetError) {
      setError('Something went wrong. Please try again later.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C16 4 8 10 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 10 16 4 16 4Z" fill="white" fillOpacity="0.9"/>
              <path d="M13 18H19M16 15V21" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">NOS Medical Network</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {!sent ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Forgot your password?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your work email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder={`you@${ALLOWED_DOMAIN}`}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Must be a <span className="font-medium text-blue-600">@{ALLOWED_DOMAIN}</span> email address
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 flex items-start gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5"/>
                      <path d="M8 5V8.5M8 11H8.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-1">
                We sent a password reset link to:
              </p>
              <p className="text-sm font-semibold text-blue-700 mb-6">{email}</p>
              <p className="text-xs text-gray-400 mb-6">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  try again
                </button>
                .
              </p>
            </div>
          )}

          {/* Back to login */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-700 transition-colors font-medium"
            >
              <ArrowLeft size={15} />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Nations of Sky &mdash; Internal Use Only
        </p>
      </div>
    </div>
  );
}
