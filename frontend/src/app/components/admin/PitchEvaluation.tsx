import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PitchJudgingPanel } from '../pitch/PitchJudgingPanel';

// Admin pitch evaluation: pick an event, then manage rounds, score like any judge,
// see every judge's scores + the average, and send the results.
export function PitchEvaluation({ initialEventId, onBack }: { initialEventId?: string | null, onBack?: () => void }) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId || null);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!initialEventId);

    useEffect(() => {
        setSelectedEventId(initialEventId || null);
    }, [initialEventId]);

    useEffect(() => {
        if (selectedEventId) return;
        setIsLoading(true);
        api.getAdminEvents()
            .then(list => setEvents((list || []).filter((e: any) =>
                (e.eventType || '').toUpperCase() !== 'SIMPLE')))
            .catch(() => toast.error('Failed to load events'))
            .finally(() => setIsLoading(false));
    }, [selectedEventId]);

    if (selectedEventId) {
        return (
            <PitchJudgingPanel
                eventId={selectedEventId}
                mode="admin"
                onBack={() => (initialEventId && onBack ? onBack() : setSelectedEventId(null))}
            />
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-4">
                {onBack && (
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-foreground/5 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Select Event</h2>
                    <p className="text-muted-foreground">Choose an incubation event to manage its pitch evaluations</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : events.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No incubation events yet.</p>
            ) : (
                <div className="grid gap-4">
                    {events.map(event => {
                        const id = String(event.eventId ?? event.id);
                        return (
                            <div key={id} className="bg-card/40 backdrop-blur-xl border border-border rounded-2xl p-6 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-foreground/5"><Calendar size={20} /></div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">{event.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'} • {event.eventType}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEventId(id)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm">
                                    <Trophy size={14} /> Manage Pitches
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
