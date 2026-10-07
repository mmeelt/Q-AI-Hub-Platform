import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ArrowRight, Users, FileText, Trophy, Clock, CheckCircle, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Phase2QuestionsEditor } from './Phase2QuestionsEditor';
import { PitchJudgingPanel } from '../pitch/PitchJudgingPanel';

interface Phase {
    phaseId: string;
    phaseName: string;
    phaseOrder: number;
    phaseActive: boolean;
    phaseLocked?: boolean;
    formFieldsJson?: string;
    phaseType?: 'QUESTIONNAIRE' | 'PITCH';
}

interface PhasesManagerProps {
    eventId: string | number;
    eventType: string;
}

export function PhasesManager({ eventId, eventType }: PhasesManagerProps) {
    const [phases, setPhases] = useState<Phase[]>([]);
    const [phaseStats, setPhaseStats] = useState<Record<string, { enrolled: number; submitted: number }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
    const [managingPitchPhase, setManagingPitchPhase] = useState<Phase | null>(null);

    useEffect(() => {
        if (eventType === 'INCUBATION') {
            loadPhases();
        }
    }, [eventId, eventType]);

    const loadPhases = async () => {
        try {
            const data = await api.getPhasesByEvent(String(eventId));
            setPhases(data);
            const statsEntries = await Promise.all(
                data.map(async (phase: Phase) => {
                    try {
                        const [submissions, draftCount] = await Promise.all([
                            api.getSubmissionsByPhase(phase.phaseId),
                            api.getDraftSubmissionCountByPhase(phase.phaseId),
                        ]);
                        return [phase.phaseId, {
                            enrolled: submissions.length + draftCount,
                            submitted: submissions.length,
                        }] as const;
                    } catch (_) {
                        return [phase.phaseId, { enrolled: 0, submitted: 0 }] as const;
                    }
                })
            );
            setPhaseStats(Object.fromEntries(statsEntries));
        } catch (error) {
            toast.error('Failed to load phases');
        } finally {
            setIsLoading(false);
        }
    };

    const activatePhase = async (phaseId: string) => {
        setIsUpdating(true);
        try {
            await api.activatePhase(phaseId as any);
            toast.success('Phase activated — accepted applicants have been notified');
            loadPhases();
        } catch (error: any) {
            toast.error(error.message || 'Failed to activate phase');
        } finally {
            setIsUpdating(false);
        }
    };

    const getPhaseIcon = (phaseOrder: number) => {
        switch (phaseOrder) {
            case 1: return FileText;
            case 2: return Users;
            case 3: return Trophy;
            default: return Clock;
        }
    };

    const deriveStatus = (phase: Phase): 'ACTIVE' | 'LOCKED' | 'DRAFT' => {
        if (phase.phaseLocked) return 'LOCKED';
        return phase.phaseActive ? 'ACTIVE' : 'DRAFT';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'DRAFT':
                return 'bg-muted/50 text-muted-foreground border-border';
            case 'LOCKED':
                return 'bg-red-500/15 text-red-500 border-red-500/30';
            default:
                return 'bg-muted/50 text-muted-foreground border-border';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE': return Play;
            case 'DRAFT': return Clock;
            case 'LOCKED': return AlertCircle;
            default: return AlertCircle;
        }
    };

    const highestActiveOrder = phases
        .filter((p) => p.phaseActive)
        .reduce((max, p) => Math.max(max, p.phaseOrder), 0);

    if (eventType !== 'INCUBATION') {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Clock size={48} className="mx-auto mb-4 opacity-30" />
                <p>Phase management is only available for incubation events</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Event Phases</h3>
                    <div className="text-sm text-muted-foreground">
                        {phases.filter(p => p.phaseActive).length} active phase
                    </div>
                </div>

                {phases.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                        <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground mb-4">No phases configured</p>
                        <p className="text-sm text-muted-foreground">
                            Phases are automatically created when the event is published
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {phases.map((phase, index) => {
                            const Icon = getPhaseIcon(phase.phaseOrder);
                            const effectivelyLocked = Boolean(phase.phaseLocked) || (highestActiveOrder > 0 && phase.phaseOrder < highestActiveOrder);
                            const status = effectivelyLocked ? 'LOCKED' : deriveStatus(phase);
                            const StatusIcon = getStatusIcon(status);
                            const isPitchPhase = phase.phaseType === 'PITCH';
                            const canEditQuestions = !effectivelyLocked && !isPitchPhase;

                            return (
                                <motion.div
                                    key={phase.phaseId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-card/50 border border-border rounded-xl p-6"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl border ${getStatusColor(status)}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-foreground">{phase.phaseName}</h4>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                                                        <StatusIcon size={12} />
                                                        {status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">Phase {phase.phaseOrder}</p>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {phaseStats[phase.phaseId]?.enrolled ?? 0} enrolled, {phaseStats[phase.phaseId]?.submitted ?? 0} submitted
                                                </p>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => window.location.href = `/admin/phases/${phase.phaseId}/submissions`}
                                                        className="text-xs gap-2 px-3 py-1.5 h-8"
                                                    >
                                                        <Users size={14} />
                                                        View Submissions
                                                    </Button>

                                                    {canEditQuestions && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setEditingPhase(phase)}
                                                            className="text-xs gap-2 px-3 py-1.5 h-8"
                                                        >
                                                            <Pencil size={14} />
                                                            Edit Questions
                                                        </Button>
                                                    )}

                                                    {isPitchPhase && phase.phaseOrder === 3 && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setManagingPitchPhase(phase)}
                                                            className="text-xs gap-2 px-3 py-1.5 h-8 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                                                        >
                                                            <Trophy size={14} />
                                                            Manage Rounds
                                                        </Button>
                                                    )}

                                                    {status === 'DRAFT' && (
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => activatePhase(phase.phaseId)}
                                                            disabled={isUpdating}
                                                            className="text-xs gap-2 px-3 py-1.5 h-8"
                                                        >
                                                            <Play size={14} />
                                                            Activate
                                                        </Button>
                                                    )}
                                                    {status === 'LOCKED' && (
                                                        <span className="text-xs px-3 py-1.5 h-8 inline-flex items-center rounded-md border border-red-500/30 text-red-500 bg-red-500/10">
                                                            Locked forever
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {phases.length > 1 && (
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                                                        style={{ width: `${(index / Math.max(phases.length - 1, 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {index + 1} of {phases.length}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editingPhase && (
                    <Phase2QuestionsEditor
                        phaseId={editingPhase.phaseId}
                        phaseName={editingPhase.phaseName}
                        onClose={() => setEditingPhase(null)}
                    />
                )}
                {managingPitchPhase && (
                    // Same judging screen as the Pitch tab: per-judge scores, average, send results
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setManagingPitchPhase(null)}>
                        <div className="w-full max-w-5xl my-8 bg-background border border-border rounded-2xl shadow-2xl p-6"
                            onClick={e => e.stopPropagation()}>
                            <PitchJudgingPanel eventId={String(eventId)} mode="admin" onBack={() => setManagingPitchPhase(null)} />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
