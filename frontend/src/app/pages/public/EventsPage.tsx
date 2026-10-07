import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, ArrowRight, Bell, Lock, Sparkles, Loader2, Check } from 'lucide-react';
import { Navigation } from '../../components/layout/Navigation';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Footer } from '../../components/layout/Footer';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { FadeInSection } from '../../components/effects/FadeInSection';
import { Button } from '../../components/common/Button';
import { AuthInterceptModal } from '../../components/auth/AuthInterceptModal';
import { api } from '../../services/api';
import { toast } from 'sonner';


type FilterType = 'All' | 'Hackathon' | 'Bootcamp' | 'Workshop' | 'Masterclass' | 'Summit' | 'Competition';

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    Hackathon:   { bg: 'bg-accent/15',          text: 'text-accent',                           border: 'border-accent/30' },
    Workshop:    { bg: 'bg-brand-cyan/10',        text: 'text-cyan-500 dark:text-brand-cyan',    border: 'border-brand-cyan/30' },
    Bootcamp:    { bg: 'bg-emerald-500/15',      text: 'text-emerald-500',                     border: 'border-emerald-500/30' },
    Competition: { bg: 'bg-amber-500/15',        text: 'text-amber-500',                       border: 'border-amber-500/30' },
    Masterclass: { bg: 'bg-purple-500/15',       text: 'text-purple-500',                      border: 'border-purple-500/30' },
    Summit:      { bg: 'bg-rose-500/15',         text: 'text-rose-500',                        border: 'border-rose-500/30' },
};

const statusConfig: Record<string, { label: string; color: string; glow: string }> = {
    Open: { label: 'Open', color: 'bg-brand-mint/20 text-emerald-600 dark:text-brand-mint border-brand-mint/30', glow: 'shadow-[0_0_12px_rgba(0,245,160,0.15)]' },
    'Coming Soon': { label: 'Coming Soon', color: 'bg-brand-purple/15 text-purple-600 dark:text-brand-purple border-brand-purple/30', glow: 'shadow-[0_0_12px_rgba(123,47,255,0.15)]' },
    Closed: { label: 'Closed', color: 'bg-foreground/5 text-muted-foreground border-border', glow: '' },
};

