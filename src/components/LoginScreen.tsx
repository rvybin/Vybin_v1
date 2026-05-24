import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const toggleAuthMode = (newMode: boolean) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsSignUp(newMode);
      setError('');
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName);
        setShowSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#EBF5FF] via-white to-[#FFF4E8]" />
        <div className="relative w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] shadow-[0_8px_30px_rgba(14,165,233,0.4)]">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[#1D1D1F]">Welcome, {fullName.split(' ')[0]}!</h2>
          <p className="text-[#6E6E73]">Your account has been created successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-10">
      {/* Background — matches landing page */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#EBF5FF] via-white to-[#FFF4E8]" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-7 text-center">
          <div className="mb-3 flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img src="/VybinLogo.png" alt="Vybin logo" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-[#0EA5E9]">vybin</span>
          </div>
          <p className="text-sm text-[#6E6E73]">Discover. Connect. Vybe.</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white px-6 py-7 shadow-[0_4px_32px_rgba(0,0,0,0.08)] sm:px-8 sm:py-8">
          <div
            className={`transition-all duration-200 ease-out ${
              isTransitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <h2 className="mb-5 text-lg font-bold text-[#1D1D1F] sm:text-xl">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1D1D1F]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-[#F5F5F7] py-3 pl-10 pr-4 text-sm text-[#1D1D1F] placeholder-[#8E8E93] outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20"
                      placeholder="John Doe"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1D1D1F]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#F5F5F7] py-3 pl-10 pr-4 text-sm text-[#1D1D1F] placeholder-[#8E8E93] outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20"
                    placeholder="yourname@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1D1D1F]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#F5F5F7] py-3 pl-10 pr-4 text-sm text-[#1D1D1F] placeholder-[#8E8E93] outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all duration-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_6px_28px_rgba(14,165,233,0.48)]"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#8E8E93]">or</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white py-3 text-sm font-semibold text-[#1D1D1F] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_4px_18px_rgba(0,0,0,0.10)]"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.94 0 6.7 1.7 8.25 3.1l6.08-5.88C34.14 3.3 29.64 1 24 1 14.97 1 7.26 6.58 4.14 14.26l7.48 5.82C13.07 13.5 18.02 9.5 24 9.5z" />
                <path fill="#34A853" d="M46.15 24.5c0-1.64-.14-3.18-.4-4.68H24v9.04h12.5c-.54 2.77-2.16 5.1-4.57 6.66l7.02 5.47C43.7 36.13 46.15 30.79 46.15 24.5z" />
                <path fill="#4A90E2" d="M11.62 28.09a14.28 14.28 0 0 1-.76-4.59c0-1.6.28-3.14.76-4.59l-7.48-5.82A23.67 23.67 0 0 0 .5 23.5C.5 30.47 3.8 36.63 9 40.61l7.28-5.76c-2.32-1.47-4.05-3.84-4.66-6.76z" />
                <path fill="#FBBC05" d="M24 46.5c6.08 0 11.18-2.02 14.9-5.52l-7.02-5.47c-1.96 1.31-4.47 2.07-7.88 2.07-5.98 0-10.93-4-12.37-9.62l-7.48 5.82C7.26 41.42 14.97 46.5 24 46.5z" />
              </svg>
              Continue with Google
            </button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => toggleAuthMode(!isSignUp)}
                disabled={isTransitioning || loading}
                className="text-sm font-medium text-[#0EA5E9] transition-colors hover:text-[#0369A1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
