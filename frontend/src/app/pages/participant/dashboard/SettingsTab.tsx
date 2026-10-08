import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { clearAuth } from '../../../utils/localStorage';
import { Avatar } from '../../../components/common/Avatar';
import { Button } from '../../../components/common/Button';
import { PasswordChangeForm } from './PasswordChangeForm';
import { TabPanel } from './shared';

type NotificationPrefs = { appStatus: boolean; newEvents: boolean; juryFeedback: boolean };

const parsePrefs = (raw: unknown): NotificationPrefs => {
  const prefs = { appStatus: false, newEvents: false, juryFeedback: false };
  if (typeof raw !== 'string' || !raw) return prefs;
  try { return { ...prefs, ...JSON.parse(raw) }; } catch { return prefs; }
};

interface SettingsTabProps {
  /** GET /users/profile response (null until loaded) */
  profile: any;
  profileName: string;
  onProfileNameChange: (name: string) => void;
}

export function SettingsTab({ profile, profileName, onProfileNameChange }: SettingsTabProps) {
  const navigate = useNavigate();
  const [userBio, setUserBio] = useState('');
  const [primaryInterest, setPrimaryInterest] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(parsePrefs(null));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setUserBio(profile.userBio || '');
    setPrimaryInterest(profile.primaryInterest || '');
    setAvailability(profile.availability || []);
    setNotificationPrefs(parsePrefs(profile.notificationPrefs));
  }, [profile]);

  const handleLogout = async () => {
    try { await api.logout(); } catch (_) {}
    clearAuth();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
    } catch (e) {
      // Even if API fails, proceed with local cleanup
      console.warn('Delete account API failed:', e);
    }
    // Remove stored applications
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('application-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    clearAuth();
    toast.success('Account deleted successfully.');
    navigate('/');
  };

  return (
    <TabPanel>
      <h1 className="text-4xl mb-2 text-foreground">Settings</h1>
      <p className="text-muted-foreground mb-8 text-sm md:text-base">
        Tune your profile, study preferences, and notifications for a smoother Q-AI Hub experience.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile & study preferences */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 text-foreground">
            <h2 className="text-lg mb-1 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10"><Users size={12} className="text-primary" /></span>
              Profile
            </h2>
            <p className="text-muted-foreground text-sm mb-5">Manage your personal information and public profile.</p>
            {/* Avatar + Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-5">
              <div className="relative group">
                <div className="rounded-2xl p-[2px] bg-gradient-to-br from-brand-mint to-brand-sky">
                  <Avatar name={profileName} className="w-20 h-20 rounded-[14px] text-2xl" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                  <Check size={10} className="text-background" />
                </div>
              </div>
              <div className="flex-1 w-full">
                <p className="text-sm font-semibold text-foreground mb-0.5">{profileName || 'User'}</p>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">Active</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-accent/10 text-accent border border-accent/20">Verified</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Full name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    onProfileNameChange(e.target.value);
                    localStorage.setItem('userName', e.target.value || 'Student');
                  }}
                  className="w-full rounded-xl bg-input border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all"
                  placeholder="Your name"
                />
              </div>
              {/* Email */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email address</label>
                <input
                  type="email"
                  value={profile?.emailAddress || ''}
                  readOnly
                  title="Your sign-in email cannot be changed here"
                  className="w-full rounded-xl bg-input border border-border px-3.5 py-2.5 text-sm text-foreground/60 outline-none cursor-not-allowed"
                  placeholder="your@email.com"
                />
              </div>
              {/* Role + Institution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Institution</label>
                  <div className="w-full rounded-xl bg-input border border-border px-3.5 py-2.5 text-sm text-foreground/60">
                    ENICarthage
                  </div>
                </div>
              </div>
              {/* Bio */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Bio</label>
                <textarea
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="Tell us a bit about yourself, your interests and goals..."
                  className="w-full rounded-xl bg-input border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 min-h-[80px] resize-none placeholder:text-muted-foreground/50 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.updateProfile({ 
                      fullName: profileName,
                      userBio,
                      primaryInterest,
                      availability
                    });
                    localStorage.setItem('userName', profileName);
                    toast.success('Profile saved!');
                  } catch (_) {
                    toast.error('Failed to save profile.');
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/20 text-primary text-sm font-medium hover:from-primary/25 hover:to-accent/25 transition-all"
              >
                Save Profile
              </button>
            </div>
          </div>
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 text-foreground">
            <h2 className="text-lg mb-1">Study preferences</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Indicate what you want to focus on so we can surface more relevant opportunities.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Primary interest</p>
                <div className="flex flex-wrap gap-2">
                  {['Quantum Computing', 'Artificial Intelligence', 'Hybrid Quantum-AI'].map((area) => {
                    const isActive = primaryInterest === area;
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setPrimaryInterest(area)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isActive
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-foreground hover:border-foreground/40'
                          }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Availability</p>
                <div className="flex flex-wrap gap-2">
                  {['Weekdays', 'Weekends', 'Evenings'].map((slot) => {
                    const isSelected = availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setAvailability((prev) =>
                            prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${isSelected
                          ? 'border-foreground/60 bg-foreground/10 text-foreground'
                          : 'border-border bg-foreground/5 text-foreground/70 hover:border-foreground/30'
                          }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* Change Password */}
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 text-foreground">
            <h2 className="text-lg mb-1 flex items-center gap-2"><Lock size={18} className="text-primary" /> Change Password</h2>
            <p className="text-muted-foreground text-sm mb-5">Update your password to keep your account secure.</p>
            <PasswordChangeForm />
          </div>
        </div>
        {/* Notifications & account actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 text-foreground">
            <h2 className="text-lg mb-1">Notifications</h2>
            <p className="text-muted-foreground text-sm mb-4">Choose what you want to stay informed about.</p>
            {[
              { key: 'appStatus' as const, label: 'Application status updates' },
              { key: 'newEvents' as const, label: 'New events & programs' },
              { key: 'juryFeedback' as const, label: 'Jury feedback' },
            ].map((item) => {
              const isOn = notificationPrefs[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setNotificationPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                    api.updateNotifPrefs({ ...notificationPrefs, [item.key]: !notificationPrefs[item.key] }).catch(() => {});
                  }}
                  className="w-full flex items-center justify-between py-3 border-b border-border/50 last:border-0 text-left"
                >
                  <span className="text-sm">{item.label}</span>
                  <div
                    className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors border ${isOn
                      ? 'bg-primary/40 border-primary/60'
                      : 'bg-foreground/5 border-border'
                      }`}
                  >
                    <span
                      className={`w-4 h-4 bg-foreground rounded-full shadow-sm transition-transform ${isOn ? 'translate-x-4' : ''
                        }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 text-foreground">
            <h2 className="text-lg mb-1">Session</h2>
            <p className="text-muted-foreground text-sm mb-4">
              You are currently signed in on this device.
            </p>
            <Button
              variant="ghost"
              className="w-full justify-center text-sm"
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
          <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-destructive/40 rounded-2xl p-6">
            <h2 className="text-lg mb-1 text-destructive">Delete account</h2>
            <p className="text-destructive/80 text-xs md:text-sm mb-4">
              This will permanently delete your account and all associated data. This action cannot be
              undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-5 py-2.5 rounded-xl border border-destructive/60 text-destructive-foreground text-sm bg-destructive/80 hover:bg-destructive transition-all"
            >
              Delete my account
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-destructive/40 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-destructive mb-3">Confirm Account Deletion</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  This action is <span className="text-destructive font-semibold">irreversible</span>. All your data, applications, and startup information will be permanently removed from our servers.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-foreground/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-destructive/60 text-destructive-foreground text-sm bg-destructive hover:bg-destructive/90 transition-all"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TabPanel>
  );
}
