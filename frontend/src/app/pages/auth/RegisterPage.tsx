import { useEffect, useState } from 'react';

import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

import { motion } from 'motion/react';

import { User, Mail, Lock, Eye, EyeOff, CreditCard, Shield } from 'lucide-react';

import { ParticleBackground } from '../../components/effects/ParticleBackground';

import { Logo } from '../../components/common/Logo';

import { Button } from '../../components/common/Button';

import { toast } from 'sonner';

import { api } from '../../services/api';





export function RegisterPage() {

  const navigate = useNavigate();

  const location = useLocation();

  // Expert invitation link: /register?invite=<id>&email=<invited email>
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get('invite') || '';

  const invitedEmail = searchParams.get('email') || '';

  const [formData, setFormData] = useState({

    fullName: '',

    studentId: '',

    universityName: '',

    email: invitedEmail,

    password: '',

    confirmPassword: '',

  });

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [passwordStrength, setPasswordStrength] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  // The admin can close public sign-up (Settings): then only invited experts can register
  const [registrationsClosed, setRegistrationsClosed] = useState(false);
  useEffect(() => {
    if (inviteToken) return;
    api.getPublicSettings().then(s => setRegistrationsClosed(!s.allowPublicRegistrations));
  }, [inviteToken]);



  const returnUrl = inviteToken ? '/dashboard?tab=expert' : (location.state as any)?.returnUrl;

  const eventName = (location.state as any)?.eventName;



  const calcStrength = (pwd: string) => {

    let s = 0;

    if (pwd.length >= 8) s++;

    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;

    if (/\d/.test(pwd)) s++;

    if (/[^a-zA-Z0-9]/.test(pwd)) s++;

    return s;

  };



  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {

    const value = e.target.value;

    setFormData(p => ({ ...p, [field]: value }));

    setErrors(p => ({ ...p, [field]: '' }));

    if (field === 'password') setPasswordStrength(calcStrength(value));

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.fullName) newErrors.fullName = 'Full name is required';

    if (!formData.studentId) newErrors.studentId = 'Student ID is required';

    if (!formData.universityName) newErrors.universityName = 'University name is required';

    if (!formData.email) newErrors.email = 'Email is required';

    if (!formData.password) newErrors.password = 'Password is required';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }



    setIsLoading(true);

    try {

      const response = await api.register({

        email: formData.email,

        password: formData.password,

        fullName: formData.fullName,

        studentId: formData.studentId,

        universityName: formData.universityName,

        ...(inviteToken ? { inviteToken } : {}),

      });



      toast.success(response.message || 'Account created! Please verify your email.');

      

      // Redirect to OTP verification

      navigate('/otp', { 

        state: { 

          email: formData.email,

          otpSessionId: response.otpSessionId,

          returnUrl,

          eventName

        } 

      });

    } catch (error: any) {

      toast.error(error.message || 'Registration failed. Please try again.');

    } finally {

      setIsLoading(false);

    }

  };





  const strengthLabel = ['', 'Too weak', 'Weak', 'Medium', 'Strong'];

  const strengthColor = ['', '#FF4757', '#FFB800', '#00D9F5', '#00F5A0'];



  // IMPORTANT: this is a plain render function, NOT a React component.
  // It is invoked as `renderField({...})` (a function call), not as `<Field />`.
  // Defining a component inside RegisterPage and using it as JSX would give it
  // a new identity on every render — React would unmount/remount the input on
  // every keystroke, killing the cursor focus. Calling it as a function inserts

  // the JSX inline without creating a component boundary.

  const renderField = ({

    label, icon: Icon, type, field, placeholder, showToggle, onToggle, show,

  }: {

    label: string; icon: any; type: string; field: string;

    placeholder: string; showToggle?: boolean; onToggle?: () => void; show?: boolean;

  }) => (

    <div>

      <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{label}</label>

      <div className="relative">

        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />

        <input

          type={showToggle ? (show ? 'text' : 'password') : type}

          value={(formData as any)[field]}

          onChange={handleChange(field)}

          readOnly={field === 'email' && !!inviteToken}

          placeholder={placeholder}

          className={`w-full pl-11 ${showToggle ? 'pr-12' : 'pr-4'} py-3.5 bg-input rounded-xl border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 ${errors[field] ? 'border-destructive/60' : 'border-border focus:border-primary/50'

            }`}

        />

        {showToggle && (

          <button type="button" onClick={onToggle}

            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">

            {show ? <EyeOff size={16} /> : <Eye size={16} />}

          </button>

        )}

      </div>

      {errors[field] && <p className="mt-1.5 text-xs text-red-600 dark:text-brand-red">{errors[field]}</p>}

    </div>

  );



  return (

    <div className="min-h-screen relative flex items-center justify-center p-6 py-10">

      <ParticleBackground />



      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

        <div className="w-[600px] h-[600px] rounded-full bg-brand-purple/4 blur-[120px]" />

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

              <h1 className="text-3xl font-bold mb-2">Join Q-AI Hub</h1>

              <p className="text-muted-foreground text-sm leading-relaxed">

                Start your Quantum-AI entrepreneurship journey

              </p>

            </div>



            {registrationsClosed && (
              <div role="alert" className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
                Registrations are currently by invitation only. If you received an invitation email, use the link it contains.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {renderField({ label: "Full Name", icon: User, type: "text", field: "fullName", placeholder: "Your full name" })}



              <div>

                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Student ID</label>

                <div className="relative">

                  <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />

                  <input

                    type="text"

                    value={formData.studentId}

                    onChange={handleChange('studentId')}

                    placeholder="e.g. 2024-ENIC-XXXX"

                    className={`w-full pl-11 pr-4 py-3.5 bg-input rounded-xl border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 ${errors.studentId ? 'border-destructive/60' : 'border-border focus:border-primary/50'

                      }`}

                  />

                </div>

                {errors.studentId && <p className="mt-1.5 text-xs text-red-600 dark:text-brand-red">{errors.studentId}</p>}

              </div>



              {renderField({ label: "University / Institution", icon: User, type: "text", field: "universityName", placeholder: "e.g. ENICarthage" })}



              {renderField({ label: "Email", icon: Mail, type: "email", field: "email", placeholder: "your@email.com" })}



              <div>

                {renderField({ label: "Password", icon: Lock, type: "password", field: "password", placeholder: "Create a strong password",

                  showToggle: true, onToggle: () => setShowPassword(p => !p), show: showPassword })}

                {formData.password && (

                  <div className="mt-2">

                    <div className="flex gap-1 mb-1">

                      {[1, 2, 3, 4].map(lvl => (

                        <div key={lvl} className="h-1 flex-1 rounded-full transition-all duration-300"

                          style={{ background: lvl <= passwordStrength ? strengthColor[passwordStrength] : 'rgba(255,255,255,0.08)' }} />

                      ))}

                    </div>

                    <p className="text-xs" style={{ color: strengthColor[passwordStrength] }}>{strengthLabel[passwordStrength]}</p>

                  </div>

                )}

              </div>



              {renderField({ label: "Confirm Password", icon: Lock, type: "password", field: "confirmPassword", placeholder: "Repeat your password",

                showToggle: true, onToggle: () => setShowConfirm(p => !p), show: showConfirm })}



              <Button

                type="submit"

                disabled={isLoading || registrationsClosed}

                fullWidth

                className="mt-2"

              >

                {isLoading ? (

                  <>

                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />

                    <span>Creating account...</span>

                  </>

                ) : (

                  <span>Create Account</span>

                )}

              </Button>



              <p className="text-center text-sm text-muted-foreground">

                Already have an account?{' '}

                <Link to="/login" state={{ returnUrl, eventName }}

                  className="text-cyan-500 hover:text-cyan-400 dark:text-brand-cyan transition-colors font-medium">

                  Log In →

                </Link>

              </p>



              {/* Security note */}

              <div className="mt-2 p-3 bg-card/60 rounded-xl border border-border flex items-center gap-3">

                <Shield size={16} className="text-emerald-600 dark:text-brand-mint flex-shrink-0" />

                <p className="text-xs text-muted-foreground">Your ideas are protected under our confidentiality policy</p>

              </div>

            </form>

          </div>

        </div>

      </motion.div>

    </div>

  );

}

