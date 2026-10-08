import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { TabPanel } from './shared';

export function ExpertTab({ expertEvents }: { expertEvents: any[] }) {
  const navigate = useNavigate();
  return (
    <TabPanel>
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
    </TabPanel>
  );
}
