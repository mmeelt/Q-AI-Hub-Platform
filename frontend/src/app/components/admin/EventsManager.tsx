import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, MapPin, CalendarDays, Users, ArrowRight, Filter, X, UserPlus, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { InviteExpertsPanel } from './InviteExpertsPanel';
import { toast } from 'sonner';
import { container, cardItem } from './events/shared';
import { EventDetail } from './events/EventDetail';

export function EventsManager({ onStartPitch }: { onStartPitch: (id: string) => void }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [partneringEventId, setPartneringEventId] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await api.getAdminEvents();
                const formatted = data.map((e: any) => ({
                    id: e.id || e.eventId,
                    title: e.title,
                    date: e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBD',
                    location: e.location || 'Online',
                    category: e.category || e.eventCategory || 'Workshop',
                    applicants: e.participantCount ?? e.currentRegisteredCount ?? 0, // applications (incubation) or registrations (simple)
                    maxCapacity: e.maxParticipants || 50,
                    status: e.status === 'ACTIVE' ? 'Open' : e.status === 'DRAFT' ? 'Upcoming' : 'Closed',
                    image: e.coverImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
                    description: e.description || 'No description provided',
                    eventType: e.eventType,
                    hasPitch: e.hasPitch || false,
                }));
                setEventsList(formatted);

                // Auto-select event if reviewEvent param exists
                const reviewId = searchParams.get('reviewEvent');
                if (reviewId) {
                    const found = formatted.find((ev: any) => String(ev.id) === String(reviewId));
                    if (found) setSelectedEvent(found);
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load events');
            }
        };
        fetchEvents();
    }, []);

    // Sync search params when selectedEvent changes or is cleared
    useEffect(() => {
        if (selectedEvent) {
            setSearchParams({ reviewEvent: selectedEvent.id });
        } else {
            searchParams.delete('reviewEvent');
            setSearchParams(searchParams, { replace: true });
        }
    }, [selectedEvent]);

    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail) setPartneringEventId(e.detail);
        };
        document.addEventListener('open-partner-modal', handler);
        return () => document.removeEventListener('open-partner-modal', handler);
    }, []);

    const filtered = eventsList.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalApplicants = eventsList.reduce((a, e) => a + e.applicants, 0);
    const openCount = eventsList.filter(e => e.status === 'Open').length;

    return (
        <div className="flex flex-col gap-6">
            {selectedEvent ? (
                <EventDetail event={selectedEvent} onBack={() => {
                    setSelectedEvent(null);
                    setSearchParams({});
                }} navigate={navigate} onStartPitch={onStartPitch} />
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm"
            >
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Events Manager</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Manage and monitor all incubator events</p>
                </div>
                <Button
                    onClick={() => navigate('/admin/events/create')}
                    className="!px-5 !py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    Create New Event
                </Button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Events', value: eventsList.length, gradient: 'from-brand-cyan to-brand-blue' },
                    { label: 'Total Participants', value: totalApplicants, gradient: 'from-brand-teal to-brand-sky' },
                    { label: 'Open Events', value: openCount, gradient: 'from-brand-purple to-brand-cyan' },
                    { label: 'Avg per Event', value: eventsList.length > 0 ? Math.round(totalApplicants / eventsList.length) : 0, gradient: 'from-brand-cyan to-brand-sky' },
                ].map((stat, i) => (
                    <motion.div 
                        key={stat.label} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className="relative rounded-2xl p-6 transition-all cursor-default bg-card border border-border shadow-sm"
                    >
                        {/* Bottom Accent Glow */}
                        <div className={`absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-40 blur-sm`} />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{stat.label}</p>
                        <p className={`mt-2 text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent drop-shadow-sm`}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search + Filter */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto max-w-full self-start sm:self-auto">
                    <Filter className="ml-2 h-4 w-4 text-muted-foreground" />
                    {['All', 'Open', 'Upcoming', 'Closed'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${statusFilter === s ? 'neon-btn-gradient text-white shadow-sm shadow-cyan-500/30' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Event Cards */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(event => (
                    <motion.div key={event.id} variants={cardItem}
                        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,229,255,0.08)' }}
                        className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30">
                        <div className="relative h-44 overflow-hidden">
                            <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                            <div className="absolute left-3 top-3"><span className="rounded-lg bg-foreground/15 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">{event.category}</span></div>
                            <div className="absolute right-3 top-3">
                                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${event.status === 'Open' ? 'bg-brand-teal/80 text-background' : event.status === 'Upcoming' ? 'bg-brand-cyan/80 text-background' : 'bg-foreground/30 text-foreground/80'}`}>{event.status}</span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-base font-bold leading-tight text-foreground drop-shadow-lg">{event.title}</h3>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan/50" />{event.date}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan/50" />{event.location}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-cyan-600 dark:text-brand-cyan" /><span className="text-xs font-semibold text-foreground">{event.applicants}</span><span className="text-xs text-muted-foreground">/ {event.maxCapacity}</span></div>
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/5">
                                    <div className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal transition-all" style={{ width: `${Math.min((event.applicants / event.maxCapacity) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvent(event);
                                        setSearchParams({ reviewEvent: String(event.id) });
                                    }}
                                    className="!px-3 !py-2 !text-xs group/btn !h-9"
                                >
                                    Review
                                    <ArrowRight className="h-3.2 w-3.2 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/events/${event.id}/edit`);
                                    }}
                                    className="!px-3 !py-2 !text-xs group/btn !h-9 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                >
                                    <Pencil className="h-3.2 w-3.2" />
                                    Modify
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPartneringEventId(event.id);
                                    }}
                                    className="col-span-2 !px-4 !py-2.5 !text-xs group/btn !h-9 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Add Partner
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
            </motion.div>
            )}

            <AnimatePresence>
                {partneringEventId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/60 backdrop-blur-md"
                            onClick={() => setPartneringEventId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl"
                        >
                            <button
                                onClick={() => setPartneringEventId(null)}
                                className="absolute right-4 top-4 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <InviteExpertsPanel
                                eventId={partneringEventId}
                                onChange={() => {}}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
