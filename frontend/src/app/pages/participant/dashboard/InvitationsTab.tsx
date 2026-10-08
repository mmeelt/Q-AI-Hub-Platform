import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { TabPanel } from './shared';

export function InvitationsTab() {
  const navigate = useNavigate();
  return (
    <TabPanel>
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
    </TabPanel>
  );
}
