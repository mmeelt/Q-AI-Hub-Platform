import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

type AdminRow = { adminId: string; name: string; email: string; lastSignInAt: string | null; you: boolean };

function initials(name: string) {
  return (name || 'A').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function lastSeen(date: string | null) {
  if (!date) return 'Never signed in';
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'Last sign-in: just now';
  if (mins < 60) return `Last sign-in: ${mins} min ago`;
  if (mins < 60 * 24) return `Last sign-in: ${Math.round(mins / 60)} h ago`;
  return `Last sign-in: ${new Date(date).toLocaleDateString()}`;
}

/** Settings card: your admin profile, the other administrators, add / remove an administrator. */
export function AdministratorsCard() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.getAdmins().then(setAdmins).catch(() => setAdmins([]));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAdmin(name.trim(), email.trim());
      toast.success(`${name.trim()} is now an administrator. They received an email to choose their password.`);
      setName(''); setEmail(''); setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Could not create the administrator');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: AdminRow) => {
    if (!window.confirm(`Remove ${a.name} (${a.email}) as administrator? They lose access immediately.`)) return;
    try {
      await api.removeAdmin(a.adminId);
      toast.success(`${a.name} is no longer an administrator`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Could not remove the administrator');
    }
  };

  const inputCls = 'w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground/90 outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 dark:bg-brand-ink';

  return (
    <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
          <h3 className="text-lg font-bold text-foreground">Administrators</h3>
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all">
            <UserPlus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="space-y-3 mb-5 p-4 rounded-xl border border-border bg-foreground/[0.02]">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" aria-label="Full name" className={inputCls} />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" aria-label="Email" className={inputCls} />
          <p className="text-xs text-muted-foreground">They receive an email with a link to choose their own password. No password is sent by email.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-foreground/5">Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? 'Creating…' : 'Create administrator'}
            </button>
          </div>
        </form>
      )}

      {admins === null ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <ul className="space-y-3">
          {[...admins].sort((a, b) => Number(b.you) - Number(a.you)).map(a => (
            <li key={a.adminId} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-cyan/20 text-sm font-bold text-cyan-600 dark:text-brand-cyan">
                {initials(a.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{a.name}{a.you && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                <p className="text-xs text-muted-foreground/80">{lastSeen(a.lastSignInAt)}</p>
              </div>
              {!a.you && (
                <button type="button" onClick={() => remove(a)} aria-label={`Remove ${a.name}`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
