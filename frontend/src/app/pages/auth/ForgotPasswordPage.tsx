import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useUrlParam } from '../../hooks/useUrlParam';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp';
import { CodeExpiryClock, DEFAULT_CODE_SECONDS, useCodeExpiry } from '../../components/common/CodeExpiryClock';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import type { TranslationKey } from '../../i18n/translations';

type Step = 'email' | 'reset' | 'done';

const inputClass =
  'w-full pl-11 pr-4 py-3.5 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50';
const labelClass = 'block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest';

// Same rules as the server (PasswordValidator); returns the translation key of the first broken rule
function passwordProblem(pwd: string): TranslationKey | null {
  if (pwd.length < 8) return 'password.min';
  if (pwd.length > 128) return 'password.max';
  if (/\s/.test(pwd)) return 'password.noSpaces';
  if (pwd.toLowerCase().includes('password')) return 'password.noWord';
  if (!/[A-Z]/.test(pwd)) return 'password.upper';
  if (!/[a-z]/.test(pwd)) return 'password.lower';
  if (!/\d/.test(pwd)) return 'password.digit';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'password.special';
  return null;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  // The step lives in the URL so the back arrow returns to the previous step (a fresh visit starts at the e-mail)
  const [stepParam, setStepParam] = useUrlParam('step', { resetOnMount: true });
  const step: Step = stepParam === 'reset' || stepParam === 'done' ? stepParam : 'email';
  const setStep = (next: Step) => setStepParam(next === 'email' ? null : next);
  // ?email= comes from the "you are now an administrator" email link
  const [email, setEmail] = useState<string>(
    (location.state as any)?.email || new URLSearchParams(location.search).get('email') || '');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  // Lifetime of the code (2 minutes), counted down every second
  const [expirySeconds, setExpirySeconds] = useState(DEFAULT_CODE_SECONDS);
  const secondsLeft = useCodeExpiry(sessionId || undefined, expirySeconds);
  const expired = secondsLeft <= 0;

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(t('forgot.invalidEmail'));
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.expiresIn) setExpirySeconds(res.expiresIn);
      setSessionId(res.resetSessionId);
      setCode('');
      setStep('reset');
      toast.success(t('forgot.codeSent'));
    } catch (err: any) {
      toast.error(err.message || t('forgot.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  // Same request as the first one (so it never reveals whether the account exists); the new code
  // replaces the previous one, so the new session id must be kept.
  const resendCode = async () => {
    if (resending || busy) return;
    setResending(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.expiresIn) setExpirySeconds(res.expiresIn);
      setSessionId(res.resetSessionId); // new session = the clock restarts
      setCode('');
      toast.success(t('common.newCodeSent'));
    } catch (err: any) {
      toast.error(err.message || t('forgot.sendFailed'));
    } finally {
      setResending(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error(t('forgot.enterCode'));
      return;
    }
    if (expired) {
      toast.error(t('common.codeExpiredToast'));
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      toast.error(t('forgot.passwordProblem', { problem: t(problem).toLowerCase() }));
      return;
    }
    if (password !== confirm) {
      toast.error(t('forgot.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(sessionId, code, password);
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || t('forgot.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const problem = password ? passwordProblem(password) : null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
      <ParticleBackground />
      <div className="absolute top-4 right-4 z-20"><LanguageToggle /></div>
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
                  <h1 className="text-3xl font-bold mb-2">{t('forgot.title')}</h1>
                  <p className="text-muted-foreground text-sm">{t('forgot.subtitle')}</p>
                </div>
                <form onSubmit={sendCode} className="space-y-5">
                  <div>
                    <label htmlFor="fp-email" className={labelClass}>{t('common.email')}</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com" className={inputClass} autoFocus />
                    </div>
                  </div>
                  <Button type="submit" fullWidth disabled={busy}>{busy ? t('forgot.sending') : t('forgot.send')}</Button>
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">{t('forgot.newTitle')}</h1>
                  <p className="text-muted-foreground text-sm">
                    {t('forgot.sentBefore')} <span className="text-foreground font-medium">{email}</span> {t('forgot.sentAfter')}
                  </p>
                </div>
                <form onSubmit={resetPassword} className="space-y-5">
                  <div>
                    <label htmlFor="fp-code" className={labelClass}>{t('forgot.code')}</label>
                    <div className="flex justify-center">
                      <InputOTP id="fp-code" maxLength={6} value={code} autoFocus
                        onChange={(val) => setCode(val.replace(/\D/g, ''))}>
                        <InputOTPGroup className="gap-2 sm:gap-3">
                          {[0, 1, 2, 3, 4, 5].map(i => (
                            <InputOTPSlot key={i} index={i}
                              className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="mt-4">
                      <CodeExpiryClock secondsLeft={secondsLeft} total={expirySeconds} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fp-password" className={labelClass}>{t('forgot.newPassword')}</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className={`mt-1.5 text-xs ${problem ? 'text-amber-600 dark:text-amber-400' : password ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {problem ? t(problem) : password ? t('forgot.strong') : t('forgot.rules')}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="fp-confirm" className={labelClass}>{t('forgot.confirm')}</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input id="fp-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                        onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className={inputClass} />
                    </div>
                    {confirm && confirm !== password && <p className="mt-1.5 text-xs text-destructive">{t('forgot.mismatch')}</p>}
                  </div>
                  <Button type="submit" fullWidth disabled={busy || expired}>{busy ? t('forgot.saving') : t('forgot.change')}</Button>
                  <div className="pt-4 border-t border-border/50 text-center">
                    <p className="text-sm text-muted-foreground mb-2">{t('common.noCodeReceived')}</p>
                    <button type="button" onClick={resendCode} disabled={busy || resending}
                      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                        busy || resending
                          ? 'text-muted-foreground cursor-not-allowed opacity-60'
                          : 'text-primary hover:text-primary/80 cursor-pointer'
                      }`}>
                      {resending ? (
                        <><RefreshCw size={14} className="animate-spin" /> {t('common.sendingNewCode')}</>
                      ) : (
                        <><RefreshCw size={14} /> {t('common.resendCode')}</>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'done' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-6">
                  <CheckCircle className="text-emerald-500" size={32} />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t('forgot.doneTitle')}</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  {t('forgot.doneText')}
                </p>
                <Button fullWidth onClick={() => navigate('/login', { state: { email } })}>{t('forgot.goToLogin')}</Button>
              </div>
            )}

            {step !== 'done' && (
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft size={14} /> {t('common.backToLogin')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
