import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, FileText, Calendar, Bell, Settings, ShieldCheck, Rocket, UserPlus } from 'lucide-react';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { getUserName, isLoggedIn } from '../../utils/localStorage';
import { dedupeNotifications } from './dashboard/shared';
import { OverviewTab } from './dashboard/OverviewTab';
import { StartupTab } from './dashboard/StartupTab';
import { ApplicationsTab } from './dashboard/ApplicationsTab';
import { ExpertTab } from './dashboard/ExpertTab';
import { NotificationsTab } from './dashboard/NotificationsTab';
import { InvitationsTab } from './dashboard/InvitationsTab';
import { SettingsTab } from './dashboard/SettingsTab';

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

/** Founder / participant dashboard: loads the user's data once, each tab renders its own part. */
export function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL (?tab=...) is the source of truth for the active tab
  const activeTab = searchParams.get('tab') || 'overview';
  const focusedEventId = searchParams.get('eventId');

  const [applications, setApplications] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [profileName, setProfileName] = useState(getUserName('User'));
  const [expertEvents, setExpertEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phaseSubmissions, setPhaseSubmissions] = useState<Record<string, any[]>>({});
  const [applicationPitchResults, setApplicationPitchResults] = useState<Record<string, any[]>>({});
  const [eventPhases, setEventPhases] = useState<Record<string, any[]>>({});

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

        setNotifications(dedupeNotifications(validNotifs));
        setEventsCount(validEvents.length);
        setStartups(Array.isArray(startupData) ? startupData : (startupData ? [startupData] : []));
        setExpertEvents(validExpertEvents);
        if (profile) {
          setProfile(profile);
          setProfileName(profile.fullName);
        }
      } catch (error: any) {
        console.error('Dashboard load error:', error);
        toast.error(`Dashboard error: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'events') {
      navigate('/events');
      return;
    }
    setSearchParams({ tab: tabId });
  };

  const unreadNotificationsCount = notifications.filter(n => !(n.isReadStatus ?? n.read ?? false)).length;
  const phaseData = { phaseSubmissions, eventPhases };

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
                onClick={() => handleTabChange(item.id)}
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
              <OverviewTab
                profileName={profileName}
                applications={applications}
                eventsCount={eventsCount}
                unreadCount={unreadNotificationsCount}
                {...phaseData}
              />
            )}
            {activeTab === 'startup' && <StartupTab startups={startups} />}
            {activeTab === 'applications' && (
              <ApplicationsTab
                applications={applications}
                focusedEventId={focusedEventId}
                applicationPitchResults={applicationPitchResults}
                {...phaseData}
              />
            )}
            {activeTab === 'expert' && <ExpertTab expertEvents={expertEvents} />}
            {activeTab === 'notifications' && (
              <NotificationsTab notifications={notifications} setNotifications={setNotifications} />
            )}
            {activeTab === 'invitations' && <InvitationsTab />}
            {activeTab === 'settings' && (
              <SettingsTab profile={profile} profileName={profileName} onProfileNameChange={setProfileName} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
