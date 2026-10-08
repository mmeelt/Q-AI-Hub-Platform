import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Rocket } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { TabPanel } from './shared';

export function StartupTab({ startups }: { startups: any[] }) {
  const navigate = useNavigate();
  return (
    <TabPanel>
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
    </TabPanel>
  );
}
