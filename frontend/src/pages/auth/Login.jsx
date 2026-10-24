import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/errors';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // If we were sent here because the session expired, say so (once)
  useEffect(() => {
    const reason = sessionStorage.getItem('tripsync_signed_out');
    if (reason) {
      sessionStorage.removeItem('tripsync_signed_out');
      toast.error(reason, { id: 'signed-out' });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      toast.error('That email address does not look valid (example: name@example.com).');
      return;
    }
    if (!form.password) { toast.error('Please enter your password.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not sign you in'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel — decorative ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-primary-container via-inverse-surface to-[#0f2a4a] p-margin-desktop relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-tertiary-fixed/10 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-space-sm">
          <span className="text-3xl select-none">✈️</span>
          <span className="font-newsreader text-headline-sm text-inverse-on-surface tracking-tight">TripSync</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col gap-space-lg">
          <h1 className="font-newsreader text-display-lg-mobile text-inverse-on-surface leading-tight">
            Plan trips<br/>together,<br/>effortlessly.
          </h1>
          <p className="font-manrope text-body-lg text-inverse-on-surface/70 max-w-sm">
            Itineraries, group votes, shared expenses — one workspace for your whole crew.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-space-sm">
            {[
              { icon: 'calendar_month', text: 'Day-by-day itinerary planner' },
              { icon: 'how_to_vote',    text: 'Group polls & decisions' },
              { icon: 'receipt_long',   text: 'Expense splitting & settlements' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base text-inverse-on-surface">{f.icon}</span>
                </div>
                <span className="font-manrope text-body-md text-inverse-on-surface/80">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 font-manrope text-label-caps text-inverse-on-surface/40 uppercase tracking-widest">
          Real-time · Collaborative · Free
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile md:px-margin py-space-xl">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-space-sm mb-space-xl">
          <span className="text-2xl">✈️</span>
          <span className="font-newsreader text-headline-sm text-on-surface">TripSync</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-space-xl">
            <h2 className="font-newsreader text-headline-xl-mobile text-on-surface">Sign in</h2>
            <p className="font-manrope text-body-md text-on-surface-variant mt-1">
              Welcome back — your crew is waiting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-lg pointer-events-none">mail</span>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={form.email} onChange={e => set('email', e.target.value)}
                  className="input pl-10" placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-lg pointer-events-none">lock</span>
                <input
                  id="password" type={showPw ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={form.password} onChange={e => set('password', e.target.value)}
                  className="input pl-10 pr-11" placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-on-surface-variant hover:text-on-surface transition-colors"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="btn-secondary w-full justify-center mt-2 h-12 text-base"
            >
              {loading
                ? <><Spinner size="sm" className="text-white" /> Signing in…</>
                : <><span className="material-symbols-outlined text-xl">login</span> Sign in</>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-space-md my-space-lg">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="font-manrope text-label-caps text-on-surface-variant">OR</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>

          <p className="text-center font-manrope text-body-md text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/register" className="text-secondary font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
