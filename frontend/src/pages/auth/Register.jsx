import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/errors';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your name.'); return; }
    if (!form.email.trim()) { toast.error('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      toast.error('That email address does not look valid (example: name@example.com).');
      return;
    }
    if (!form.password) { toast.error('Please choose a password.'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters long.'); return; }
    if (form.password !== form.confirm) { toast.error('The two passwords do not match.'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created — welcome to TripSync 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create your account'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel — decorative ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-primary-container via-inverse-surface to-[#0f2a4a] p-margin-desktop relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-amber/5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-space-sm">
          <span className="text-3xl select-none">✈️</span>
          <span className="font-newsreader text-headline-sm text-inverse-on-surface tracking-tight">TripSync</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col gap-space-lg">
          <h1 className="font-newsreader text-display-lg-mobile text-inverse-on-surface leading-tight">
            Your next<br/>adventure<br/>starts here.
          </h1>
          <p className="font-manrope text-body-lg text-inverse-on-surface/70 max-w-sm">
            Create a free account and invite your friends in seconds.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-space-sm">
            {[
              { step: '01', text: 'Create your account' },
              { step: '02', text: 'Start or join a trip' },
              { step: '03', text: 'Plan together in real-time' },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-space-md">
                <span className="font-manrope text-label-caps text-secondary font-bold w-6 shrink-0">{s.step}</span>
                <span className="font-manrope text-body-md text-inverse-on-surface/80">{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-manrope text-label-caps text-inverse-on-surface/40 uppercase tracking-widest">
          Free forever · No credit card needed
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
            <h2 className="font-newsreader text-headline-xl-mobile text-on-surface">Create account</h2>
            <p className="font-manrope text-body-md text-on-surface-variant mt-1">
              Join thousands of groups planning smarter.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
            {/* Name */}
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-lg pointer-events-none">person</span>
                <input
                  id="name" type="text" autoComplete="name" required
                  value={form.name} onChange={e => set('name', e.target.value)}
                  className="input pl-10" placeholder="Rahul Sharma"
                />
              </div>
            </div>

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
                  autoComplete="new-password" required
                  value={form.password} onChange={e => set('password', e.target.value)}
                  className="input pl-10 pr-11" placeholder="Min. 6 characters"
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

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm" className="label">Confirm password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-lg pointer-events-none">lock_reset</span>
                <input
                  id="confirm" type="password" autoComplete="new-password" required
                  value={form.confirm} onChange={e => set('confirm', e.target.value)}
                  className="input pl-10" placeholder="Repeat password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="btn-secondary w-full justify-center mt-2 h-12 text-base"
            >
              {loading
                ? <><Spinner size="sm" className="text-white" /> Creating account…</>
                : <><span className="material-symbols-outlined text-xl">person_add</span> Create account</>
              }
            </button>
          </form>

          <div className="flex items-center gap-space-md my-space-lg">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="font-manrope text-label-caps text-on-surface-variant">OR</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>

          <p className="text-center font-manrope text-body-md text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="text-secondary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