export function EventsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isPublicView = searchParams.get('view') === 'public';

    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [profileName, setProfileName] = useState('Founder');
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const isAdmin = (localStorage.getItem('userRole') || '').toUpperCase() === 'ADMIN';
    const [myEventMetadata, setMyEventMetadata] = useState<Record<string, { status: string, appId?: string }>>({});


    useEffect(() => {
        const actuallyLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(isPublicView ? false : actuallyLoggedIn);
        setProfileName(localStorage.getItem('userName') || 'Founder');

        const fetchEvents = async () => {
            setIsLoading(true);
            setLoadError(false);
            try {
                const data = await api.getEvents();
                setEventsList(data.map((e: any) => ({
                    ...e,
                    id: String(e.eventId ?? e.id ?? ''), // Normalize ID
                    eventType: e.eventType || e.event_type || 'SIMPLE', // Normalize eventType
                    type: e.category || e.eventCategory || e.type || 'Other', // Map category to type safely
                    date: e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBD',
                    status: e.status === 'ACTIVE' ? 'Open' : (e.status === 'DRAFT' ? 'Coming Soon' : 'Closed')
                })));

                // Fetch user registrations to show "Registered" state
                if (actuallyLoggedIn) {
                    try {
                        const [apps, regs] = await Promise.all([
                            api.getMyApplications().catch(() => []),
                            api.getMyRegistrations().catch(() => [])
                        ]);
                        const metadata: Record<string, { status: string, appId?: string }> = {};
                        apps.forEach((a: any) => {
                            if (a.targetEventId != null) {
                                metadata[String(a.targetEventId)] = { 
                                    status: a.applicationStatus || a.status || 'Pending',
                                    appId: a.applicationId 
                                };
                            }
                        });
                        regs.forEach((r: any) => { 
                            const eid = r.eventId || r.event?.eventId || r.event?.id || r.targetEventId;
                            if(eid && !metadata[String(eid)]) {
                                metadata[String(eid)] = { status: 'Registered' }; 
                            }
                        });
                        setMyEventMetadata(metadata);
                    } catch (e) { console.error('Error fetching user event status', e); }
                }
            } catch (error) {
                console.error('Failed to load events:', error);
                setLoadError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, [isPublicView, reloadKey]);


    const filters: FilterType[] = ['All', 'Hackathon', 'Bootcamp', 'Workshop', 'Masterclass', 'Summit', 'Competition'];

    const filteredEvents = activeFilter === 'All'
        ? eventsList
        : eventsList.filter((e) => e.type === activeFilter);

    const handleApply = async (event: any) => {
        if (isAdmin) {
            // Admins do not apply to events; they manage them
            navigate('/admin/events');
            return;
        }
        try {
            const eventId = String(event.id ?? event.eventId ?? '');
            const eventType = (event.eventType || event.event_type || 'SIMPLE').toUpperCase();
            
            // Consistent login check with RequireAuth
            const actuallyLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

            if (eventType === 'SIMPLE') {
                // Simple events (trainings, club days...) need neither an account nor a startup:
                // name + email + the event questions are enough.
                let hasQuestions = false;
                if (event.formFieldsJson) {
                    try {
                        const parsed = JSON.parse(event.formFieldsJson);
                        hasQuestions = parsed && parsed.length > 0;
                    } catch (e) { console.error('Form fields parse error', e); }
                }

                const userEmail = localStorage.getItem('userEmail') || '';
                if (hasQuestions || !actuallyLoggedIn || !userEmail) {
                    navigate(`/events/${eventId}/register`);
                } else {
                    // Logged-in user and no questions: register in one click
                    setIsRegistering(true);
                    try {
                        const userName = localStorage.getItem('userName') || 'User';
                        await api.registerForSimpleEvent(eventId, userName, userEmail);
                        setMyEventMetadata(prev => ({ ...prev, [eventId]: { status: 'Registered' } }));
                        toast.success(`You have successfully registered for ${event.title}!`);
                    } catch (regError: any) {
                        toast.error(regError.message || 'Registration failed');
                    } finally {
                        setIsRegistering(false);
                    }
                }
                return;
            }

            // Incubation / pitch events: an account is required, the startup is chosen or created on the application page
            if (!actuallyLoggedIn) {
                setSelectedEvent({ id: eventId, title: event.title, date: event.date, eventType: eventType });
                setAuthModalOpen(true);
                return;
            }

            if (eventId) {
                navigate(`/events/${eventId}/apply`);
            } else {
                toast.error('Invalid event ID. Please refresh the page.');
            }
        } catch (error) {
            console.error('Apply error:', error);
            toast.error('An error occurred. Please try again.');
        }
    };


    // ── "Notify me" on coming-soon events ──
    // Events this visitor is waiting for: from the server when logged in, from this browser for guests
    const GUEST_KEY = 'qa_notify_events';
    const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
    const [notifyFor, setNotifyFor] = useState<any | null>(null);
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifyBusy, setNotifyBusy] = useState(false);
    const isUser = isLoggedIn && !isAdmin;

    useEffect(() => {
        if (isUser) {
            api.getMyEventSubscriptions().then(ids => setSubscribed(new Set(ids))).catch(() => {});
        } else {
            try { setSubscribed(new Set(JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'))); } catch { /* storage unavailable */ }
        }
    }, [isUser]);

    const markSubscribed = (eventId: string) => {
        setSubscribed(prev => {
            const next = new Set(prev).add(eventId);
            if (!isUser) {
                try { localStorage.setItem(GUEST_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
            }
            return next;
        });
    };

    const subscribe = async (event: any, email?: string) => {
        setNotifyBusy(true);
        try {
            await api.notifyMeWhenOpen(event.id, email);
            markSubscribed(event.id);
            setNotifyFor(null);
            toast.success(`We'll email you when "${event.title}" opens.`);
        } catch (e: any) {
            toast.error(e.message || 'Could not save your request');
        } finally {
            setNotifyBusy(false);
        }
    };

    const handleNotify = (event: any) => {
        if (isUser) {
            subscribe(event); // uses the account email
        } else {
            setNotifyEmail('');
            setNotifyFor(event);
        }
    };


    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            {isLoggedIn ? (
                <DashboardHeader activeTab="events" profileName={profileName} />
            ) : (
                <Navigation />
            )}

            {!isLoggedIn && (
                <section className="relative z-10 pt-32 pb-16 px-6">
                    <div className="relative max-w-6xl mx-auto text-center rounded-3xl p-12 lg:p-16 border border-border/50 bg-card/40"
                        style={{ boxShadow: '0 20px 80px rgba(0, 229, 255, 0.1)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-50 rounded-3xl" />
                        <FadeInSection variant="fade-up">
                            <p className="uppercase tracking-[0.25em] text-xs text-muted-foreground mb-4 font-medium">
                                Q-AI Hub Events
                            </p>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground">
                                Upcoming Events & Programs
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Explore hackathons, workshops, and talks. Apply to events that match
                                your interests and accelerate your journey.
                            </p>
                        </FadeInSection>
                    </div>
                </section>
            )}

            {/* Filter Tabs */}
            <section className={`relative z-10 px-6 ${isLoggedIn ? 'pt-24 pb-8' : 'pb-8'}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-wrap justify-center gap-3">
                        {filters.map((filter) => (
                            <motion.button
                                key={filter}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 ${activeFilter === filter
                                    ? 'bg-foreground/10 border-foreground/30 text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                                    : 'bg-transparent border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                                    }`}
                            >
                                {filter}
                                {filter !== 'All' && (
                                    <span className="ml-2 text-xs opacity-60">
                                        {eventsList.filter((e) => e.type === filter).length}
                                    </span>

                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Events Grid */}
            <section className="relative z-10 px-6 pb-32">
                <div className="max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeFilter}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {isLoading ? (
                                <div className="col-span-full flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : loadError ? (
                                <div className="col-span-full flex flex-col items-center text-center py-20 gap-4">
                                    <p className="text-foreground font-medium">We couldn't load the events.</p>
                                    <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
                                    <button
                                        onClick={() => setReloadKey(k => k + 1)}
                                        className="px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : filteredEvents.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-muted-foreground">
                                    {activeFilter === 'All'
                                        ? 'No events are published yet. Come back soon!'
                                        : `No ${activeFilter.toLowerCase()} events right now.`}
                                </div>
                            ) : (
                                filteredEvents.map((event, index) => {
                                    const typeStyle = typeColors[event.type] || typeColors['Competition'];
                                    const status = statusConfig[event.status] || statusConfig['Closed'];
                                    return (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: index * 0.08 }}
                                            whileHover={{ y: -4, scale: 1.01 }}
                                            className="group"
                                        >
                                            <div className="h-full p-px rounded-2xl bg-gradient-to-br from-foreground/10 via-transparent to-foreground/5 hover:from-foreground/15 hover:to-foreground/5 transition-all duration-500">
                                                <div className="relative h-full rounded-[calc(1rem-1px)] p-6 flex flex-col border border-border/40 bg-card/50 group-hover:border-primary/20 transition-all duration-500 shadow-sm">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent rounded-[calc(1rem-1px)]" />
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                                                            <Sparkles size={12} />
                                                            {event.type}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${status.color} ${status.glow}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-foreground/90 transition-colors leading-tight">
                                                        {event.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-grow">
                                                        {event.description || 'Join us for an exciting event focused on innovation and entrepreneurship.'}
                                                    </p>
                                                    <div className="space-y-2 mb-6">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Calendar size={14} className="text-foreground/40" />
                                                            <span>{event.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin size={14} className="text-foreground/40" />
                                                            <span>{event.location || 'Online'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-auto">
                                                        {myEventMetadata[String(event.id)] ? (
                                                            (() => {
                                                                const meta = myEventMetadata[String(event.id)];
                                                                const status = meta.status || 'Registered';
                                                                const isAccepted = status.toLowerCase() === 'accepted';
                                                                
                                                                return (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            navigate(`/dashboard?tab=applications&eventId=${encodeURIComponent(String(event.id))}`);
                                                                        }}
                                                                        className={`relative z-10 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98] ${
                                                                            isAccepted 
                                                                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' 
                                                                                : 'bg-foreground/10 border border-border text-foreground hover:bg-foreground/15'
                                                                        }`}
                                                                    >
                                                                        <Sparkles size={16} /> 
                                                                        {isAccepted ? 'View my application' : status}
                                                                    </button>
                                                                );
                                                            })()
                                                        ) : event.status === 'Open' ? (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleApply(event);
                                                                }} 
                                                                className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all cursor-pointer shadow-sm hover:shadow-primary/5 active:scale-[0.98]"
                                                            >
                                                                {isAdmin ? 'Manage Event' : 'Apply Now'} <ArrowRight size={16} />
                                                            </button>
                                                        ) : event.status === 'Coming Soon' ? (
                                                            subscribed.has(event.id) ? (
                                                                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                                    <Check size={16} /> You'll be notified
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => handleNotify(event)} disabled={notifyBusy}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground/5 border border-border text-foreground/80 text-sm font-semibold hover:bg-foreground/10 transition-all disabled:opacity-60">
                                                                    <Bell size={16} /> Notify me when it opens
                                                                </button>
                                                            )
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground/5 border border-border text-muted-foreground text-sm font-semibold">
                                                                <Lock size={14} /> Registration Closed
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            <Footer />

            {/* Auth Modal for Apply */}
            <AuthInterceptModal
                isOpen={authModalOpen}
                onClose={() => {
                    setAuthModalOpen(false);
                    setSelectedEvent(null);
                }}
                eventName={selectedEvent?.title}
                eventDate={selectedEvent?.date}
                returnUrl={selectedEvent ? `/events/${selectedEvent.id}/apply` : undefined}
            />

            {/* Guest "Notify me": ask for an email */}
            <AnimatePresence>
                {notifyFor && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
                        onClick={() => setNotifyFor(null)}>
                        <motion.form initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                            role="dialog" aria-modal="true" aria-labelledby="notify-title"
                            onClick={e => e.stopPropagation()}
                            onSubmit={e => { e.preventDefault(); subscribe(notifyFor, notifyEmail.trim()); }}
                            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell size={18} /></div>
                                <h2 id="notify-title" className="text-lg font-semibold text-foreground">Get notified</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-5">
                                We'll send you one email when <span className="text-foreground font-medium">{notifyFor.title}</span> opens.
                            </p>
                            <label htmlFor="notify-email" className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Email</label>
                            <input id="notify-email" type="email" required autoFocus value={notifyEmail}
                                onChange={e => setNotifyEmail(e.target.value)} placeholder="your@email.com"
                                className="w-full px-4 py-3 bg-muted/30 rounded-xl border border-border text-foreground text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                            <div className="flex gap-3 mt-5">
                                <button type="button" onClick={() => setNotifyFor(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-foreground/5">Cancel</button>
                                <button type="submit" disabled={notifyBusy}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
                                    {notifyBusy ? 'Saving…' : 'Notify me'}
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>

            {isRegistering && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-xl flex items-center gap-4">
                        <Loader2 className="animate-spin text-primary" />
                        <span className="font-medium text-foreground">Processing registration...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
