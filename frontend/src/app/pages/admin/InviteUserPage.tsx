import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Rocket, ShieldCheck } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { ROLES } from '../../components/admin/InviteExpertsPanel';
import { toast } from 'sonner';
import { api } from '../../services/api';

type InviteType = 'participant' | 'expert';

const inputClass =
  'w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40';

export function InviteUserPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<InviteType>('participant');
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState('');
  const [role, setRole] = useState<string>('Judge');
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Experts are always invited to a specific event (that is what they review and judge)
  useEffect(() => {
    api.getAdminEvents()
      .then(list => setEvents((list || []).filter((e: any) => (e.eventType || '').toUpperCase() !== 'SIMPLE')))
      .catch(() => setEvents([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (type === 'expert' && !eventId) {
      toast.error('Choose the event the expert will review.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === 'participant') {
        await api.inviteParticipant(cleanEmail, message.trim() || undefined);
      } else {
        await api.inviteExpert(cleanEmail, role, eventId, message.trim() || undefined);
      }
      toast.success(`Invitation sent to ${cleanEmail}`);
      navigate('/admin/users');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeButton = (value: InviteType, Icon: typeof Rocket, title: string, desc: string) => (
    <button
      type="button"
      onClick={() => setType(value)}
      aria-pressed={type === value}
      className={`flex-1 text-left p-5 rounded-2xl border transition-all ${type === value
        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
        : 'border-border bg-card/60 hover:border-primary/40'}`}
    >
      <Icon size={22} className={type === value ? 'text-primary' : 'text-muted-foreground'} />
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </button>
  );

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      {/* Header */}
      <div className="relative z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link to="/admin">
            <Logo size="sm" />
          </Link>
          <div className="h-6 w-px bg-foreground/10" />
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to Users</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8">
            <h1 className="text-4xl mb-2">Invite someone</h1>
            <p className="text-muted-foreground">They receive an email with a personal link to create their account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {typeButton('participant', Rocket, 'Participant', 'A startup founder or team member who will apply to events.')}
              {typeButton('expert', ShieldCheck, 'Expert / judge', 'Reviews the startups of one event and scores their pitches.')}
            </div>

            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 space-y-5">
              <div>
                <label htmlFor="invite-email" className="block text-sm text-muted-foreground mb-2">Email address *</label>
                <input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="john.doe@example.com" className={inputClass} required />
              </div>

              {type === 'expert' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="invite-event" className="block text-sm text-muted-foreground mb-2">Event to review *</label>
                    <select id="invite-event" value={eventId} onChange={e => setEventId(e.target.value)} className={inputClass} required>
                      <option value="">Choose an event</option>
                      {events.map(ev => {
                        const id = String(ev.eventId ?? ev.id);
                        return <option key={id} value={id}>{ev.title}</option>;
                      })}
                    </select>
                    {events.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No incubation event yet: create one first.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="invite-role" className="block text-sm text-muted-foreground mb-2">Role</label>
                    <select id="invite-role" value={role} onChange={e => setRole(e.target.value)} className={inputClass}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="invite-message" className="block text-sm text-muted-foreground mb-2">Personal message (optional)</label>
                <textarea id="invite-message" value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={1000}
                  placeholder={type === 'expert'
                    ? 'Thank you for agreeing to be part of the jury…'
                    : 'Welcome to Q-AI Hub! We would love to see your startup apply…'}
                  className={`${inputClass} resize-none`} />
                <p className="text-xs text-muted-foreground mt-1 text-right">{message.length}/1000</p>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-brand-cyan to-brand-purple rounded-xl font-semibold text-brand-navy shadow-lg shadow-brand-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
                  <span>Sending invitation…</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send invitation</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
