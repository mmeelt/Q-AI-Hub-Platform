import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { DashboardHome } from '../../components/admin/DashboardHome';
import { EventsManager } from '../../components/admin/EventsManager';
import { UsersSection } from '../../components/admin/UsersSection';
import { StartupsSection } from '../../components/admin/StartupsSection';
import { PitchEvaluation } from '../../components/admin/PitchEvaluation';
import { AdministratorsCard } from '../../components/admin/AdministratorsCard';
import { Settings, Shield, Globe, Database, Download, Lock, Eye, EyeOff, Check, Mail, Loader2, Menu } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { api } from '../../services/api';
import { toast } from 'sonner';

const EXPORTS = [
  { kind: 'applications', label: 'Download applications CSV', hint: 'Applications and simple-event registrations' },
  { kind: 'jury-scores', label: 'Download jury scores CSV', hint: 'Every judge\'s score, the average and the final decision' },
  { kind: 'events', label: 'Export event list', hint: 'Events with applications, registrations and waiting list' },
] as const;

function DataExportsCard() {
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (kind: typeof EXPORTS[number]['kind']) => {
    setBusy(kind);
    try {
      await api.downloadExport(kind);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
        <h3 className="text-lg font-bold text-foreground">Data & Exports</h3>
      </div>
      <div className="space-y-2">
        {EXPORTS.map(({ kind, label, hint }) => (
          <button key={kind} type="button" onClick={() => download(kind)} disabled={busy !== null}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card text-left text-sm text-foreground hover:bg-foreground/5 transition-all disabled:opacity-60">
            {busy === kind
              ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              : <Download className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span>
              <span className="block">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Files contain personal data (names, emails): share them carefully.</p>
    </div>
  );
}

function AdminPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) { setError('All fields are required.'); return; }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please check your current password.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Current password</label>
        <div className="relative">
          <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground/90 outline-none focus:border-border pr-10 placeholder:text-muted-foreground/40 transition-all dark:bg-brand-ink" />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">New password</label>
        <div className="relative">
          <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground/90 outline-none focus:border-border pr-10 placeholder:text-muted-foreground/40 transition-all dark:bg-brand-ink" />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Confirm new password</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password"
          className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground/90 outline-none focus:border-white/40 placeholder:text-muted-foreground/40 transition-all" />
      </div>
      {error && <p className="text-sm text-destructive dark:text-brand-red">{error}</p>}
      {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-emerald-600 dark:text-brand-teal flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Password updated successfully</motion.p>}
      <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/25 text-cyan-600 dark:text-brand-cyan text-sm font-medium hover:bg-brand-cyan/25 transition-all">Update Password</button>
    </form>
  );
}

function EmailSettingsCard() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await api.sendTestEmail();
      setResult({ ok: true, message: `${res.message}. Check the inbox (and the spam folder).` });
    } catch (e: any) {
      setResult({ ok: false, message: e.message || 'Test email failed' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
        <h3 className="text-lg font-bold text-foreground">Email</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Verification codes, invitations and results are sent with the SMTP account set in <code className="text-xs">backend/.env</code>.
        Send yourself a test message to check it.
      </p>
      <button type="button" onClick={sendTest} disabled={sending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/25 text-cyan-700 dark:text-brand-cyan text-sm font-medium hover:bg-brand-cyan/25 transition-all disabled:opacity-60">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {sending ? 'Sending…' : 'Send test email'}
      </button>
      {result && (
        <p role="status" className={`mt-3 text-sm ${result.ok ? 'text-emerald-600 dark:text-brand-teal' : 'text-destructive'}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

function SettingsSection() {
  const [platformSettings, setPlatformSettings] = useState({
    allowPublicRegistrations: true,
    requireEmailVerification: true,
    allowLateSubmissions: false,
    showAnonymousToJury: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await api.getPlatformSettings();
        if (settings) {
          setPlatformSettings({
            allowPublicRegistrations: settings.allowPublicRegistrations ?? true,
            requireEmailVerification: settings.requireEmailVerification ?? true,
            allowLateSubmissions: settings.allowLateSubmissions ?? false,
            showAnonymousToJury: settings.showAnonymousToJury ?? false,
          });
        }
      } catch (error) {
        console.warn('Failed to load platform settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const toggleSetting = async (key: keyof typeof platformSettings) => {
    const newValue = !platformSettings[key];
    setPlatformSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      await api.updatePlatformSettings({ [key]: newValue });
      toast.success('Setting saved');
    } catch (_) {
      // Revert on failure
      setPlatformSettings(prev => ({ ...prev, [key]: !newValue }));
      toast.error('Failed to save setting');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure platform behavior, permissions, and data exports</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: Platform Settings + Change Password */}
        <div className="space-y-6">
          <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
              <h3 className="text-lg font-bold text-foreground">Platform Settings</h3>
            </div>
            {([
              { key: 'allowPublicRegistrations' as const, label: 'Allow public registrations', desc: 'On: anyone can create an account. Off: only experts invited by email can register.' },
              { key: 'requireEmailVerification' as const, label: 'Email code at every login', desc: 'On: users enter a code sent by email at each login. Off: the code is asked once to verify the email, then the password is enough. Admins always get a code.' },
              { key: 'allowLateSubmissions' as const, label: 'Allow late submissions', desc: 'Accept applications and registrations after an event deadline (the event must still be open).' },
              { key: 'showAnonymousToJury' as const, label: 'Anonymous applicants for judges', desc: 'Judges see "Startup 7F3A" instead of names, emails and links. Admins always see everything.' },
            ] as const).map(item => {
              const isOn = platformSettings[item.key];
              return (
                <button key={item.key} type="button" onClick={() => toggleSetting(item.key)}
                  className="w-full flex items-center justify-between py-4 border-b border-border last:border-0 text-left">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full flex items-center px-0.5 border transition-all ${isOn ? 'bg-brand-teal/20 border-brand-teal/40' : 'bg-card border-border'}`}>
                    <span className={`w-4 h-4 bg-white rounded-full transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Change Password */}
          <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-cyan-600 dark:text-brand-cyan" />
              <h3 className="text-lg font-bold text-foreground">Change Password</h3>
            </div>
            <AdminPasswordForm />
          </div>
        </div>

        {/* Right Column: Email + Admin Profile + Data & Exports */}
        <div className="space-y-6">
          <EmailSettingsCard />
          <AdministratorsCard />

          <DataExportsCard />
        </div>
      </div>
    </motion.div>
  );
}

export function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Close the mobile menu whenever the page changes
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);
  
  // Extract section from URL path
  const getSectionFromPath = () => {
    const path = location.pathname;
    if (path.includes('/admin/events')) return 'events';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/startups')) return 'startups';
    if (path.includes('/admin/pitch')) return 'pitch';
    if (path.includes('/admin/settings')) return 'settings';
    return 'dashboard';
  };
  
  const [activeSection, setActiveSection] = useState(getSectionFromPath());
  const [pitchEventId, setPitchEventId] = useState<string | null>(null);

  // Update active section when URL changes
  useEffect(() => {
    setActiveSection(getSectionFromPath());
  }, [location.pathname]);

  const handleNavigateToPitch = (eventId: string) => {
    setPitchEventId(eventId);
    navigate('/admin/pitch');
  };

  const handleSectionChange = (section: string) => {
    navigate(`/admin/${section}`);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardHome onNavigate={handleSectionChange} />;
      case 'events': return <EventsManager onStartPitch={handleNavigateToPitch} />;
      case 'users': return <UsersSection />;
      case 'startups': return <StartupsSection />;
      case 'pitch': return <PitchEvaluation initialEventId={pitchEventId} onBack={() => navigate('/admin/events')} />;
      case 'settings': return <SettingsSection />;
      default: return <DashboardHome onNavigate={handleSectionChange} />;
    }
  };

  return (
    <div className="min-h-screen relative flex">
      <ParticleBackground />
      <AdminSidebar activeSection={activeSection} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="w-full lg:ml-64 flex-1 relative z-10 overflow-y-auto min-w-0">
        {/* Top bar with the menu button (below lg, where the sidebar is a drawer) */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-xl">
          <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"
            aria-controls="admin-sidebar" aria-expanded={mobileNavOpen}
            className="p-2 -ml-2 rounded-lg text-foreground hover:bg-foreground/5">
            <Menu className="h-5 w-5" />
          </button>
          <Logo size="sm" />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <Breadcrumbs />
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
