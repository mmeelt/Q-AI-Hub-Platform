import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, User, Users, Check } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { saveSession } from '../../utils/localStorage';


export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  // ?redirect= comes from RequireAuth and from the expert invitation email; only same-site paths are allowed
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : undefined;
  const returnUrl = (location.state as any)?.returnUrl || safeRedirect;
  const eventName = (location.state as any)?.eventName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoading(true);
    try {
      if (isAdminLogin) {
        // Admin login now also uses OTP flow for security
        const data = await api.adminLogin(email, password);
        const otpSessionId = data.otpSessionId;

        localStorage.setItem('tempEmail', email);
        toast.success('Admin credentials verified. Check your email for the OTP code.');

        navigate('/otp', { state: { email, otpSessionId, destination: '/admin', rememberMe } });
      } else {
        // Normal user login: usually a code is emailed (OTP page)
        const data = await api.login(email, password, rememberMe);

        if (data.requiresOtp === false) {
          // Email already verified and the admin does not require a code at every login
          saveSession(data);
          toast.success('Welcome back!');
          const role = String(data.role || 'USER').replace(/^ROLE_/i, '').toUpperCase();
          const safeReturn = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;
          navigate(safeReturn || (role === 'ADMIN' ? '/admin' : '/dashboard'));
          return;
        }

        const otpSessionId = data.otpSessionId;

        localStorage.setItem('tempEmail', email);

        toast.success('Credentials verified. Check your email for the OTP code.');
        
        if (returnUrl) {
          navigate('/otp', { state: { email, returnUrl, eventName, otpSessionId, rememberMe } });
        } else {
          navigate('/otp', { state: { email, otpSessionId, rememberMe } });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
      <ParticleBackground />

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

            <div className="flex justify-center mb-6">
              <Logo size="md" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {eventName
                  ? `Sign in to continue your application for ${eventName}`
                  : 'Sign in to access your dashboard and applications'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="your@email.com"
                    className={`w-full pl-11 pr-4 py-3.5 bg-muted/30 rounded-xl border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 ${errors.email ? 'border-destructive/60' : 'border-border focus:border-primary/50'
                      }`}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3.5 bg-muted/30 rounded-xl border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 ${errors.password ? 'border-destructive/60' : 'border-border focus:border-primary/50'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Admin toggle */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdminLogin(p => !p)}
                  className={`w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${isAdminLogin ? 'bg-primary/20 border-primary/60' : 'border-border bg-transparent'}`}
                >
                  {isAdminLogin && <Check size={10} strokeWidth={3} className="text-primary" />}
                </button>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary" />
                  Admin sign-in
                </span>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => setRememberMe(p => !p)}
                    className={`w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${rememberMe ? 'bg-primary/20 border-primary/60' : 'border-border bg-transparent'
                      }`}
                  >
                    {rememberMe && <Check size={10} strokeWidth={3} className="text-primary" />}
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors select-none">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password', { state: { email } })}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                fullWidth
                className="mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                    <span>{isAdminLogin ? 'Signing in as Admin...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <span>{isAdminLogin ? 'Sign In as Admin' : 'Sign In'}</span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  state={{ returnUrl, eventName }}
                  className="text-primary hover:text-primary/80 transition-colors font-bold"
                >
                  Create one →
                </Link>
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
