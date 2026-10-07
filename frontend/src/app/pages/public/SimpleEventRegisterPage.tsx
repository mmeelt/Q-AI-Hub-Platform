import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarDays, MapPin, Users, Mail, User, CheckCircle } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

export function SimpleEventRegisterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [form, setForm] = useState<any>({
    participantName: '',
    participantEmail: '',
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allowLate, setAllowLate] = useState(false);
  useEffect(() => { api.getPublicSettings().then(s => setAllowLate(s.allowLateSubmissions)); }, []);

  useEffect(() => {
    // Admins manage events, they don't register as participants
    if ((localStorage.getItem('userRole') || '').replace(/^ROLE_/i, '').toUpperCase() === 'ADMIN') {
      navigate('/admin/events', { replace: true });
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const data = await api.getEventById(id);
          setEvent(data);
          
          let initialForm: any = { participantName: '', participantEmail: '' };

          // Pre-fill from profile if logged in
          if (localStorage.getItem('isLoggedIn') === 'true') {
            try {
              const profile = await api.getProfile();
              if (profile) {
                initialForm.participantName = profile.fullName || '';
                initialForm.participantEmail = profile.emailAddress || '';
                setIsLoggedIn(!!profile.emailAddress);
              }
            } catch (profileError) {
              console.warn('Failed to load profile for pre-filling', profileError);
            }
          }

          if (data.formFieldsJson) {
            try {
              const parsed = JSON.parse(data.formFieldsJson);
              setQuestions(parsed);
              parsed.forEach((q: any) => {
                initialForm[`q_${q.id}`] = '';
              });
            } catch (e) {
              console.error('Failed to parse form fields', e);
            }
          }
          
          setForm(initialForm);

          // Redirect if not a SIMPLE event
          if (data.eventType && data.eventType !== 'SIMPLE') {
            navigate(`/events/${id}/apply`);
          }
        }
      } catch (e) {
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.participantName.trim() || !form.participantEmail.trim()) {
      toast.error('Please fill in your name and email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.participantEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check required questions
    for (const q of questions) {
      if (q.required && !form[`q_${q.id}`]) {
        toast.error(`Please answer the question: ${q.question}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const answers: any = {};
      questions.forEach(q => {
        answers[q.question] = form[`q_${q.id}`];
      });

      await api.registerForSimpleEvent(
        id!, 
        form.participantName.trim(),
        form.participantEmail.trim(),
        JSON.stringify(answers)
      );
      setIsRegistered(true);
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <ParticleBackground />
        <p>Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <ParticleBackground />
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
        <ParticleBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md text-center"
        >
          <div className="p-px rounded-3xl bg-gradient-to-br from-primary/30 via-foreground/5 to-accent/20">
            <div className="bg-card backdrop-blur-2xl rounded-3xl p-10 shadow-glass">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <CheckCircle className="text-primary" size={32} />
              </div>
              <h1 className="text-2xl font-bold mb-2">You're Registered!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                You have been successfully registered for <span className="text-foreground font-medium">{event.title}</span>.
                Check your email for confirmation details.
              </p>
              <Link to="/events">
                <Button variant="outline" fullWidth>Browse More Events</Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const deadlinePassed = !allowLate && !!event.applicationDeadline
    && new Date(event.applicationDeadline) < new Date(new Date().toDateString());
  const isFull = event.maxParticipants != null
    && (event.currentRegisteredCount || 0) >= event.maxParticipants;
  const closedReason = event.status !== 'ACTIVE'
    ? (event.status === 'DRAFT' ? 'Registration is not open yet for this event.' : 'Registration is closed for this event.')
    : deadlinePassed ? 'The registration deadline has passed.'
    : isFull ? 'This event is full.'
    : null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 text-foreground">
      <ParticleBackground />

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
              <Link to="/"><Logo size="sm" /></Link>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground mt-2">
                {event.startDate && (
                  <span className="flex items-center gap-1"><CalendarDays size={14} />{new Date(event.startDate).toLocaleDateString()}</span>
                )}
                {event.location && (
                  <span className="flex items-center gap-1"><MapPin size={14} />{event.location}</span>
                )}
                {event.maxParticipants && (
                  <span className="flex items-center gap-1"><Users size={14} />{event.maxParticipants} spots</span>
                )}
              </div>
              {event.description && (
                <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{event.description}</p>
              )}
            </div>

            {closedReason ? (
              <div className="text-center py-6">
                <p className="text-destructive font-medium">{closedReason}</p>
                <Link to="/events" className="text-primary text-sm mt-3 inline-block hover:text-primary/80">
                  Browse other events →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Full name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={form.participantName}
                      onChange={e => setForm({ ...form, participantName: e.target.value })}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Email *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={form.participantEmail}
                      readOnly={isLoggedIn}
                      onChange={e => setForm({ ...form, participantEmail: e.target.value })}
                      placeholder="your@email.com"
                      className={`w-full pl-10 pr-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50 ${isLoggedIn ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  {!isLoggedIn && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No account needed. <Link to="/login" state={{ returnUrl: `/events/${id}/register`, eventName: event.title }} className="text-primary hover:text-primary/80">Log in</Link> to see this registration in your dashboard.
                    </p>
                  )}
                </div>

                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">
                      {q.question} {q.required && '*'}
                    </label>
                    {q.type === 'textarea' ? (
                      <textarea
                        value={form[`q_${q.id}`] || ''}
                        onChange={e => setForm({ ...form, [`q_${q.id}`]: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/50 min-h-[100px] resize-none"
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={form[`q_${q.id}`] || ''}
                        onChange={e => setForm({ ...form, [`q_${q.id}`]: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all focus:border-primary/50"
                      >
                        <option value="">Select an option</option>
                        {q.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={q.type || 'text'}
                        value={form[`q_${q.id}`] || ''}
                        onChange={e => setForm({ ...form, [`q_${q.id}`]: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none transition-all focus:border-primary/50"
                      />
                    )}
                  </div>
                ))}

                <Button type="submit" disabled={isSubmitting} fullWidth className="mt-2">
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    'Register Now'
                  )}
                </Button>

              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/events" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Back to Events
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
