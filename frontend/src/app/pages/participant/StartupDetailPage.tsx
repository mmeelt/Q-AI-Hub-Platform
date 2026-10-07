import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, Brain, Target, Star, Sparkles, TrendingUp, ShieldCheck, Calendar, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { toast } from 'sonner';

interface Teammate {
    id: string;
    name: string;
    role: string;
    avatar?: string;
}

interface Rating {
    label: string;
    score: number;
    max: number;
    color: string;
}

import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { MonthYearPicker } from '../../components/ui/month-year-picker';
import { api } from '../../services/api';
import { Loader2, Wand2 } from 'lucide-react';


export function StartupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [application, setApplication] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [newMilestoneTask, setNewMilestoneTask] = useState('');
    const [newMilestoneDate, setNewMilestoneDate] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [teammates, setTeammates] = useState<Teammate[]>([]);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const profileName = localStorage.getItem('userName') || 'Founder';

    useEffect(() => {
        const fetchApplication = async () => {
            if (!id) return;
            setIsLoading(true);
            setError(null);
            try {
                // Try fetching as application first
                const apps: any[] = await api.getMyApplications();
                const found = apps.find((a: any) => a.applicationId === id);
                if (found) {
                    const savedApplication = JSON.parse(localStorage.getItem(`application-${id}`) || '{}');
                    const savedMilestones = JSON.parse(localStorage.getItem(`milestones-${id}`) || '[]');
                    setApplication({
                        ...found,
                        ...savedApplication,
                        projectName: found.projectName || JSON.parse(found.initialApplicationAnswers || '{}').projectName || 'My Project',
                        sector: JSON.parse(found.initialApplicationAnswers || '{}').sector || '',
                        description: JSON.parse(found.initialApplicationAnswers || '{}').pitchText || '',
                        eventName: found.eventTitle || `Event #${found.targetEventId?.slice(0, 8)}`,
                        applicationId: found.applicationId,
                        status: found.applicationStatus,
                        pitchDate: found.pitchDate || null, // Use backend pitch date, not localStorage
                    });
                    if (Array.isArray(savedMilestones)) {
                        setMilestones(savedMilestones);
                    }
                    
                    // Load teammates from backend if available
                    try {
                        const teamData = await api.getTeammates(id);
                        setTeammates(teamData || []);
                    } catch (e) {
                        // No teammates endpoint or empty
                        setTeammates([]);
                    }
                    
                    // Load ratings from backend if available
                    try {
                        const ratingsData = await api.getStartupRatings(id);
                        setRatings(ratingsData || []);
                    } catch (e) {
                        // No ratings endpoint or empty
                        setRatings([]);
                    }
                } else {
                    setError('Application not found');
                }
            } catch (error: any) {
                console.error('Failed to load application', error);
                setError(error.message || 'Failed to load application');
            } finally {
                setIsLoading(false);
            }
        };
        fetchApplication();
    }, [id]);

    const saveMilestones = (updatedMilestones: any[]) => {
        if (!id) return;
        localStorage.setItem(`milestones-${id}`, JSON.stringify(updatedMilestones));
        setMilestones(updatedMilestones);
    };

    const handleAddMilestone = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestoneTask.trim()) return;
        const newMilestone = {
            id: crypto.randomUUID(),
            task: newMilestoneTask,
            date: newMilestoneDate || 'TBD',
            completed: false
        };
        saveMilestones([...milestones, newMilestone]);
        setNewMilestoneTask('');
        setNewMilestoneDate('');
    };

    const handleToggleMilestone = (milestoneId: string) => {
        const updated = milestones.map(m => 
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        saveMilestones(updated);
    };

    const handleDeleteMilestone = (milestoneId: string) => {
        const updated = milestones.filter(m => m.id !== milestoneId);
        saveMilestones(updated);
    };

    const handleAiRefine = async () => {
        if (!application?.description && !application?.projectName) return;
        
        setIsRefining(true);
        try {
            const rawText = application.description || `A startup in the ${application.sector} sector called ${application.projectName}.`;
            const data = await api.refineDescription(rawText);
            
            const updatedApp = { ...application, description: data.refinedDescription };
            localStorage.setItem(`application-${id}`, JSON.stringify(updatedApp));
            setApplication(updatedApp);
            toast.success('Description refined by AI!');
        } catch (error) {
            console.error('Refinement failed:', error);
            toast.error('AI refinement failed. Is the backend running?');
        } finally {
            setIsRefining(false);
        }
    };


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-foreground">
                <Loader2 className="animate-spin mr-2" />
                Loading application details...
            </div>
        );
    }

    if (!application) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Application not found</p>
                    <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <DashboardHeader activeTab="applications" profileName={profileName} />

            {/* Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={16} /> Back to Events
                    </button>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Page Title & Hero */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                    application.status === 'ACCEPTED' || application.status === 'Accepted'
                                        ? 'bg-brand-mint/10 text-emerald-600 dark:text-brand-mint border-brand-mint/20'
                                        : application.status === 'REJECTED' || application.status === 'Rejected'
                                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                }`}>
                                    {application.status || 'Pending'}
                                </div>
                                <span className="text-sm text-muted-foreground">{application.eventName}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-3">{application.projectName}</h1>
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                                <Target size={18} className="text-cyan-600 dark:text-brand-cyan" />
                                {application.sector} Startup
                            </p>
                        </div>
                        
                        {application.pitchDate && (
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center md:items-end text-center md:text-right gap-2 shadow-lg shadow-cyan-500/10"
                            >
                                <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-xs">
                                    <Calendar size={16} />
                                    Pitch Scheduled
                                </div>
                                <div className="text-2xl font-bold text-white tracking-tight">
                                    {new Date(application.pitchDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} at {new Date(application.pitchDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Prepare your presentation deck</p>
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Info Column */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Follow-up Questions from Admin */}
                            {application.followupStatus && application.followupStatus !== 'none' && (
                                <section className="bg-card/95 backdrop-blur-xl border border-brand-amber/20 rounded-2xl p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <TrendingUp size={80} className="text-brand-amber" />
                                    </div>
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                                        <Sparkles size={22} className="text-brand-amber" />
                                        Progression: Idea to Pre-Seed
                                    </h2>
                                    
                                    {application.followupStatus === 'waiting_answers' ? (
                                        <div className="space-y-6 relative z-10">
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                The Admin team has requested additional information to evaluate your startup for <b>Pre-Seed</b> promotion. Please provide detailed answers below:
                                            </p>
                                            <div className="space-y-6">
                                                {(() => {
                                                    let qs: string[] = [];
                                                    try {
                                                        if (application.followupQuestionsJson) {
                                                            const parsed = JSON.parse(application.followupQuestionsJson);
                                                            if (Array.isArray(parsed)) qs = parsed;
                                                        }
                                                    } catch (_) {}
                                                    return qs;
                                                })().map((q: string, i: number) => (
                                                    <div key={i} className="space-y-3">
                                                        <label className="text-sm font-bold text-white flex gap-2">
                                                            <span className="text-brand-amber">Q{i+1}:</span> {q}
                                                        </label>
                                                        <textarea 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white min-h-[100px] outline-none focus:border-brand-amber/40 transition-all placeholder:text-muted-foreground/30 shadow-inner"
                                                            placeholder="Type your response here..."
                                                            id={`answer-${i}`}
                                                        />
                                                    </div>
                                                ))}
                                                <Button 
                                                    fullWidth
                                                    onClick={() => {
                                                        (async () => {
                                                            try {
                                                                const qs = JSON.parse(application.followupQuestionsJson || '[]') as any[];
                                                                const answers = qs.map((_: any, i: number) =>
                                                                    (document.getElementById(`answer-${i}`) as HTMLTextAreaElement).value
                                                                );
                                                                const saved = await api.submitFollowupAnswers(String(application.applicationId), answers);
                                                                // Best-effort merge so UI updates immediately
                                                                setApplication((prev: any) => ({ ...prev, ...saved }));
                                                                toast.success('Answers submitted to Admin!');
                                                            } catch (e: any) {
                                                                toast.error(e.message || 'Failed to submit answers');
                                                            }
                                                        })();
                                                    }}
                                                    className="h-12 bg-gradient-to-r from-brand-amber to-orange-500 border-none shadow-lg shadow-orange-500/20"
                                                >
                                                    Submit for Review
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-6 text-center space-y-3">
                                            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                <CheckCircle2 size={32} className="text-emerald-400" />
                                            </div>
                                            <p className="text-lg font-bold text-white tracking-tight">Review in Progress</p>
                                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your answers have been submitted. The jury is now reviewing your project for Pre-Seed promotion.</p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Mission/Topic Card */}
                            <section className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 relative group/desc">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-3">
                                        <Brain size={22} className="text-purple-600 dark:text-brand-purple" />
                                        Project Topic & Vision
                                    </h2>
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 px-3 gap-2 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                                        onClick={handleAiRefine}
                                        disabled={isRefining}
                                    >
                                        {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                        Refine with AI
                                    </Button>
                                </div>
                                <div className="space-y-4 text-muted-foreground leading-relaxed">
                                    {application.description ? (
                                        <p className="text-foreground/90 italic border-l-2 border-primary/30 pl-4 py-1">
                                            {application.description}
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground italic">No description provided.</p>
                                    )}
                                </div>
                            </section>


                            {/* Team Card */}
                            <section className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <Users size={22} className="text-emerald-600 dark:text-brand-mint" />
                                    The Startup Team
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {teammates.length === 0 ? (
                                        <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                                            No team members added yet
                                        </div>
                                    ) : (
                                        teammates.map((member) => (
                                            <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl bg-foreground/5 border border-border hover:border-border transition-colors">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center font-bold text-brand-navy">
                                                    {member.avatar || member.name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{member.name}</p>
                                                    <p className="text-sm text-muted-foreground">{member.role}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <button
                                        onClick={() => navigate(`/startup/${id}/invite`)}
                                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-border hover:bg-foreground/5 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                                            <span className="text-lg">+</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">Invite Teammate</span>
                                    </button>
                                </div>
                            </section>

                            {/* Milestones Card */}
                            <section className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <Target size={22} className="text-cyan-600 dark:text-brand-cyan" />
                                    Startup Milestones
                                </h2>
                                
                                <div className="space-y-4 mb-8">
                                    {milestones.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No milestones added yet. Start by setting your next goals.</p>
                                    ) : (
                                        milestones.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 border border-border group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground">
                                                        <Target size={20} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium ${m.completed ? 'text-muted-foreground line-through decoration-primary/40' : 'text-foreground'}`}>
                                                            {m.task}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 bg-foreground/5 px-2 py-0.5 rounded-full w-fit">
                                                            <Calendar size={12} className="text-cyan-500" />
                                                            {m.date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleToggleMilestone(m.id)}
                                                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                                            m.completed 
                                                                ? 'bg-brand-mint/10 border-brand-mint/30 text-brand-mint shadow-[0_0_10px_rgba(0,245,160,0.1)]' 
                                                                : 'bg-foreground/5 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                                        }`}
                                                    >
                                                        {m.completed ? 'Achieved' : 'Mark as Achieved'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteMilestone(m.id)}
                                                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleAddMilestone} className="space-y-4 pt-6 border-t border-border/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Milestone Task</label>
                                            <input
                                                type="text"
                                                value={newMilestoneTask}
                                                onChange={(e) => setNewMilestoneTask(e.target.value)}
                                                placeholder="e.g. Launch Beta Version"
                                                className="w-full rounded-xl bg-input border border-border px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider ml-1">Approximate Date</label>
                                            <MonthYearPicker
                                                date={newMilestoneDate}
                                                onSelect={(date) => setNewMilestoneDate(date)}
                                                placeholder="Select Month & Year"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMilestoneTask.trim() || !newMilestoneDate}
                                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm h-11"
                                    >
                                        <Plus size={18} />
                                        Add Milestone
                                    </button>
                                </form>
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-8">
                            {/* Performance Rating Card */}
                            <section className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-8 sticky top-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold flex items-center gap-3">
                                        <Star size={22} className="text-amber-600 dark:text-brand-amber" />
                                        Performance
                                    </h2>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-cyan/10 border border-brand-cyan/20">
                                        <ShieldCheck size={14} className="text-cyan-600 dark:text-brand-cyan" />
                                        <span className="text-[10px] font-bold text-cyan-600 dark:text-brand-cyan uppercase tracking-wider">Verified</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {ratings.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No ratings available yet
                                        </div>
                                    ) : (
                                        ratings.map((rating, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-muted-foreground">{rating.label}</span>
                                                    <span className="text-sm font-bold text-foreground">{rating.score}/{rating.max}</span>
                                                </div>
                                                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(rating.score / rating.max) * 100}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: rating.color, boxShadow: `0 0 10px ${rating.color}40` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {ratings.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-border">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-muted-foreground">Overall Impact</span>
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-brand-mint">
                                                <TrendingUp size={16} />
                                                <span className="font-bold text-lg">Top 15%</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-center">
                                            Based on average scores from jury evaluations.
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
