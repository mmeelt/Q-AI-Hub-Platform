import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

type Step = 'email' | 'reset' | 'done';

const inputClass =
  'w-full pl-11 pr-4 py-3.5 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50';
const labelClass = 'block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest';

// Same rules as the server (PasswordValidator)
function passwordProblem(pwd: string): string | null {
  if (pwd.length < 8) return 'At least 8 characters';
  if (pwd.length > 128) return 'At most 128 characters';
  if (/\s/.test(pwd)) return 'No spaces';
  if (pwd.toLowerCase().includes('password')) return 'Must not contain the word "password"';
  if (!/[A-Z]/.test(pwd)) return 'At least one uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'At least one lowercase letter';
  if (!/\d/.test(pwd)) return 'At least one digit';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'At least one special character';
  return null;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>('email');
  // ?email= comes from the "you are now an administrator" email link
  const [email, setEmail] = useState<string>(
    (location.state as any)?.email || new URLSearchParams(location.search).get('email') || '');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setSessionId(res.resetSessionId);
      setCode('');
      setStep('reset');
      toast.success('If an account exists for this email, a code has been sent.');
    } catch (err: any) {
      toast.error(err.message || 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from the email');
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      toast.error(`Password: ${problem.toLowerCase()}`);
      return;
    }
    if (password !== confirm) {
      toast.error('The two passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(sessionId, code, password);
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setBusy(false);
    }
  };

  const problem = password ? passwordProblem(password) : null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="p-px rounded-3xl bg-gradient-to-br from-primary/30 via-foreground/5 to-accent/20">
          <div className="bg-card backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-glass">
            <div className="flex justify-center mb-6">
              <Link to="/"><Logo size="sm" /></Link>
            </div>

            {step === 'email' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">Forgot password?</h1>
                  <p className="text-muted-foreground text-sm">Enter your email and we'll send you a code to choose a new password.</p>
                </div>
                <form onSubmit={sendCode} className="space-y-5">
                  <div>
                    <label htmlFor="fp-email" className={labelClass}>Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com" className={inputClass} autoFocus />
                    </div>
                  </div>
                  <Button type="submit" fullWidth disabled={busy}>{busy ? 'Sending…' : 'Send the code'}</Button>
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">Choose a new password</h1>
                  <p className="text-muted-foreground text-sm">
                    If <span className="text-foreground font-medium">{email}</span> has an account, a 6-digit code was sent to it.
                    It expires in 5 minutes.
                  </p>
                </div>
                <form onSubmit={resetPassword} className="space-y-5">
                  <div>
                    <label htmlFor="fp-code" className={labelClass}>Code from the email</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456" className={`${inputClass} tracking-[0.4em] font-mono`} autoFocus />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fp-password" className={labelClass}>New password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className={`mt-1.5 text-xs ${problem ? 'text-amber-600 dark:text-amber-400' : password ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {problem ? problem : password ? 'Strong password' : '8+ characters with upper and lower case, a digit and a symbol'}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="fp-confirm" className={labelClass}>Confirm the new password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                        onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className={inputClass} />
                    </div>
                    {confirm && confirm !== password && <p className="mt-1.5 text-xs text-destructive">The passwords do not match</p>}
                  </div>
                  <Button type="submit" fullWidth disabled={busy}>{busy ? 'Saving…' : 'Change my password'}</Button>
                  <p className="text-center text-sm text-muted-foreground">
                    No email?{' '}
                    <button type="button" onClick={() => sendCode()} disabled={busy} className="text-primary hover:text-primary/80 font-medium">
                      Send a new code
                    </button>{' '}
                    (check your spam folder too)
                  </p>
                </form>
              </>
            )}

            {step === 'done' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-6">
                  <CheckCircle className="text-emerald-500" size={32} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Password changed</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  You were signed out on all your devices. Log in with your new password.
                </p>
                <Button fullWidth onClick={() => navigate('/login', { state: { email } })}>Go to login</Button>
              </div>
            )}

            {step !== 'done' && (
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
