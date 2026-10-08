import { useState, useEffect } from 'react';
import { Search, MapPin, CalendarDays, Users, X, ArrowLeft, Eye, CheckCircle2, TrendingUp, UserPlus, Pencil, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../services/api';
import { Button } from '../../common/Button';
import { PhasesManager } from '../PhasesManager';
import { toast } from 'sonner';
import { StatusBadge } from './shared';
import { ApplicantPanel } from './ApplicantPanel';

export function EventDetail({ event, onBack, navigate, onStartPitch }: { event: any; onBack: () => void; navigate: (path: string) => void; onStartPitch: (id: string) => void }) {
    const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
    const [searchApplicant, setSearchApplicant] = useState('');
    const [allApplicants, setAllApplicants] = useState<any[]>([]);
    const [eventStats, setEventStats] = useState<any>(null);
    const [simpleRegistrations, setSimpleRegistrations] = useState<any[]>([]);
    const [isActing, setIsActing] = useState(false);

    // Fetch event stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await api.getEventStats(String(event.id));
                setEventStats(stats);
            } catch (_) {
                // Stats may not be available yet
            }
        };
        fetchStats();
    }, [event.id]);

    // Fetch SIMPLE registrations if applicable
    useEffect(() => {
        if (event.eventType === 'SIMPLE') {
            const fetchRegs = async () => {
                try {
                    const regs = await api.getEventRegistrations(String(event.id));
                    setSimpleRegistrations(regs);
                } catch (_) {}
            };
            fetchRegs();
        }
    }, [event.id, event.eventType]);

    // Phases are managed by PhasesManager component — no separate fetch needed

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const apps = await api.getApplicationsByEvent(event.id);
                const formatted = apps.map((data: any) => {
                    let parsedAnswers: any = {};
                    try {
                        if (data.initialApplicationAnswers) {
                            parsedAnswers = JSON.parse(data.initialApplicationAnswers);
                        }
                    } catch (e) {
                        console.warn('Failed to parse answers', e);
                    }

                    return {
                        id: data.applicationId || data.id,
                        userId: data.applicantUserId || 'user',
                        name: data.founderName || 'Founder',
                        email: data.founderEmail || '',
                        startup: data.startupName || data.projectName || parsedAnswers.projectName || 'Unnamed Startup',
                        avatar: (data.startupName || data.projectName || parsedAnswers.projectName || 'U')[0].toUpperCase(),
                        status: (data.applicationStatus || data.status || 'PENDING'),
                        submittedAt: data.applicationSubmittedAt
                            ? new Date(data.applicationSubmittedAt).toLocaleDateString()
                            : 'Recent',
                        answers: [
                            { question: 'Project Tagline', answer: parsedAnswers.companyTagline || data.tagline || 'N/A', type: 'text' },
                            { question: 'Sector', answer: parsedAnswers.businessSector || data.sector || 'N/A', type: 'text' },
                            { question: 'Pitch', answer: parsedAnswers.rawDescription || parsedAnswers.pitch || data.pitchOriginal || data.description || 'N/A', type: 'text' },
                            { question: 'GitHub', answer: parsedAnswers.githubUrl || data.githubUrl || 'N/2', type: 'url' },
                            { question: 'Website', answer: parsedAnswers.companyWebsiteUrl || parsedAnswers.website || 'N/A', type: 'url' },
                            { question: 'Team Size', answer: parsedAnswers.currentTeamSize || parsedAnswers.teamSize || 'N/A', type: 'text' },
                            { question: 'Tech Stack', answer: Array.isArray(parsedAnswers.techStack) ? parsedAnswers.techStack.join(', ') : (parsedAnswers.techStack || 'N/A'), type: 'text' },
                        ],
                        questionnaireAnswers: data.questionnaireAnswers,
                        milestones: data.milestones || [],
                        pitchDate: data.pitchDate,
                        rawAnswers: parsedAnswers // Keep raw answers for more detailed display if needed
                    };
                });
                setAllApplicants(formatted);
            } catch (err) {
                console.error(err);
            }
        };
        fetchApps();
    }, [event.id]);

    const filtered = allApplicants.filter(a => a.name.toLowerCase().includes(searchApplicant.toLowerCase()) || a.startup.toLowerCase().includes(searchApplicant.toLowerCase()));

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div>
                <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"><ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />Back to Events</button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-border">
                            <img src={event.image} alt={event.title} className="h-full w-full object-cover" crossOrigin="anonymous" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{event.title}</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan/60" />{event.date}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan/60" />{event.location}</span>
                                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan/60" />{allApplicants.length} Applicants</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Admin status controls */}
                        {event.status === 'Upcoming' && (
                            <Button
                                variant="outline"
                                disabled={isActing}
                                onClick={async () => {
                                    setIsActing(true);
                                    try {
                                        await api.activateEvent(String(event.id));
                                        toast.success('Event activated!');
                                        onBack();
                                    } catch (e: any) { toast.error(e.message || 'Failed'); }
                                    setIsActing(false);
                                }}
                                className="!px-4 !py-2 !text-sm border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Activate
                            </Button>
                        )}
                        {event.status === 'Open' && (
                            <>
                                <Button
                                    variant="outline"
                                    disabled={isActing}
                                    onClick={async () => {
                                        setIsActing(true);
                                        try {
                                            await api.advanceEventPhase(String(event.id));
                                            toast.success('Phase advanced!');
                                            onBack();
                                        } catch (e: any) { toast.error(e.message || 'Failed'); }
                                        setIsActing(false);
                                    }}
                                    className="!px-4 !py-2 !text-sm border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                >
                                    <TrendingUp className="h-4 w-4" /> Advance Phase
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={isActing}
                                    onClick={async () => {
                                        setIsActing(true);
                                        try {
                                            await api.closeEvent(String(event.id));
                                            toast.success('Event closed.');
                                            onBack();
                                        } catch (e: any) { toast.error(e.message || 'Failed'); }
                                        setIsActing(false);
                                    }}
                                    className="!px-4 !py-2 !text-sm border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                >
                                    <X className="h-4 w-4" /> Close Event
                                </Button>
                            </>
                        )}
                        {event.eventType === 'INCUBATION' && (
                            <Button
                                variant="outline"
                                onClick={() => onStartPitch(event.id)}
                                className="!px-4 !py-2 !text-sm border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                Manage Pitch
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                            className="!px-4 !py-2 !text-sm border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                            <Pencil className="h-4 w-4" />
                            Modify Event
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                document.dispatchEvent(new CustomEvent('open-partner-modal', { detail: event.id }));
                            }}
                            className="!px-4 !py-2 !text-sm border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add Partner
                        </Button>
                    </div>
                </div>
            </div>

            {/* Overview */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-bold text-foreground">About this Event</h3>
                <p className="leading-relaxed text-foreground/70">{event.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                    {[{ l: 'Category', v: event.category, c: '#00E5FF' }, { l: 'Capacity', v: `${event.maxCapacity} spots`, c: '#00FFC2' }, { l: 'Status', v: event.status, c: '#00D9F5' }].map(s => (
                        <div key={s.l} className="rounded-xl bg-muted p-4 border border-border"><p className="text-xs text-muted-foreground">{s.l}</p><p className="mt-1 text-sm font-semibold" style={{ color: s.c }}>{s.v}</p></div>
                    ))}
                </div>
                {/* Event Stats */}
                {eventStats && (
                    <div className="mt-4 grid grid-cols-4 gap-3">
                        {[
                            { l: 'Total Applications', v: eventStats.totalApplications ?? allApplicants.length, c: '#00E5FF' },
                            { l: 'Accepted', v: eventStats.acceptedCount ?? allApplicants.filter(a => a.status === 'Accepted').length, c: '#00FFC2' },
                            { l: 'Pending', v: eventStats.pendingCount ?? allApplicants.filter(a => a.status === 'Pending').length, c: '#FFB800' },
                            { l: 'Rejected', v: eventStats.rejectedCount ?? allApplicants.filter(a => a.status === 'Rejected').length, c: '#FF4757' },
                        ].map(s => {
                            const val = typeof s.v === 'number' ? s.v : parseInt(String(s.v)) || 0;
                            return (
                                <div key={s.l} className="rounded-xl bg-muted p-3 border border-border">
                                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                                    <p className="mt-1 text-lg font-bold" style={{ color: s.c }}>{isNaN(val) ? 0 : val}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* Phases Management (only for INCUBATION events) */}
            {event.eventType === 'INCUBATION' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                    className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                    <PhasesManager eventId={event.id} eventType={event.eventType} />
                </motion.div>
            )}

            {/* SIMPLE Event Registrations */}
            {event.eventType === 'SIMPLE' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                    className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-500" /> Registrations ({simpleRegistrations.length})
                    </h3>
                    {simpleRegistrations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No registrations yet</p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-border">
                            <table className="w-full">
                                <thead><tr className="border-b border-border bg-muted">
                                    {['Name', 'Email', 'Registered', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {simpleRegistrations.map((r: any, i: number) => (
                                        <tr key={r.id || i} className="border-b border-border hover:bg-muted transition-colors">
                                            <td className="px-4 py-3 text-sm text-foreground">{r.participantName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{r.participantEmail || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : 'Recent'}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.deleteRegistration(r.id);
                                                            setSimpleRegistrations(prev => prev.filter((reg: any) => reg.id !== r.id));
                                                            toast.success('Registration removed');
                                                        } catch (e: any) { toast.error(e.message || 'Failed'); }
                                                    }}
                                                    className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Applicants Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Viewing <span className="font-semibold text-foreground">{allApplicants.length}</span> startups participating</p>
                    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input type="text" placeholder="Search startups or founders..." value={searchApplicant} onChange={e => setSearchApplicant(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 transition-all" />
                    </div>
                </div>
                {allApplicants.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No applications yet</p></div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <table className="w-full">
                            <thead><tr className="border-b border-border bg-muted">
                                {['Startup', 'Founder/Lead', 'Submitted', 'Status', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {filtered.map((a, i) => (
                                    <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                        className="border-b border-border hover:bg-muted transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10 text-xs font-bold text-cyan-600 dark:text-brand-cyan border border-brand-cyan/10">
                                                    {a.avatar || a.startup[0]}
                                                </div>
                                                <div className="font-semibold text-foreground text-sm">{a.startup}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div>
                                                <p className="text-sm font-medium text-foreground/80">{a.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{a.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.submittedAt}</td>
                                        <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Button
                                                variant="outline"
                                                onClick={() => setSelectedApplicant(a)}
                                                className="!px-3 !py-1.5 !text-xs"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Review
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {selectedApplicant && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-md" onClick={() => setSelectedApplicant(null)} />
                        <ApplicantPanel applicant={selectedApplicant} onClose={() => setSelectedApplicant(null)} />
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
