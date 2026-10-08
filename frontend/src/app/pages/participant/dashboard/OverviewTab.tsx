import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FileText, Calendar, BellRing, Rocket } from 'lucide-react';
import { TabPanel, statusColors, type PhaseData } from './shared';

interface OverviewTabProps extends PhaseData {
  profileName: string;
  applications: any[];
  eventsCount: number;
  unreadCount: number;
}

export function OverviewTab({ profileName, applications, eventsCount, unreadCount, eventPhases, phaseSubmissions }: OverviewTabProps) {
  const navigate = useNavigate();
  const stats = [
    { label: 'Active Applications', value: applications.filter(a => a.status !== 'Rejected').length, color: 'from-brand-mint to-brand-sky', icon: FileText, bg: 'bg-brand-mint/10' },
    { label: 'Events Available', value: eventsCount, color: 'from-brand-sky to-brand-blue', icon: Calendar, bg: 'bg-brand-sky/10' },
    { label: 'Notifications', value: unreadCount, color: 'from-brand-purple to-brand-blue', icon: BellRing, bg: 'bg-brand-purple/10' },
  ];
  return (
    <TabPanel>
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
    </TabPanel>
  );
}
