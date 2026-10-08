import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, FileText, Calendar, Bell, Settings, Plus, Globe, ShieldCheck, Lock, Eye, EyeOff, Check, BellRing, Rocket, Users, UserPlus, Star, Send, Trophy, Clock } from 'lucide-react';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { getUserName, isLoggedIn, setUserName, clearAuth } from '../../utils/localStorage';
import { Avatar } from '../../components/common/Avatar';

function PasswordChangeForm() {
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
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Check your current password.');
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Current password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 pr-10 placeholder:text-muted-foreground/50 transition-all"
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {/* New Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">New password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 pr-10 placeholder:text-muted-foreground/50 transition-all"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {/* Confirm Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
        />
      </div>
      {error && <p className="text-sm text-destructive flex items-center gap-1.5">{error}</p>}
      {success && (
        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-primary flex items-center gap-1.5">
          <Check size={14} /> Password updated successfully
        </motion.p>
      )}
      <button
        type="submit"
        className="w-full px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium hover:bg-primary/25 transition-all"
      >
        Update Password
      </button>
    </form>
  );
}
export function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [applications, setApplications] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [primaryInterest, setPrimaryInterest] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState({
    appStatus: false,
    newEvents: false,
    juryFeedback: false,
  });
  const [eventsCount, setEventsCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profileName, setProfileName] = useState(getUserName('User'));
  const [expertEvents, setExpertEvents] = useState<any[]>([]);
  const [userBio, setUserBio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [phaseSubmissions, setPhaseSubmissions] = useState<Record<string, any[]>>({});
  const [applicationPitchResults, setApplicationPitchResults] = useState<Record<string, any[]>>({});
  const [eventPhases, setEventPhases] = useState<Record<string, any[]>>({});
  const focusedEventId = searchParams.get('eventId');

  const dedupeNotifications = (items: any[]) =>
    Array.from(
      new Map(
        (Array.isArray(items) ? items : []).map((n: any) => [
          String(n.notificationId ?? n.id ?? JSON.stringify([n.notificationTitle ?? n.title, n.notificationMessage ?? n.message, n.notificationCreatedAt ?? n.createdAt ?? n.date])),
          n,
        ])
      ).values()
    );
  
  // Auto-scroll to focused event
  useEffect(() => {
    if (focusedEventId && activeTab === 'applications' && !isLoading) {
      setTimeout(() => {
        const element = document.getElementById(`app-card-${focusedEventId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [focusedEventId, activeTab, isLoading]);
  
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [apps, regs, notifs, profile, allEvents, startupData, expertEventsData] = await Promise.all([
          api.getMyApplications().catch(err => { console.error('Apps load fail:', err); return []; }),
          api.getMyRegistrations().catch(err => { console.error('Regs load fail:', err); return []; }),
          api.getNotifications().catch(err => { console.error('Notifs load fail:', err); return []; }),
          api.getProfile().catch((error) => {
            console.warn('Failed to load profile:', error);
            return null;
          }),
          api.getEvents().catch((error) => {
            console.warn('Failed to load events:', error);
            return [];
          }),
          api.getMyStartup().catch((error) => {
            console.warn('Failed to load startups:', error);
            return [];
          }),
          api.getExpertEvents().catch((error) => {
            console.warn('Failed to load expert roles:', error);
            return [];
          }),
        ]);
        const validApps = Array.isArray(apps) ? apps : [];
        const validRegs = Array.isArray(regs) ? regs : [];
        const validNotifs = Array.isArray(notifs) ? notifs : [];
        const validEvents = Array.isArray(allEvents) ? allEvents : [];
        const validExpertEvents = Array.isArray(expertEventsData) ? expertEventsData : [];

        const eventMap = new Map(validEvents.map((e: any) => [String(e.eventId ?? e.id), e.title]));
        
        const mappedApps = validApps.map((app: any) => ({
          ...app,
          eventName: app.eventTitle || eventMap.get(String(app.targetEventId)) || `Event #${app.targetEventId?.slice(0, 8) || 'Unknown'}`,
          projectName: app.startupName || app.projectName || 'My Project',
          status: app.applicationStatus || 'Pending',
          submittedDate: app.applicationSubmittedAt || new Date().toISOString(),
        }));

        const mappedRegs = validRegs.map((reg: any) => {
          return {
            applicationId: `reg_${reg.id}`,
            eventName: reg.eventTitle || eventMap.get(String(reg.eventId)) || `Event #${reg.eventId?.slice(0, 8) || 'Unknown'}`,
            projectName: reg.participantName || 'My Registration',
            status: 'Registered',
            submittedDate: reg.registeredAt || new Date().toISOString(),
            targetEventId: reg.eventId,
            trackingCode: `REG-${reg.id}`,
            isRegistration: true
          };
        });
        
        setApplications([...mappedApps, ...mappedRegs]);

        // Load phase submissions for accepted applications
        const acceptedApps = mappedApps.filter((app: any) =>
            app.status?.toLowerCase() === 'accepted' || app.applicationStatus?.toLowerCase() === 'accepted'
        );
        if (acceptedApps.length > 0) {
            const submissionMap: Record<string, any[]> = {};
            const pitchResultsMap: Record<string, any[]> = {};
            const phasesMap: Record<string, any[]> = {};
            await Promise.all(acceptedApps.map(async (app: any) => {
                try {
                    const subs = await api.getSubmissionsByApplication(app.applicationId);
                    submissionMap[app.applicationId] = subs;
                } catch (_) {
                    submissionMap[app.applicationId] = [];
                }
                try {
                    const results = await api.getPitchResultsByApplication(app.applicationId);
                    pitchResultsMap[app.applicationId] = results;
                } catch (_) {
                    pitchResultsMap[app.applicationId] = [];
                }
                try {
                    if (!phasesMap[app.targetEventId]) {
                        const phases = await api.getPhasesByEvent(app.targetEventId);
                        phasesMap[app.targetEventId] = phases;
                    }
                } catch (_) {}
            }));
            setPhaseSubmissions(submissionMap);
            setApplicationPitchResults(pitchResultsMap);
            setEventPhases(phasesMap);
        }

        // Dedupe notifications (backend can occasionally return duplicates after migrations/retries)
        const dedupedNotifs = dedupeNotifications(validNotifs);
        setNotifications(dedupedNotifs);
        setEventsCount(validEvents.length);
        setStartups(Array.isArray(startupData) ? startupData : (startupData ? [startupData] : []));
        setExpertEvents(validExpertEvents);
        if (profile) {
          setProfileName(profile.fullName);
          setUserBio(profile.userBio || '');
          setPrimaryInterest(profile.primaryInterest || '');
          setAvailability(profile.availability || []);
          // Parse notificationPrefs if it's a string
          if (profile.notificationPrefs) {
            try {
              setNotificationPrefs(JSON.parse(profile.notificationPrefs));
            } catch (e) { /* ignore */ }
          }
        }
      } catch (error: any) {
        console.error('Dashboard load error:', error);
        toast.error(`Dashboard error: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [navigate, searchParams, activeTab]);
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };
  const handleLogout = async () => {
    try { await api.logout(); } catch (_) {}
    clearAuth();
    navigate('/');
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const unreadNotificationsCount = notifications.filter(n => !(n.isReadStatus ?? n.read ?? false)).length;
  const stats = [
    { label: 'Active Applications', value: applications.filter(a => a.status !== 'Rejected').length, color: 'from-brand-mint to-brand-sky', icon: FileText, bg: 'bg-brand-mint/10' },
    { label: 'Events Available', value: eventsCount, color: 'from-brand-sky to-brand-blue', icon: Calendar, bg: 'bg-brand-sky/10' },
    { label: 'Notifications', value: unreadNotificationsCount, color: 'from-brand-purple to-brand-blue', icon: BellRing, bg: 'bg-brand-purple/10' },
  ];
  const statusColors: Record<string, string> = {
    Pending: 'bg-brand-amber/20 text-amber-600 dark:text-brand-amber',
    'Under Review': 'bg-primary/20 text-primary',
    Accepted: 'bg-foreground/15 text-foreground/90',
    Rejected: 'bg-destructive/20 text-destructive',
    Registered: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    PENDING: 'bg-brand-amber/20 text-amber-600 dark:text-brand-amber',
    ACCEPTED: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    REJECTED: 'bg-destructive/20 text-destructive',
  };
  const navItems = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'startup', icon: Rocket, label: 'My Startup' },
    { id: 'applications', icon: FileText, label: 'My Applications' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'expert', icon: ShieldCheck, label: 'Expert Roles' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'invitations', icon: UserPlus, label: 'Invitations' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="relative z-10 min-h-screen flex flex-col">
        <DashboardHeader
          activeTab={activeTab}
          profileName={profileName}
          onTabChange={handleTabChange}
          unreadCount={unreadNotificationsCount}
        />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <Breadcrumbs />
          {/* Mobile nav pills */}
          <nav className="md:hidden px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all ${activeTab === item.id
                  ? 'bg-foreground/15 text-foreground border border-foreground/20'
                  : 'bg-foreground/5 text-muted-foreground'
                  }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 md:p-8">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-4xl mb-2 text-foreground">Welcome back, {profileName}</h1>
                <p className="text-muted-foreground mb-8">Track your applications and discover new opportunities</p>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 group transition-colors hover:border-border/80 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                          <stat.icon size={18} className="text-foreground/90" />
                        </div>
                      </div>
                      <p className={`text-4xl font-bold mb-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </p>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
                {/* Recent Applications */}
                <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl mb-6 text-foreground">My Recent Applications</h2>
                  {applications.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Rocket size={28} className="text-muted-foreground" />
                      </div>
                      <p className="text-foreground/70 font-medium mb-1">No applications yet</p>
                      <p className="text-muted-foreground text-sm mb-6">Browse events and submit your first application</p>
                      <Link to="/events">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-mint to-brand-sky text-brand-navy font-semibold text-sm"
                        >
                          Browse Events
                        </motion.button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Event Name</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Tracking Code</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Submitted Date</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Status</th>
                            <th className="text-left py-3 px-4 text-muted-foreground text-sm">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((app, index) => (
                            <tr key={index} className="border-b border-border hover:bg-foreground/5 transition-colors text-foreground">
                              <td className="py-4 px-4">{app.eventName}</td>
                              <td className="py-4 px-4 font-mono text-xs text-foreground/70">{app.trackingCode}</td>
                              <td className="py-4 px-4 text-muted-foreground">
                                {new Date(app.submittedDate).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs ${statusColors[app.status] || 'bg-foreground/10 text-muted-foreground'}`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => {
                                    const isAccepted = app.status?.toLowerCase() === 'accepted' || app.applicationStatus?.toLowerCase() === 'accepted';
                                    const phases = eventPhases[app.targetEventId] || [];
                                    const p2Active = phases.find((p: any) => p.phaseOrder === 2)?.phaseActive;
                                    const p1Accepted = (phaseSubmissions[app.applicationId] || []).some((s: any) => s.phaseOrder === 1 && s.decisionStatus === 'ACCEPTED');

                                    if (isAccepted && p1Accepted && p2Active) {
                                      navigate(`/dashboard?tab=applications&eventId=${app.targetEventId}`);
                                    } else if (isAccepted) {
                                      navigate(`/startup/${app.applicationId}`);
                                    } else {
                                      navigate(`/track?code=${app.trackingCode}`);
                                    }
                                  }}
                                  className="text-primary hover:text-accent text-sm font-medium transition-colors"
                                >
                                  {(() => {
                                    const isAccepted = app.status?.toLowerCase() === 'accepted' || app.applicationStatus?.toLowerCase() === 'accepted';
                                    const phases = eventPhases[app.targetEventId] || [];
                                    const p2Active = phases.find((p: any) => p.phaseOrder === 2)?.phaseActive;
                                    const p1Accepted = (phaseSubmissions[app.applicationId] || []).some((s: any) => s.phaseOrder === 1 && s.decisionStatus === 'ACCEPTED');

                                    if (isAccepted && p1Accepted && p2Active) return <span className="inline-flex items-center gap-1"><Rocket size={14} /> Phase 2</span>;
                                    if (isAccepted) return 'Manage Startup →';
                                    return 'Track Status →';
                                  })()}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'startup' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-4xl text-foreground">My Startups</h1>
                  <Button onClick={() => navigate('/startup/create')} className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Profile
                  </Button>
                </div>
                {startups.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {startups.map((startup, index) => (
                      <div key={startup.startupId || index} className="bg-card backdrop-blur-xl border border-border rounded-2xl p-8 shadow-sm group hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-6 mb-8">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl font-bold text-primary">
                            {startup.projectName?.[0] || 'S'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-foreground mb-2">{startup.projectName || 'My Startup'}</h2>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigate(`/startup/create?id=${startup.startupId}`)}
                                className="group-hover:bg-primary/10"
                              >
                                Edit Profile
                              </Button>
                            </div>
                            <p className="text-muted-foreground mb-3">{startup.companyTagline || 'No tagline yet'}</p>
                            <div className="flex items-center gap-4 text-sm">
                              {startup.businessSector && (
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">{startup.businessSector}</span>
                              )}
                              {startup.companyWebsiteUrl && (
                                <a href={startup.companyWebsiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                  <Globe size={14} />
                                  {startup.companyWebsiteUrl}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-border pt-6">
                          <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                          <p className="text-muted-foreground leading-relaxed">{startup.rawDescription || 'No description provided'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-12 shadow-sm text-center">
                    <Rocket size={64} className="mx-auto mb-4 text-muted-foreground/30" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">No Startup Profile Yet</h2>
                    <p className="text-muted-foreground mb-6">Create your startup profile to showcase your project to the community</p>
                    <Button onClick={() => navigate('/startup/create')} className="flex items-center gap-2 mx-auto">
                      <Plus size={16} />
                      Create Startup Profile
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'applications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-4xl mb-8 text-foreground">My Applications</h1>
                <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                  {applications.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No applications submitted yet</p>
                      <Link to="/events">
                        <Button variant="primary">Apply to Events</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...applications]
                        .sort((a, b) => {
                          if (!focusedEventId) return 0;
                          const aMatch = String(a.targetEventId ?? '') === String(focusedEventId);
                          const bMatch = String(b.targetEventId ?? '') === String(focusedEventId);
                          if (aMatch && !bMatch) return -1;
                          if (!aMatch && bMatch) return 1;
                          return 0;
                        })
                        .map((app, index) => {
                        const isFocusedEvent = focusedEventId && String(app.targetEventId ?? '') === String(focusedEventId);
                        const isAccepted = app.applicationStatus?.toLowerCase() === 'accepted' || app.status?.toLowerCase() === 'accepted';
                        const appSubs: any[] = (isAccepted && phaseSubmissions[app.applicationId]) || [];

                        const appStatus = String(app.applicationStatus || app.status || '').toUpperCase();
                        const isPendingApp = !app.isRegistration && appStatus === 'PENDING';
                        const isRejectedApp = !app.isRegistration && appStatus === 'REJECTED';

                        // Find phase submissions by order
                        const eventPhasesForApp = eventPhases[app.targetEventId] || [];
                        const phase1Config = eventPhasesForApp.find((p: any) => p.phaseOrder === 1);
                        const phase1Sub = appSubs.find((s: any) => s.phaseOrder === 1);
                        const phase1Submitted = !!phase1Sub && phase1Sub.status !== 'DRAFT';
                        const phase1Decision = phase1Sub?.decisionStatus || 'PENDING';
                        const phase1Accepted = phase1Submitted && phase1Decision === 'ACCEPTED';
                        const isActivePhase1 = phase1Config && phase1Config.phaseActive === true;
                        const isLockedPhase1 = phase1Config && phase1Config.phaseLocked === true;
                        const openPhase1 = () => navigate(`/apply/event/${app.targetEventId}/questions`, {
                          state: {
                            applicationId: app.applicationId,
                            phaseId: phase1Config.phaseId || phase1Config.id,
                            phaseOrder: 1,
                          }
                        });

                        // Phase 2 is unlocked only by an explicit admin acceptance of Phase 1
                        const phase2Unlocked = isAccepted && (phase1Accepted || !phase1Config);
                        const phase2Sub = appSubs.find((s: any) => s.phaseOrder === 2);
                        const phase2Config = eventPhasesForApp.find((p: any) => p.phaseOrder === 2);
                        
                        // Phase 2 banner: active if config exists and is active, and user hasn't graded yet
                        const isActivePhase2 = phase2Config && phase2Config.phaseActive === true;
                        const isLockedPhase2 = phase2Config && phase2Config.phaseLocked === true;
                        // A result is shown only once the admin has decided (a grade alone is an internal step)
                        const phase2Graded = !!phase2Sub && (phase2Sub.decisionStatus === 'ACCEPTED' || phase2Sub.decisionStatus === 'REJECTED');
                        const phase2Passed = !!phase2Sub && phase2Sub.decisionStatus === 'ACCEPTED';
                        const hasSubmittedPhase2 = phase2Sub && phase2Sub.status === 'SUBMITTED';
                        // Phase 3 (Pitch): averaged results, visible once the admin has sent them
                        const roundResults = applicationPitchResults[app.applicationId] || [];

                        return (
                          <div
                            key={index}
                            id={`app-card-${app.targetEventId}`}
                            className={`bg-muted border rounded-xl p-6 transition-all text-foreground ${
                              isFocusedEvent
                                ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                                : 'border-border hover:border-border/80'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3 mb-4">
                              <div className="min-w-0">
                                <h3 className="text-xl mb-1 break-words">{app.startupName || app.projectName}</h3>
                                <p className="text-sm text-muted-foreground">{app.eventTitle || app.eventName}</p>
                              </div>
                              <span className={`shrink-0 px-3 py-1 rounded-full text-xs ${statusColors[app.status] || 'bg-foreground/10 text-muted-foreground'}`}>
                                {app.status}
                              </span>
                            </div>

                            {/* Application pending / rejected */}
                            {isPendingApp && (
                              <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <Clock size={18} className="text-amber-400 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-amber-400">Your application is pending</p>
                                  <p className="text-xs text-muted-foreground">Please wait for the administrator's decision.</p>
                                </div>
                              </div>
                            )}
                            {isRejectedApp && (
                              <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                                <p className="text-sm font-semibold text-destructive">Your application was not accepted</p>
                                {app.rejectionReason && (
                                  <p className="text-xs text-muted-foreground mt-1">{app.rejectionReason}</p>
                                )}
                              </div>
                            )}

                            {/* Phase 1 — not submitted yet */}
                            {isAccepted && phase1Config && !phase1Submitted && (
                              isActivePhase1 ? (
                                <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                  <div className="flex items-center gap-3">
                                    <Rocket size={20} className="text-emerald-400 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-semibold text-emerald-400">Phase 1 is now open</p>
                                      <p className="text-xs text-muted-foreground">You can submit your answers. Once submitted, they can no longer be modified.</p>
                                    </div>
                                  </div>
                                  <Button onClick={openPhase1} className="text-xs gap-2 flex-shrink-0">
                                    <Send size={14} />
                                    Submit Answers
                                  </Button>
                                </div>
                              ) : isLockedPhase1 ? (
                                <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                  <Clock size={18} className="text-red-400 flex-shrink-0" />
                                  <p className="text-sm font-semibold text-red-400">Phase 1 is closed — no answers were submitted</p>
                                </div>
                              ) : (
                                <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                  <Check size={18} className="text-emerald-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-400">Your application has been accepted</p>
                                    <p className="text-xs text-muted-foreground">Phase 1 has not opened yet. You'll be notified when you can submit.</p>
                                  </div>
                                </div>
                              )
                            )}

                            {/* Phase 1 — submitted, awaiting the admin's review */}
                            {isAccepted && phase1Submitted && phase1Decision === 'PENDING' && (
                              <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <div className="flex items-center gap-3">
                                  <Clock size={18} className="text-amber-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-amber-400">Your Phase 1 submission is awaiting review</p>
                                    <p className="text-xs text-muted-foreground">You'll be notified once the administrator has reviewed it.</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Phase 1 — decided */}
                            {isAccepted && phase1Submitted && phase1Decision === 'REJECTED' && (
                              <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                                <p className="text-sm font-semibold text-destructive">Phase 1 not passed</p>
                                {phase1Sub.evaluatorFeedback && (
                                  <p className="text-xs text-muted-foreground mt-1">{phase1Sub.evaluatorFeedback}</p>
                                )}
                              </div>
                            )}
                            {phase1Accepted && (
                              <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                                <p className="text-sm font-semibold text-emerald-400">Phase 1 passed</p>
                              </div>
                            )}

                            {/* Phase 2 — submitted, answers are final */}
                            {phase2Unlocked && phase2Config && hasSubmittedPhase2 && !phase2Graded && (
                              <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <Clock size={18} className="text-amber-400 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-amber-400">Your Phase 2 submission is awaiting review</p>
                                  <p className="text-xs text-muted-foreground">Your answers have been submitted and can no longer be modified.</p>
                                </div>
                              </div>
                            )}

                            {/* Phase 2 Active Banner */}
                            {phase2Unlocked && phase2Config && isActivePhase2 && !phase2Graded && !hasSubmittedPhase2 && (
                              <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                <div className="flex items-center gap-3">
                                  <Rocket size={20} className="text-emerald-400 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-400">Phase 2 is now open</p>
                                    <p className="text-xs text-muted-foreground">Submit your answers before the deadline. Once submitted, they can no longer be modified.</p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => navigate(`/apply/event/${app.targetEventId}/questions`, {
                                    state: {
                                      applicationId: app.applicationId,
                                      phaseId: phase2Config.phaseId || phase2Config.id,
                                      phaseOrder: 2,
                                    }
                                  })}
                                  className="text-xs gap-2 flex-shrink-0"
                                >
                                  <Send size={14} />
                                  Submit Answers
                                </Button>
                              </div>
                            )}

                            {/* Phase 2 enrolled but not yet active — waiting banner */}
                            {phase2Unlocked && phase2Config && !isActivePhase2 && !isLockedPhase2 && !phase2Graded && (
                              <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <Clock size={18} className="text-amber-400 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-amber-400">You've been accepted to Phase 2</p>
                                  <p className="text-xs text-muted-foreground">Phase 2 will open soon. You'll be notified when you can submit.</p>
                                </div>
                              </div>
                            )}

                            {/* Phase 2 locked banner */}
                            {phase2Unlocked && isLockedPhase2 && !phase2Graded && (
                              <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                <Clock size={18} className="text-red-400 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-red-400">Phase 2 is closed and locked</p>
                                  <p className="text-xs text-muted-foreground">You can no longer update or submit answers for this phase.</p>
                                </div>
                              </div>
                            )}

                            {/* Phase 2 Graded Result */}
                            {phase2Graded && (
                              <div className={`mb-4 p-4 rounded-xl border ${phase2Passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Star size={16} className={phase2Passed ? 'text-emerald-400' : 'text-destructive'} />
                                  <p className={`text-sm font-semibold ${phase2Passed ? 'text-emerald-400' : 'text-destructive'}`}>
                                    {phase2Passed ? 'Phase 2 passed' : 'Phase 2: not selected'}
                                  </p>
                                  {phase2Sub.evaluationScore != null && (
                                    <span className="ml-auto text-sm font-bold text-foreground">
                                      {phase2Sub.evaluationScore}/100
                                    </span>
                                  )}
                                </div>
                                {phase2Sub.evaluatorFeedback && (
                                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                                    {phase2Sub.evaluatorFeedback}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Phase 3 Pitch Round Results */}
                            {roundResults.length > 0 && (
                              <div className="mb-4 space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <Trophy size={12} className="text-amber-400" />
                                  Pitch Round Results
                                </p>
                                {roundResults.map((res: any, idx: number) => (
                                  <div key={idx} className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
                                    <div className="flex justify-between items-center mb-2">
                                      <p className="text-sm font-semibold text-violet-400">{res.roundName || 'Round Result'}</p>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${res.decision === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                          {res.decision}
                                        </span>
                                        <span className="text-xs font-bold text-foreground">{res.totalScore}{res.maxScore ? ` / ${res.maxScore}` : ''} pts</span>
                                      </div>
                                    </div>
                                    {res.feedback && (
                                      <p className="text-xs text-muted-foreground mb-2 pl-2 border-l-2 border-border/50 whitespace-pre-line">
                                        {res.feedback}
                                      </p>
                                    )}
                                    {res.aiFeedback && (
                                      <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/10">
                                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">Insights & Remarks</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">"{res.aiFeedback}"</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Sector</p>
                                <p>{app.businessSector || app.sector || '—'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Submitted</p>
                                <p>{new Date(app.submittedDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tracking Code</p>
                                <p className="font-mono text-xs text-primary">{app.trackingCode}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Application ID</p>
                                <p className="font-mono text-xs text-foreground/70">{app.applicationId}</p>
                              </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-border/50 flex justify-end">
                              <button
                                onClick={() => {
                                  if (isAccepted) {
                                    navigate(`/startup/${app.applicationId}`);
                                  } else {
                                    navigate(`/track?code=${app.trackingCode}`);
                                  }
                                }}
                                className="text-sm font-medium transition-all text-primary hover:text-accent"
                              >
                                {isAccepted ? 'Manage Startup →' : 'Track Application →'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'expert' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-4xl mb-8 text-foreground">Expert Roles</h1>
                <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                  {expertEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <ShieldCheck size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">No expert roles assigned yet</p>
                      <p className="text-xs text-muted-foreground">When an admin invites you as an expert to an event, it will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expertEvents.map((event, index) => {
                        const userEmail = localStorage.getItem('userEmail')?.toLowerCase();
                        const myInvite = event.expertInvitations?.find((ei: any) => ei.email?.toLowerCase() === userEmail);
                        return (
                          <div
                            key={index}
                            className="bg-muted border border-border rounded-xl p-6 hover:border-border/80 transition-all text-foreground"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl mb-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground">{event.location || 'Online'}</p>
                              </div>
                              {myInvite && (
                                <span className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30">
                                  {myInvite.role}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                                <p className="font-medium">{event.status}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Start Date</p>
                                <p className="font-medium">{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Participants</p>
                                <p className="font-medium">{event.currentRegisteredCount || 0} / {event.maxParticipants || '∞'}</p>
                              </div>
                              <div className="flex items-end justify-end">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => navigate(`/expert/event/${event.id || event.eventId}`)}
                                  className="text-xs"
                                >
                                  View Event
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-4xl text-foreground">Notifications</h1>
                  {notifications.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await api.markAllNotificationsRead();
                          const updatedNotifications = await api.getNotifications();
                          setNotifications(dedupeNotifications(updatedNotifications));
                          toast.success('All notifications marked as read');
                        } catch (error) {
                          toast.error('Failed to mark all as read');
                        }
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="bg-slate-400/20 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6">
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground text-sm">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif, index) => {
                        // BUG 4 FIX: use the actual backend field names from the Notification entity
                        const notifId = notif.notificationId ?? notif.id;
                        const notifTitle = notif.notificationTitle ?? notif.title ?? 'Notification';
                        const notifMessage = notif.notificationMessage ?? notif.message ?? '';
                        const notifRead = notif.isReadStatus ?? notif.read ?? false;
                        const notifDate = notif.notificationCreatedAt ?? notif.createdAt ?? notif.date;
                        const notifType = notif.notificationType ?? notif.type ?? '';
                        const callToActionUrl = notif.callToActionUrl ?? null;
                        return (
                          <motion.div
                            key={notifId ?? index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.07 }}
                            className={`bg-muted border border-border rounded-xl p-4 hover:border-border/80 transition-all flex items-start gap-4 text-foreground ${!notifRead ? 'border-primary/30 bg-primary/5' : ''}`}
                          >
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: notifType === 'ALARM' ? '#FF4757' : '#00F5A0' }} />
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-medium">{notifTitle}</h3>
                                <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                                  {notifDate ? new Date(notifDate).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{notifMessage}</p>
                              <div className="flex gap-2">
                                {!notifRead && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.markNotificationRead(notifId);
                                        const updatedNotifications = await api.getNotifications();
                                        setNotifications(dedupeNotifications(updatedNotifications));
                                        toast.success('Marked as read');
                                      } catch (error) {
                                        toast.error('Failed to mark as read');
                                      }
                                    }}
                                    className="px-3 py-1 bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs"
                                  >
                                    Mark as read
                                  </button>
                                )}
                                {notifType === 'TEAM_INVITE' && (
                                  <button
                                    onClick={() => navigate('/invitations')}
                                    className="px-3 py-1 bg-cyan-500/20 text-cyan-600 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors text-xs flex items-center gap-1"
                                  >
                                    <Rocket size={12} />
                                    View Invite
                                  </button>
                                )}
                                {callToActionUrl && (
                                  <button
                                    onClick={() => navigate(callToActionUrl)}
                                    className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs hover:bg-primary/30 transition-colors"
                                  >
                                    View Event
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.deleteNotification(notifId);
                                      const updatedNotifications = await api.getNotifications();
                                      setNotifications(dedupeNotifications(updatedNotifications));
                                      toast.success('Notification deleted');
                                    } catch (error) {
                                      toast.error('Failed to delete notification');
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-500/20 text-red-600 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'invitations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-4xl text-foreground">Team Invitations</h1>
                  <Button onClick={() => navigate('/invitations')} variant="outline" className="text-xs">
                    Open Full View
                  </Button>
                </div>
                <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="text-primary" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Manage Your Invitations</h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    You can view, accept, or decline startup team invitations in your dedicated invitations portal.
                  </p>
                  <Button onClick={() => navigate('/invitations')} className="px-8">
                    Go to Invitations Portal
                  </Button>
                </div>
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
                              setProfileName(e.target.value);
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
                            defaultValue="student@eni.tn"
                            className="w-full rounded-xl bg-input border border-border px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all"
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
              </motion.div>
            )}
          </div>
        </main>
      </div >
    </div >
  );
}
