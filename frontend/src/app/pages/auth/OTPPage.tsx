import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { saveSession } from '../../utils/localStorage';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import { CodeExpiryClock, DEFAULT_CODE_SECONDS, useCodeExpiry } from '../../components/common/CodeExpiryClock';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../../components/ui/input-otp';

export function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = (location.state as any)?.email || t('otp.yourEmail');
  const destination = (location.state as any)?.destination;
  // Each resend replaces the code and returns a new session id: keep the latest one
  const [otpSessionId, setOtpSessionId] = useState<string | undefined>((location.state as any)?.otpSessionId);
  const rememberMe = Boolean((location.state as any)?.rememberMe);
  // Lifetime of the code (2 minutes), counted down every second
  const [expirySeconds, setExpirySeconds] = useState<number>(Number((location.state as any)?.expiresIn) || DEFAULT_CODE_SECONDS);
  const secondsLeft = useCodeExpiry(otpSessionId, expirySeconds);
  const expired = secondsLeft <= 0;

  const handleVerify = async (e?: React.FormEvent, code: string = otp) => {
    e?.preventDefault();
    if (isLoading) return;
    if (code.length < 6) {
      toast.error(t('otp.fullCode'));
      return;
    }
    if (expired) {
      toast.error(t('common.codeExpiredToast'));
      return;
    }

    setIsLoading(true);
    try {
      if (!otpSessionId) {
        throw new Error(t('otp.sessionExpired'));
      }

      // Call the unified verifyOtp endpoint
      const tokenData = await api.verifyOtp(email, code, otpSessionId, rememberMe);

      // The API set the HttpOnly session cookies; keep only the profile for the UI
      saveSession(tokenData);
      const role = String(tokenData.role || 'USER').replace(/^ROLE_/i, '').toUpperCase();

      toast.success(t('otp.success'));

      const returnUrl = (location.state as any)?.returnUrl;
      const eventName = (location.state as any)?.eventName;

      const isSafeReturn = typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//');
      if (isSafeReturn && role !== 'ADMIN') {
        if (eventName) toast.success(t('otp.resuming', { event: eventName }));
        navigate(returnUrl);
      } else {
        // Honor explicit destination if provided by the caller.
        const targetDestination = destination || (role === 'ADMIN' ? '/admin' : '/dashboard');
        navigate(targetDestination);
      }
    } catch (error: any) {
      toast.error(error.message || t('otp.invalid'));
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };


  const handleResend = async () => {
    if (isResending) return; // one email per click: a second one would replace this code
    if (!otpSessionId) {
      toast.error(t('otp.sessionExpired'));
      navigate('/login');
      return;
    }
    setIsResending(true);
    try {
      const data = await api.resendOtp(otpSessionId);
      if (data?.expiresIn) setExpirySeconds(data.expiresIn);
      if (data?.otpSessionId) setOtpSessionId(data.otpSessionId); // new session = the clock restarts
      setOtp('');
      toast.success(t('common.newCodeSent'));
    } catch (error: any) {
      toast.error(error.message || t('otp.resendFailed'));
      // The session is gone (used, or too old): the only way forward is a new login
      if (error.status === 404) navigate('/login', { state: { email: email === t('otp.yourEmail') ? '' : email } });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
      <ParticleBackground />
      <div className="absolute top-4 right-4 z-20"><LanguageToggle /></div>

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="p-px rounded-3xl bg-gradient-to-br from-primary/30 via-foreground/5 to-accent/20">
          <div className="bg-card backdrop-blur-2xl rounded-3xl p-10 shadow-glass">

            <div className="flex justify-center mb-8">
              <Logo size="md" />
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
                <Shield className="text-primary" size={24} />
              </div>
              <h1 className="text-3xl font-bold mb-2">{t('otp.title')}</h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mx-auto">
                {t('otp.sentTo')} <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-8">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val.replace(/\D/g, ''))}
                  onComplete={(val: string) => handleVerify(undefined, val)}
                  disabled={isLoading || expired}
                >
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot index={0} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-xl font-semibold bg-accent/50 border-border/50 rounded-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <CodeExpiryClock secondsLeft={secondsLeft} total={expirySeconds} />

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={isLoading || expired || otp.length < 6}
                  fullWidth
                  className="h-12 text-base font-semibold"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                       <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                       <span>{t('otp.verifying')}</span>
                    </div>
                  ) : (
                    t('otp.verify')
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                   className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <ArrowLeft size={14} />
                  {t('common.backToLogin')}
                </button>
              </div>

              <div className="pt-4 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {t('common.noCodeReceived')}
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                    !isResending
                      ? 'text-primary hover:text-primary/80 cursor-pointer'
                      : 'text-muted-foreground cursor-not-allowed opacity-60'
                  }`}
                >
                  {isResending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      {t('common.sendingNewCode')}
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      {t('common.resendCode')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
