import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, CalendarDays, MapPin, Users, Search, Eye, 
  Brain, Target, Sparkles, Clock, CheckCircle2, X, 
  Star, TrendingUp, Award, MessageSquare, ChevronDown, ChevronUp,
  FileText, Layers, BarChart2
} from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { PitchJudgingPanel } from '../../components/pitch/PitchJudgingPanel';
import { PitchVideo } from '../../components/common/PitchVideo';

// Backend statuses are upper-case (PENDING, ACCEPTED...); the UI shows them as 'Accepted', 'Under Review'...
const displayStatus = (raw?: string) => {
    const v = (raw || 'PENDING').replace(/_/g, ' ').toLowerCase();
    return v.replace(/(^|\s)\S/g, c => c.toUpperCase());
};

function StatusBadge({ status }: { status: string }) {
    const s: Record<string, string> = {
        Accepted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        Rejected: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20',
        Pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        'Under Review': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s[displayStatus(status)] || 'bg-foreground/10 text-foreground/70'}`}>
            {displayStatus(status)}
        </span>
    );
}

function ApplicantPanel({ applicant, onClose }: { applicant: any; onClose: () => void }) {
    const [showAllAnswers, setShowAllAnswers] = useState(false);
    let answers: Record<string, any> = {};
    try { answers = JSON.parse(applicant.initialApplicationAnswers || '{}'); } catch {}

    // The video is shown as a player below, not as a raw path
    const answerEntries = Object.entries(answers).filter(([k]) => !['teammates', 'pitchVideoLink'].includes(k));

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[620px] max-w-full flex-col border-l border-border bg-background/98 backdrop-blur-2xl shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center font-bold text-primary text-lg">
                        {(applicant.startupName || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">{applicant.startupName || 'Unnamed Startup'}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={applicant.applicationStatus || 'Pending'} />
                            <span className="text-xs text-muted-foreground font-mono">{applicant.trackingCode}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Event info */}
                <section className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm text-primary font-medium mb-1">
                        <Layers size={14} /> Event
                    </div>
                    <p className="text-foreground font-semibold">{applicant.eventTitle || 'Event'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {applicant.applicationSubmittedAt ? new Date(applicant.applicationSubmittedAt).toLocaleDateString() : 'N/A'}
                    </p>
                </section>

                {/* Application Answers */}
                {answers.pitchVideoLink && (
                    <section>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Pitch Video</h4>
                        <PitchVideo url={String(answers.pitchVideoLink)} />
                    </section>
                )}

                {answerEntries.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Brain size={12} /> Application Answers
                            </h4>
                            {answerEntries.length > 3 && (
                                <button
                                    onClick={() => setShowAllAnswers(!showAllAnswers)}
                                    className="text-xs text-primary flex items-center gap-1"
                                >
                                    {showAllAnswers ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {answerEntries.length}</>}
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {(showAllAnswers ? answerEntries : answerEntries.slice(0, 3)).map(([key, val]) => (
                                <div key={key} className="p-3 rounded-xl bg-muted/40 border border-border/50">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {typeof val === 'string' ? val : JSON.stringify(val)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Teammates */}
                {(() => {
                    let teammates: any[] = [];
                    try { teammates = JSON.parse(applicant.initialApplicationAnswers || '{}').teammates || []; } catch {}
                    if (!teammates.length) return null;
                    return (
                        <section>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Users size={12} /> Team Members
                            </h4>
                            <div className="space-y-2">
                                {teammates.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                                        <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                                            {(t.name || t.email || 'T')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{t.name || 'Team Member'}</p>
                                            {t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                                            {t.role && <p className="text-xs text-primary">{t.role}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })()}

                {/* Pitch Ratings */}
                <PitchRatingsSection applicationId={applicant.applicationId} />
            </div>
        </motion.div>
    );
}

function PitchRatingsSection({ applicationId }: { applicationId: string }) {
    const [ratings, setRatings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getStartupRatings(applicationId)
            .then(setRatings)
            .catch(() => setRatings([]))
            .finally(() => setLoading(false));
    }, [applicationId]);

    if (loading) return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent" />
            Loading evaluations...
        </div>
    );

    if (!ratings.length) return (
        <section>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star size={12} /> Pitch Evaluations
            </h4>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                <p className="text-sm text-muted-foreground">No evaluations yet</p>
            </div>
        </section>
    );

    const avgScore = ratings.reduce((sum, r) => sum + (r.totalScore || 0), 0) / ratings.length;

    return (
        <section>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star size={12} /> Pitch Evaluations
            </h4>
            <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Average Score</span>
                <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span className="font-bold text-lg text-primary">{avgScore.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
            </div>
            <div className="space-y-2">
                {ratings.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                                {r.evaluatedBy || `Evaluator ${i + 1}`}
                            </span>
                            <div className="flex items-center gap-1">
                                <Star size={12} className="text-amber-500 fill-amber-500" />
                                <span className="text-sm font-bold">{r.totalScore}</span>
                            </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.decision === 'PASSED' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                            {r.decision}
                        </span>
                        {r.feedback && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.feedback}</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ExpertEventPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<any>(null);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [phases, setPhases] = useState<any[]>([]);
    const [tab, setTab] = useState<'startups' | 'pitch'>('startups');

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const [eventData, appsData] = await Promise.all([
                    api.getEventById(id),
                    api.getApplicationsByEvent(id).catch(() => []),
                ]);
                setEvent(eventData);
                // appsData is now ApplicationResponse DTOs with startupName, eventTitle, etc.
                setApplicants(Array.isArray(appsData) ? appsData : []);

                // Try to load phases
                if (eventData?.id || eventData?.eventId) {
                    api.getPhasesByEvent(String(eventData.id || eventData.eventId))
                        .then(setPhases)
                        .catch(() => setPhases([]));
                }
            } catch (err: any) {
                toast.error('Failed to load event details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <ParticleBackground />
            <div className="relative z-10 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Loading event data...</p>
            </div>
        </div>
    );

    if (!event) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <p className="text-muted-foreground mb-4">Event not found</p>
                <Button onClick={() => navigate('/events')}>Back to Events</Button>
            </div>
        </div>
    );

    const statusOptions = ['All', 'Pending', 'Under Review', 'Accepted', 'Rejected'];
    const filtered = applicants.filter(a => {
        const matchSearch = (a.startupName || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.applicantUserId || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || displayStatus(a.applicationStatus) === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = [
        { label: 'Total Startups', value: applicants.length, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Users },
        { label: 'Accepted', value: applicants.filter(a => displayStatus(a.applicationStatus) === 'Accepted').length, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
        { label: 'Under Review', value: applicants.filter(a => displayStatus(a.applicationStatus) === 'Under Review').length, color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Clock },
        { label: 'Pending', value: applicants.filter(a => displayStatus(a.applicationStatus) === 'Pending').length, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: TrendingUp },
        { label: 'Phases', value: phases.length, color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Award },
    ];

    return (
        <div className="min-h-screen relative bg-background text-foreground">
            <ParticleBackground />

            {/* Header */}
            <div className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard"><Logo size="sm" /></Link>
                        <div className="h-5 w-px bg-border" />
                        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft size={15} /> Back to Events
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                            Expert View
                        </span>
                    </div>
                </div>
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                    {/* Event Hero */}
                    <div className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-card/60 border border-border backdrop-blur-xl">
                        <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden border border-border shrink-0 shadow-lg">
                            <img
                                src={event.coverImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <h1 className="text-3xl font-bold text-foreground leading-tight">{event.title}</h1>
                                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {event.eventType || 'EVENT'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                                {event.startDate && (
                                    <span className="flex items-center gap-1.5">
                                        <CalendarDays size={14} className="text-primary" />
                                        {new Date(event.startDate).toLocaleDateString()}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-primary" />
                                    {event.location || 'Online'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Users size={14} className="text-primary" />
                                    {applicants.length} participant{applicants.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {event.description && (
                                <p className="mt-3 text-sm text-foreground/70 leading-relaxed line-clamp-2">{event.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {stats.map(s => (
                            <div key={s.label} className={`p-4 ${s.bg} rounded-xl border border-border/50 flex flex-col gap-2`}>
                                <s.icon size={18} className={s.color} />
                                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Phases */}
                    {phases.length > 0 && (
                        <div className="p-5 rounded-2xl bg-card/60 border border-border">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Layers size={14} /> Event Phases
                            </h2>
                            <div className="flex gap-3 flex-wrap">
                                {phases.map((phase, i) => (
                                    <div key={i} className={`px-4 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 ${(phase.phaseActive || phase.isActive) ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                                        {(phase.phaseActive || phase.isActive) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                        {phase.phaseName || `Phase ${i + 1}`}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabs: startups review / pitch scoring (incubation events only) */}
                    {(event.eventType || '').toUpperCase() !== 'SIMPLE' && (
                        <div className="flex gap-2">
                            {([['startups', 'Participating Startups'], ['pitch', 'Pitch Evaluation']] as const).map(([key, label]) => (
                                <button key={key} onClick={() => setTab(key)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${tab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/60 border-border text-muted-foreground hover:text-foreground'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'pitch' && (
                        <PitchJudgingPanel eventId={String(event.eventId || event.id || id)} mode="expert" />
                    )}

                    {/* Startups Table */}
                    {tab === 'startups' && (
                    <div className="bg-card/60 border border-border rounded-2xl overflow-hidden backdrop-blur-xl">
                        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText size={18} className="text-primary" /> Participating Startups
                            </h2>
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Status Filter */}
                                <div className="flex gap-1">
                                    {statusOptions.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search startups..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-9 pr-4 py-1.5 bg-muted/50 border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-colors w-52"
                                    />
                                </div>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="text-center py-16 px-6">
                                <Users size={48} className="mx-auto mb-4 text-muted-foreground/40" />
                                <p className="text-muted-foreground font-medium">
                                    {applicants.length === 0 ? 'No startups have applied to this event yet' : 'No startups match your filter'}
                                </p>
                                <p className="text-sm text-muted-foreground/60 mt-1">
                                    {applicants.length === 0 ? 'Applications will appear here once submitted' : 'Try adjusting your search or filter'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                                            <th className="px-6 py-3">Startup</th>
                                            <th className="px-6 py-3">Tracking Code</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Submitted</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map(a => (
                                            <tr key={a.applicationId} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                                                            {(a.startupName || 'S')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-foreground">{a.startupName || 'Unnamed Startup'}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{a.applicantUserId?.slice(0, 8)}...</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                                                        {a.trackingCode || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={a.applicationStatus || 'Pending'} />
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {a.applicationSubmittedAt ? new Date(a.applicationSubmittedAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedApplicant(a)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                                    >
                                                        <Eye size={13} /> Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    )}

                </motion.div>
            </main>

            <AnimatePresence>
                {selectedApplicant && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                            onClick={() => setSelectedApplicant(null)}
                        />
                        <ApplicantPanel applicant={selectedApplicant} onClose={() => setSelectedApplicant(null)} />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
