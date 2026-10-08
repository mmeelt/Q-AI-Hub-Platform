import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Rocket, ArrowLeft, Save, Users, Target, Info, Globe, Video, 
    FileText, UserPlus, Trash2, Loader2, Sparkles, Wand2, 
    TrendingUp, DollarSign, Activity, Settings, Layout
} from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Avatar } from '../../components/common/Avatar';
import { PitchVideoUploader } from '../../components/common/PitchVideoUploader';

type TabType = 'info' | 'team';

export function ManageStartupPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    
    const [startup, setStartup] = useState<any>(null);
    const [teammates, setTeammates] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({});
    
    const profileName = localStorage.getItem('userName') || 'Founder';

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [startupData, teammatesData] = await Promise.all([
                    api.getStartupById(id),
                    api.getStartupTeammates(id)
                ]);
                setStartup(startupData);
                setFormData(startupData);
                setTeammates(teammatesData);
            } catch (error) {
                console.error('Failed to fetch startup details', error);
                toast.error('Failed to load startup details');
                navigate('/my-startups');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            await api.updateStartupProfile(id, formData);
            toast.success('Startup profile updated successfully');
            setStartup(formData);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update startup');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveTeammate = async (invitationId: string) => {
        if (!id) return;
        if (!confirm('Are you sure you want to remove this teammate?')) return;
        
        try {
            await api.removeTeammate(id, invitationId);
            setTeammates(prev => prev.filter(t => t.id !== invitationId));
            toast.success('Teammate removed');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove teammate');
        }
    };

    const handleAiRefine = async () => {
        if (!formData.rawDescription) return;
        setIsRefining(true);
        try {
            const data = await api.refineDescription(formData.rawDescription);
            setFormData((prev: any) => ({ 
                ...prev, 
                aiGeneratedDescription: data.refinedDescription,
                isUsingAiDescription: true 
            }));
            toast.success('AI description generated!');
        } catch (error) {
            toast.error('AI refinement failed');
        } finally {
            setIsRefining(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-foreground">
                <Loader2 className="animate-spin text-cyan-500 mb-4" size={48} />
                <p className="text-muted-foreground">Loading startup workspace...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'info', label: 'Basic Info', icon: Info },
        { id: 'team', label: 'Team & Collaboration', icon: Users },
    ];

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <DashboardHeader activeTab="my-startups" profileName={profileName} />

            <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-10">
                    <button 
                        onClick={() => navigate('/my-startups')} 
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-500 transition-colors mb-6 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                        Back to My Startups
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border border-white/10 shrink-0">
                                {startup.companyLogoUrl ? (
                                    <img src={startup.companyLogoUrl} alt={startup.projectName} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Rocket className="text-white" size={40} />
                                )}
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold mb-2">{startup.projectName}</h1>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Layout size={14} /> {startup.businessSector}</span>
                                    <span className="flex items-center gap-1.5"><Globe size={14} /> {startup.companyTagline}</span>
                                </div>
                            </div>
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-xl px-8 shadow-lg shadow-emerald-500/20"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                            Save All Changes
                        </Button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-2 mb-8 bg-card/30 backdrop-blur-xl p-1.5 rounded-2xl border border-border w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'info' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Description Card */}
                                    <section className="bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold flex items-center gap-3">
                                                <FileText className="text-purple-500" />
                                                Startup Narrative
                                            </h2>
                                            <Button 
                                                variant="ghost" 
                                                className="bg-purple-500/5 hover:bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl"
                                                onClick={handleAiRefine}
                                                disabled={isRefining}
                                            >
                                                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                                <span className="ml-2">{isRefining ? 'Enhancing...' : 'Enhance Description'}</span>
                                            </Button>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-2">Punchy Tagline</label>
                                                <input 
                                                    name="companyTagline"
                                                    value={formData.companyTagline || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-input border border-border rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all"
                                                    placeholder="The Uber for AI models..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-2">Original Pitch Description</label>
                                                <textarea 
                                                    name="rawDescription"
                                                    value={formData.rawDescription || ''}
                                                    onChange={handleInputChange}
                                                    rows={6}
                                                    className="w-full bg-input border border-border rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all resize-none"
                                                    placeholder="Describe your vision, problem, and solution..."
                                                />
                                            </div>
                                            {formData.aiGeneratedDescription && (
                                                <div className="p-6 rounded-2xl bg-card border border-border">
                                                    <p className="text-foreground/80 leading-relaxed">{formData.aiGeneratedDescription}</p>
                                                    <div className="mt-4 flex items-center gap-3">
                                                        <button 
                                                            onClick={() => setFormData((prev: any) => ({ 
                                                                ...prev, 
                                                                rawDescription: prev.aiGeneratedDescription,
                                                                aiGeneratedDescription: null
                                                            }))}
                                                            className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all bg-purple-500 hover:bg-purple-600 text-white"
                                                        >
                                                            Replace with AI Version
                                                        </button>
                                                        <button 
                                                            onClick={() => setFormData((prev: any) => ({ 
                                                                ...prev, 
                                                                aiGeneratedDescription: null
                                                            }))}
                                                            className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/30"
                                                        >
                                                            Keep Original
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Media & Links */}
                                    <section className="bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8">
                                        <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
                                            <Globe className="text-blue-500" />
                                            Online Presence
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="block text-sm font-medium text-muted-foreground">Website URL</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                    <input 
                                                        name="companyWebsiteUrl"
                                                        value={formData.companyWebsiteUrl || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-input border border-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-cyan-500/50 transition-all"
                                                        placeholder="https://example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-sm font-medium text-muted-foreground">Pitch Video</label>
                                                <PitchVideoUploader
                                                    value={formData.pitchVideoLink}
                                                    onChange={url => setFormData((prev: any) => ({ ...prev, pitchVideoLink: url }))}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Sidebar Stats */}
                                <div className="space-y-8">
                                    <section className="bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8">
                                        <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                                            <Settings className="text-cyan-500" />
                                            Project DNA
                                        </h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Business Sector</label>
                                                <select 
                                                    name="businessSector"
                                                    value={formData.businessSector || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-input border border-border rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all"
                                                >
                                                    <option value="Fintech">Fintech</option>
                                                    <option value="Healthtech">Healthtech</option>
                                                    <option value="Edtech">Edtech</option>
                                                    <option value="AI / ML">AI / ML</option>
                                                    <option value="E-commerce">E-commerce</option>
                                                    <option value="GreenTech">GreenTech</option>
                                                    <option value="SaaS">SaaS</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Current Stage</label>
                                                <select 
                                                    name="startupStage"
                                                    value={formData.startupStage || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-input border border-border rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all"
                                                >
                                                    <option value="Ideation">Ideation</option>
                                                    <option value="MVP">MVP</option>
                                                    <option value="Pre-Seed">Pre-Seed</option>
                                                    <option value="Seed">Seed</option>
                                                    <option value="Series A+">Series A+</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'team' && (
                            <div className="space-y-8">
                                {/* Current Team */}
                                <section className="bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-bold flex items-center gap-3">
                                            <Users className="text-emerald-500" />
                                            Active Teammates
                                        </h2>
                                        <Button 
                                            onClick={() => navigate(`/startup/${id}/invite`)}
                                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 rounded-xl"
                                        >
                                            <UserPlus size={18} className="mr-2" />
                                            Invite New Member
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Founder Card */}
                                        <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 relative group">
                                            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-cyan-500 text-[10px] font-bold text-brand-navy uppercase tracking-wider">
                                                Founder
                                            </div>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center font-bold text-cyan-600 shadow-xl border border-cyan-500/20 overflow-hidden">
                                                    <Avatar name={profileName} className="w-full h-full text-base" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{profileName}</p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Chief Executive</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Teammate Cards */}
                                        {teammates.map(tm => (
                                            <motion.div 
                                                key={tm.id}
                                                layout
                                                className="p-6 rounded-2xl bg-card border border-border relative group hover:border-red-500/30 transition-all shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden shrink-0">
                                                        <Avatar name={tm.inviteeEmail} className="w-full h-full text-base" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-lg truncate">{tm.inviteeEmail.split('@')[0]}</p>
                                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{tm.inviteeRole || 'Member'}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveTeammate(tm.id)}
                                                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        ))}

                                        {teammates.length === 0 && (
                                            <div className="col-span-full md:col-span-2 py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
                                                <Users size={32} className="mb-3 opacity-20" />
                                                <p>No confirmed teammates yet.</p>
                                                <p className="text-xs">Invite your first co-founder or dev to get started!</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
