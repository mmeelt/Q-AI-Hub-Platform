import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { ApplicationCard } from './ApplicationCard';
import { TabPanel, type PhaseData } from './shared';

interface ApplicationsTabProps extends PhaseData {
  applications: any[];
  /** ?eventId=... in the URL: that event's application is shown first and highlighted */
  focusedEventId: string | null;
  applicationPitchResults: Record<string, any[]>;
}

export function ApplicationsTab({ applications, focusedEventId, phaseSubmissions, eventPhases, applicationPitchResults }: ApplicationsTabProps) {
  return (
    <TabPanel>
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
              .map((app, index) => (
                <ApplicationCard
                  key={index}
                  app={app}
                  focusedEventId={focusedEventId}
                  phaseSubmissions={phaseSubmissions}
                  eventPhases={eventPhases}
                  applicationPitchResults={applicationPitchResults}
                />
              ))}
          </div>
        )}
      </div>
    </TabPanel>
  );
}
