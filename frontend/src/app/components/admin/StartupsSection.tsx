import { useState, useEffect } from 'react';
import { Search, Filter, X, Users, DollarSign, TrendingUp, Calendar, CheckCircle, Clock, ChevronRight, Video, Save, Percent, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { DateTimePicker } from '../ui/datetime-picker';
import { toast } from 'sonner';
import { PitchVideo } from '../common/PitchVideo';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } } };
const cardItem = { hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

function StageBadge({ stage }: { stage: string }) {
    const s: Record<string, string> = {
        Idea: 'bg-violet-500/15 text-violet-700 dark:text-violet-500 border-violet-500/20', 'Pre-Seed': 'bg-brand-cyan/10 text-cyan-600 dark:text-brand-cyan border-brand-cyan/20',
        Seed: 'bg-brand-teal/10 text-emerald-600 dark:text-brand-teal border-brand-teal/20', 'Series A': 'bg-brand-purple/15 text-purple-600 dark:text-brand-purple border-brand-purple/20',
    };
    return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s[stage] || 'bg-foreground/10 text-foreground/70 border-border'}`}>{stage}</span>;
}

function StatusDot({ status }: { status: string }) {
    const c: Record<string, { dot: string; glow: string }> = {
        Active: { dot: 'bg-brand-teal', glow: 'shadow-[0_0_6px_rgba(0,255,194,0.5)]' },
        'On Hold': { dot: 'bg-brand-purple', glow: 'shadow-[0_0_6px_rgba(123,47,255,0.5)]' },
        Graduated: { dot: 'bg-brand-cyan', glow: 'shadow-[0_0_6px_rgba(0,229,255,0.5)]' },
        Pending: { dot: 'bg-brand-sky', glow: 'shadow-[0_0_6px_rgba(0,217,245,0.5)]' },
        Rejected: { dot: 'bg-brand-purple', glow: 'shadow-[0_0_6px_rgba(123,47,255,0.5)]' },
    };
    const style = c[status] || { dot: 'bg-muted-foreground/30', glow: '' };
    return <div className="flex items-center gap-1.5"><div className={`h-2 w-2 rounded-full ${style.dot} ${style.glow}`} /><span className="text-xs text-muted-foreground">{status}</span></div>;
}

function MilestoneIcon({ status }: { status: string }) {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-brand-teal" />;
    if (status === 'in-progress') return <Clock className="h-4 w-4 text-cyan-600 dark:text-brand-cyan" />;
    return <div className="h-4 w-4 rounded-full border-2 border-border" />;
}

function StartupDetailPanel({ startup: initialStartup, onClose }: { startup: any; onClose: () => void }) {
    const [startup, setStartup] = useState<any>(initialStartup);
    const [pitchDate, setPitchDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [editedMetrics, setEditedMetrics] = useState({
        monthlyRevenue: initialStartup.monthlyRevenue || '0',
        growthRatePct: initialStartup.growthRatePct || 0,
        monthlyBurnRate: initialStartup.monthlyBurnRate || '0',
        overallProgressPct: initialStartup.overallProgressPct || initialStartup.progress || 0,
        accuracyRatePct: initialStartup.accuracyRatePct || 0,
        totalFundingRaised: initialStartup.totalFundingRaised || (initialStartup.funding || '').replace(/[^0-9]/g, '') || '0',
    });

    useEffect(() => {
        setStartup(initialStartup);
        setEditedMetrics({
            monthlyRevenue: initialStartup.monthlyRevenue || '0',
            growthRatePct: initialStartup.growthRatePct || 0,
            monthlyBurnRate: initialStartup.monthlyBurnRate || '0',
            overallProgressPct: initialStartup.overallProgressPct || initialStartup.progress || 0,
            accuracyRatePct: initialStartup.accuracyRatePct || 0,
            totalFundingRaised: initialStartup.totalFundingRaised || (initialStartup.funding || '').replace(/[^0-9]/g, '') || '0',
        });
    }, [initialStartup]);

    const handleSaveMetrics = async () => {
        setIsSaving(true);
        try {
            const data = await api.updateStartupMetrics(startup.id, editedMetrics);
            
            setStartup({
                ...startup,
                ...data,
                progress: data.overallProgressPct,
                metrics: [
                    { label: 'Revenue', value: `$${((Number(data.monthlyRevenue) || 0) / 1000).toFixed(1)}K/mo` },
                    { label: 'Growth', value: `+${data.growthRatePct}%` },
                    { label: 'Burn Rate', value: `$${((Number(data.monthlyBurnRate) || 0) / 1000).toFixed(1)}K/mo` },
                    { label: 'Accuracy', value: `${data.accuracyRatePct}%` },
                ]
            });
            toast.success('Metrics updated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update metrics');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMetricChange = (field: keyof typeof editedMetrics, value: string | number) => {
        setEditedMetrics(prev => ({ ...prev, [field]: value }));
    };

    return (
        <motion.div
            initial={{ x: 520, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 520, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col border-l border-border bg-card backdrop-blur-xl shadow-2xl"
        >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-base font-bold text-foreground">Startup Details</h3>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-all"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="border-b border-border bg-gradient-to-br from-brand-cyan/[0.04] to-brand-purple/[0.02] p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan/25 to-brand-purple/25 text-xl font-bold text-cyan-600 dark:text-brand-cyan ring-2 ring-brand-cyan/15">{startup.logo}</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2"><h4 className="text-xl font-bold text-foreground">{startup.name}</h4><StageBadge stage={startup.stage} /></div>
                            <p className="text-sm text-muted-foreground">{startup.industry}</p>
                            <StatusDot status={startup.status} />
                        </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-foreground/70">{startup.description}</p>
                </div>

                {/* Pitch Video Section */}
                <div className="border-b border-border p-6">
                    <h5 className="mb-3 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 text-cyan-700 dark:text-brand-sky" /> Startup Pitch Video
                    </h5>
                    <PitchVideo url={(startup as any).pitchVideoUrl} emptyText="No pitch video uploaded" />
                </div>

                <div className="border-b border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Key Metrics</h5>
                        <Button 
                            onClick={handleSaveMetrics} 
                            disabled={isSaving}
                            className="!h-7 !px-3 !text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        >
                            {isSaving ? <Clock className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            Save Metrics
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3 text-emerald-500" /> Monthly Revenue ($)
                            </label>
                            <input 
                                type="number" 
                                value={editedMetrics.monthlyRevenue}
                                onChange={(e) => handleMetricChange('monthlyRevenue', e.target.value)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-blue-500" /> Growth Rate (%)
                            </label>
                            <input 
                                type="number" 
                                value={editedMetrics.growthRatePct}
                                onChange={(e) => handleMetricChange('growthRatePct', parseInt(e.target.value) || 0)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <Activity className="h-3 w-3 text-orange-500" /> Monthly Burn ($)
                            </label>
                            <input 
                                type="number" 
                                value={editedMetrics.monthlyBurnRate}
                                onChange={(e) => handleMetricChange('monthlyBurnRate', e.target.value)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <Percent className="h-3 w-3 text-purple-500" /> Overall Progress (%)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={editedMetrics.overallProgressPct}
                                onChange={(e) => handleMetricChange('overallProgressPct', parseInt(e.target.value) || 0)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-cyan-500" /> Accuracy Rate (%)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100"
                                step="0.1"
                                value={editedMetrics.accuracyRatePct}
                                onChange={(e) => handleMetricChange('accuracyRatePct', parseFloat(e.target.value) || 0)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3 text-emerald-500" /> Total Funded ($)
                            </label>
                            <input 
                                type="number" 
                                value={editedMetrics.totalFundingRaised}
                                onChange={(e) => handleMetricChange('totalFundingRaised', e.target.value)}
                                className="w-full bg-foreground/5 border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground focus:border-primary/40 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        {(startup.metrics || []).map((m: any, i: number) => (
                            <motion.div key={m.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
                                className="rounded-xl bg-card/60 p-3 border border-border/50 hover:border-primary/20 transition-all">
                                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{m.label}</p>
                                <p className="text-base font-bold text-foreground drop-shadow-sm">{m.value}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="border-b border-border p-6">
                    <h5 className="mb-3 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Progress</h5>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-foreground/5">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${startup.progress}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{startup.progress}%</span>
                    </div>
                </div>

                <div className="border-b border-border p-6">
                    <h5 className="mb-3 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Milestones</h5>
                    <div className="flex flex-col gap-3">
                        {(startup.milestones || []).map((m: any, i: number) => (
                            <motion.div key={m.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                                className="flex items-start gap-3 rounded-xl p-2 hover:bg-muted/50 transition-colors">
                                <MilestoneIcon status={m.status} />
                                <div className="flex-1"><p className={`text-sm font-medium ${m.status === 'completed' ? 'text-foreground/60 line-through' : 'text-foreground'}`}>{m.title}</p><p className="text-xs text-muted-foreground">{m.description}</p><p className="mt-0.5 text-[10px] text-muted-foreground/60">{m.date}</p></div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    <h5 className="mb-3 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">Team ({startup.teamSize})</h5>
                    <div className="flex flex-col gap-2">
                        {(startup.members || []).map((m: any, i: number) => (
                            <motion.div key={m.name || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                                className="flex items-center gap-3 rounded-xl bg-muted p-3 border border-border hover:bg-foreground/5 transition-colors">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-cyan/10 text-xs font-bold text-cyan-600 dark:text-brand-cyan">{m.avatar}</div>
                                <div><p className="text-sm font-medium text-foreground">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-border p-6">
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[{ l: 'Founded', v: startup.foundedDate, c: '#00E5FF' }, { l: 'Funding', v: startup.funding, c: '#00FFC2' }, { l: 'Team Size', v: startup.teamSize, c: '#7B2FFF' }].map(s => (
                            <div key={s.l} className="rounded-xl bg-muted p-3 text-center border border-border"><p className="text-base font-bold" style={{ color: s.c }}>{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>
                        ))}
                    </div>
                        <div className="space-y-4">
                        <div className="bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl p-4 mb-6">
                            <h5 className="text-xs font-bold text-cyan-600 dark:text-brand-cyan uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Pitch Scheduling
                            </h5>
                            {startup.pitchDate ? (
                                <p className="text-sm text-foreground mb-3">Scheduled for: <span className="font-bold">{new Date(startup.pitchDate).toLocaleString()}</span></p>
                            ) : (
                                <p className="text-sm text-muted-foreground mb-3">No pitch date scheduled yet.</p>
                            )}
                            <div className="flex gap-2">
                                <DateTimePicker
                                    date={pitchDate ? new Date(pitchDate) : (startup.pitchDate ? new Date(startup.pitchDate) : undefined)}
                                    setDate={(d) => {
                                        if (!d) {
                                            setPitchDate('');
                                            return;
                                        }
                                        setPitchDate(d.toISOString());
                                    }}
                                    className="flex-1"
                                />
                                <Button
                                    disabled={!pitchDate}
                                    onClick={async () => {
                                        if (!startup.lastApplicationId) {
                                            toast.error('No application found for this startup');
                                            return;
                                        }
                                        
                                        try {
                                            await api.schedulePitch(startup.lastApplicationId, new Date(pitchDate));
                                            
                                            const updatedStartup = { ...startup, pitchDate };
                                            setStartup(updatedStartup);
                                            toast.success('Pitch scheduled successfully');
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to schedule pitch');
                                        }
                                    }}
                                    className="!px-3 !py-2 !h-9 !text-xs"
                                >
                                    Schedule
                                </Button>
                            </div>
                        </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Button 
                            className="!py-3 !text-sm"
                            onClick={() => {
                                const updatedStartup = { ...startup, status: 'Active' as const };
                                setStartup(updatedStartup);
                                toast.success('Startup Approved');
                            }}
                        >
                            <CheckCircle className="h-4 w-4" /> Approve
                        </Button>
                        <Button 
                            variant="ghost"
                            className="!py-3 !text-sm border border-border bg-card/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            onClick={() => {
                                const updatedStartup = { ...startup, status: 'Rejected' as const };
                                setStartup(updatedStartup);
                                toast.error('Startup Declined');
                            }}
                        >
                            <X className="h-4 w-4" /> Decline
                        </Button>
                    </div>
                </div>
                </div>
            </div>
        </motion.div>
    );
}

export function StartupsSection() {
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('All');
    const [eventFilter, setEventFilter] = useState('All');
    const [selectedStartup, setSelectedStartup] = useState<any | null>(null);
    const [allStartups, setAllStartups] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [startupData, eventData] = await Promise.all([
                    api.getStartups(),
                    api.getEvents()
                ]);
                
                setEvents(eventData);

                const formatted = startupData.map((summary: any) => {
                    const s = summary.startup;
                    return {
                        id: s.startupId,
                        name: s.projectName,
                        founderName: s.primaryFounderName,
                        industry: s.businessSector,
                        stage: s.startupStage || 'Idea',
                        status: s.startupStatus === 'DRAFT' ? 'Pending' : (s.startupStatus === 'ACTIVE' ? 'Active' : s.startupStatus || 'Pending'),
                        progress: s.overallProgressPct || s.developerProgressPct || 0,
                        funding: s.totalFundingRaised ? `$${s.totalFundingRaised}` : '$0',
                        teamSize: s.currentTeamSize || 1,
                        logo: s.projectName?.charAt(0) || 'S',
                        description: s.companyTagline || s.rawDescription || '',
                        pitchVideoUrl: s.pitchVideoLink,
                        appliedEventTitles: summary.appliedEventTitles || [],
                        appliedEventIds: summary.appliedEventIds || [],
                        lastStatus: summary.lastApplicationStatus,
                        lastApplicationId: summary.lastApplicationId,
                        pitchDate: summary.lastPitchDate || s.pitchDate, // We could also add lastPitchDate to summary
                        metrics: [],
                        milestones: [],
                        members: [{ name: s.primaryFounderName, role: 'Founder', avatar: s.primaryFounderName?.charAt(0) || 'F' }]
                    };
                });
                setAllStartups(formatted);
            } catch (err) {
                toast.error('Failed to load dashboard data');
            }
        };
        fetchData();
    }, []);

    const filtered = allStartups.filter(s => {
        const name = s.name || '';
        const industry = s.industry || '';
        const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                           industry.toLowerCase().includes(search.toLowerCase());
        const matchStage = stageFilter === 'All' || s.stage === stageFilter;
        const matchEvent = eventFilter === 'All' || s.appliedEventIds.includes(eventFilter);
        return matchSearch && matchStage && matchEvent;
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex items-center justify-between bg-card border border-border rounded-2xl p-6 shadow-sm"
            >
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Startup Portfolio</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Track and manage incubated startups</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Startups', value: allStartups.length, icon: TrendingUp, gradient: 'from-brand-cyan to-brand-blue' },
                    { label: 'Active', value: allStartups.filter(s => s.status === 'Active').length, icon: CheckCircle, gradient: 'from-brand-teal to-brand-sky' },
                    { label: 'Total Funding', value: `$${(allStartups.reduce((acc, s) => acc + (parseFloat(String(s.funding).replace('$', '')) || 0), 0) / 1000).toFixed(0)}K`, icon: DollarSign, gradient: 'from-brand-purple to-brand-cyan' },
                    { label: 'Team Members', value: allStartups.reduce((a, s) => a + s.teamSize, 0), icon: Users, gradient: 'from-brand-purple to-brand-cyan' },
                ].map((stat, i) => (
                    <motion.div 
                        key={stat.label} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1 + i * 0.06 }}
                        whileHover={{ y: -5, filter: 'brightness(1.1)' }}
                        className="group relative rounded-2xl p-6 transition-all cursor-default overflow-hidden bg-card border border-border shadow-sm"
                    >
                        {/* Bottom Accent Glow */}
                        <div className={`absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-40 blur-sm`} />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{stat.label}</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 shadow-inner group-hover:bg-primary/10 transition-colors">
                                    <stat.icon className="h-4.5 w-4.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent drop-shadow-sm`}>{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Search startups..." value={search} onChange={e => setSearch(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 transition-all" />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <select 
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 appearance-none"
                        >
                            <option value="All">All Events</option>
                            {events.map(ev => (
                                <option key={ev.id || ev.eventId} value={ev.id || ev.eventId}>{ev.title}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rotate-90 text-muted-foreground pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shrink-0">
                        <Filter className="ml-2 h-3 w-3 text-muted-foreground" />
                        {['All', 'Idea', 'Pre-Seed', 'Seed'].map(s => (
                            <button key={s} onClick={() => setStageFilter(s)}
                                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all duration-200 ${stageFilter === s ? 'bg-brand-cyan text-brand-navy shadow-sm shadow-brand-cyan/30' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}>{s}</button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(startup => (
                    <motion.div key={startup.id} variants={cardItem}
                        whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,229,255,0.06)' }}
                        className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-border/80">
                        <div className="flex items-start gap-4 p-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 text-lg font-bold text-cyan-600 dark:text-brand-cyan ring-2 ring-brand-cyan/10 group-hover:ring-brand-cyan/25 transition-all">{startup.logo}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2"><h3 className="truncate text-base font-bold text-foreground">{startup.name}</h3><StageBadge stage={startup.stage} /></div>
                                <p className="text-sm text-muted-foreground">{startup.industry}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <StatusDot status={startup.status} />
                                    {startup.appliedEventTitles.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {startup.appliedEventTitles.map((title: string, idx: number) => (
                                                <span key={idx} className="bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/10">
                                                    {title}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mx-5 mb-4">
                            <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-muted-foreground">Progress</span><span className="text-xs font-semibold text-foreground">{startup.progress}%</span></div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/5"><div className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal transition-all duration-700" style={{ width: `${startup.progress}%` }} /></div>
                        </div>
                        <div className="mx-5 mb-4 grid grid-cols-4 gap-2">
                            {(startup.metrics || []).map((m: any) => (
                                <div key={m.label} className="rounded-xl bg-muted p-2 text-center border border-border"><p className="text-xs font-bold text-foreground">{m.value}</p><p className="text-[9px] text-muted-foreground">{m.label}</p></div>
                            ))}
                        </div>
                        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{startup.teamSize} members</span></div>
                            <Button 
                                variant="ghost"
                                onClick={() => setSelectedStartup(startup)}
                                className="!px-3 !py-1.5 !text-xs group/btn !h-8"
                            >
                                Details
                                <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <AnimatePresence>
                {selectedStartup && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-md" onClick={() => setSelectedStartup(null)} />
                        <StartupDetailPanel startup={selectedStartup} onClose={() => setSelectedStartup(null)} />
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
