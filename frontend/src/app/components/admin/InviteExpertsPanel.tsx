import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Mail, Shield, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

export type ExpertRole = 'Judge' | 'Mentor' | 'Field Expert' | 'Finance Expert' | 'Technical Expert' | 'Legal Expert' | 'Marketing Expert';

export interface EventExpert {
  email: string;
  role: ExpertRole;
  invitedAt: string;
}

export const ROLES: ExpertRole[] = [
  'Judge',
  'Mentor',
  'Field Expert',
  'Finance Expert',
  'Technical Expert',
  'Legal Expert',
  'Marketing Expert',
];

const ROLE_COLORS: Record<ExpertRole, { bg: string; text: string; border: string }> = {
  'Judge': { bg: 'bg-brand-blue/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-brand-blue/25' },
  'Mentor': { bg: 'bg-brand-teal/10', text: 'text-teal-700 dark:text-brand-teal', border: 'border-brand-teal/25' },
  'Field Expert': { bg: 'bg-brand-mint/10', text: 'text-emerald-600 dark:text-brand-mint', border: 'border-brand-mint/25' },
  'Finance Expert': { bg: 'bg-brand-sky/10', text: 'text-cyan-700 dark:text-brand-sky', border: 'border-brand-sky/25' },
  'Technical Expert': { bg: 'bg-brand-purple/10', text: 'text-violet-400', border: 'border-brand-purple/25' },
  'Legal Expert': { bg: 'bg-brand-amber/10', text: 'text-amber-600 dark:text-brand-amber', border: 'border-brand-amber/25' },
  'Marketing Expert': { bg: 'bg-brand-red/10', text: 'text-red-600 dark:text-brand-red', border: 'border-brand-red/25' },
};

interface InviteExpertsPanelProps {
  eventId?: string;
  initialExperts?: EventExpert[];
  onChange?: (experts: EventExpert[]) => void;
}

export function InviteExpertsPanel({ eventId, initialExperts = [], onChange }: InviteExpertsPanelProps) {
  const [experts, setExperts] = useState<EventExpert[]>(initialExperts);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ExpertRole>('Judge');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Since initialExperts might arrive after first mount (async fetch)
  useEffect(() => {
    if (initialExperts && initialExperts.length > 0) {
      setExperts(initialExperts);
    }
  }, [initialExperts]);

  const save = (updated: EventExpert[]) => {
    setExperts(updated);
    onChange?.(updated);
  };

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (experts.find(e => e.email === trimmed && e.role === role)) {
      toast.error('This person already has this role for this event');
      return;
    }
    
    setIsLoading(true);
    try {
      // Without an event yet (create form), experts are only collected here and
      // invited by the parent once the event exists, so they get linked to it.
      if (eventId) {
        await api.inviteExpert(trimmed, role, eventId);
      }

      const newExpert: EventExpert = { email: trimmed, role, invitedAt: new Date().toISOString() };
      const updated = [...experts, newExpert];
      save(updated);
      setEmail('');
      toast.success(eventId
        ? `Invitation sent to ${trimmed} as ${role}`
        : `${trimmed} will be invited as ${role} when the event is created`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = (idx: number) => {
    const updated = experts.filter((_, i) => i !== idx);
    save(updated);
  };

  const c = ROLE_COLORS[role];

  return (
    <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
      <h2 className="text-lg mb-1 text-foreground/90 flex items-center gap-2">
        <Shield size={18} className="text-purple-700 dark:text-brand-purple" />
        Invite Partners &amp; Experts
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Invite users by email and assign them an expert role for this event. They will be able to observe pitches alongside the admin.
      </p>

      {/* Add form */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Email */}
        <div className="relative flex-1">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="partner@email.com"
            className="w-full pl-9 pr-4 py-3 bg-card rounded-xl border border-border text-foreground text-sm outline-none focus:border-brand-purple/60 transition-colors placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Role dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm min-w-[180px] justify-between ${c.bg} ${c.text} ${c.border}`}
          >
            <span>{role}</span>
            <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-muted border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/50"
              >
                {ROLES.map(r => {
                  const rc = ROLE_COLORS[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-foreground/5 transition-colors ${r === role ? 'bg-foreground/5' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${rc.bg.replace('/10', '')}`} style={{
                        background: rc.text.replace('text-[', '').replace(']', '')
                      }} />
                      <span className={rc.text}>{r}</span>
                      {r === role && <Check size={12} className="ml-auto text-muted-foreground/80" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-3 bg-brand-purple/20 border border-brand-purple/30 text-violet-400 rounded-xl text-sm font-medium hover:bg-brand-purple/30 transition-all whitespace-nowrap disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          {isLoading ? 'Sending...' : 'Add Invite'}
        </button>
      </div>

      {/* Invited list */}
      {experts.length === 0 ? (
        <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No experts invited yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{experts.length} expert{experts.length !== 1 ? 's' : ''} invited</p>
          <AnimatePresence>
            {experts.map((expert, idx) => {
              const rc = ROLE_COLORS[expert.role];
              return (
                <motion.div
                  key={`${expert.email}-${expert.role}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 text-xs font-bold text-violet-400">
                    {expert.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{expert.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {new Date(expert.invitedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs border ${rc.bg} ${rc.text} ${rc.border} whitespace-nowrap`}>
                    {expert.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-muted-foreground hover:text-red-600 dark:text-brand-red transition-colors ml-1"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
