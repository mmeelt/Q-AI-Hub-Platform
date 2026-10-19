import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Users, FileText, Trophy, Clock, AlertCircle, Pencil, Plus, X } from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Phase2QuestionsEditor } from './Phase2QuestionsEditor';
import { PitchJudgingPanel } from '../pitch/PitchJudgingPanel';
import { useI18n } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/translations';

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
    const [isCreating, setIsCreating] = useState(false);
    const { t } = useI18n();

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
            toast.error(t('phases.loadFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const activatePhase = async (phaseId: string) => {
        setIsUpdating(true);
        try {
            await api.activatePhase(phaseId as any);
            toast.success(t('phases.activated'));
            loadPhases();
        } catch (error: any) {
            toast.error(error.message || t('phases.activateFailed'));
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
                <p>{t('phases.onlyIncubation')}</p>
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
                    <h3 className="text-lg font-semibold text-foreground">{t('phases.title')}</h3>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                            {t('phases.activeCount', { count: phases.filter(p => p.phaseActive).length })}
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreating(true)}
                            className="text-xs gap-2 px-3 py-1.5 h-8"
                        >
                            <Plus size={14} />
                            {t('phases.add')}
                        </Button>
                    </div>
                </div>

                {phases.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                        <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground mb-4">{t('phases.none')}</p>
                        <p className="text-sm text-muted-foreground">
                            {t('phases.noneHint')}
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
                                                        {t(`phases.status.${status}` as TranslationKey)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">{t('phases.phaseN', { order: phase.phaseOrder })}</p>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {t('phases.stats', { enrolled: phaseStats[phase.phaseId]?.enrolled ?? 0, submitted: phaseStats[phase.phaseId]?.submitted ?? 0 })}
                                                </p>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => window.location.href = `/admin/phases/${phase.phaseId}/submissions`}
                                                        className="text-xs gap-2 px-3 py-1.5 h-8"
                                                    >
                                                        <Users size={14} />
                                                        {t('phases.viewSubmissions')}
                                                    </Button>

                                                    {canEditQuestions && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setEditingPhase(phase)}
                                                            className="text-xs gap-2 px-3 py-1.5 h-8"
                                                        >
                                                            <Pencil size={14} />
                                                            {t('phases.editQuestions')}
                                                        </Button>
                                                    )}

                                                    {isPitchPhase && phase.phaseOrder === 3 && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setManagingPitchPhase(phase)}
                                                            className="text-xs gap-2 px-3 py-1.5 h-8 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                                                        >
                                                            <Trophy size={14} />
                                                            {t('phases.manageRounds')}
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
                                                            {t('phases.activate')}
                                                        </Button>
                                                    )}
                                                    {status === 'LOCKED' && (
                                                        <span className="text-xs px-3 py-1.5 h-8 inline-flex items-center rounded-md border border-red-500/30 text-red-500 bg-red-500/10">
                                                            {t('phases.lockedForever')}
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
                                                    {t('phases.progress', { index: index + 1, total: phases.length })}
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
                {isCreating && (
                    <CreatePhaseDialog
                        eventId={String(eventId)}
                        nextOrder={phases.reduce((max, p) => Math.max(max, p.phaseOrder), 0) + 1}
                        onClose={() => setIsCreating(false)}
                        onCreated={() => { setIsCreating(false); loadPhases(); }}
                    />
                )}
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

interface CreatePhaseDialogProps {
    eventId: string;
    nextOrder: number;
    onClose: () => void;
    onCreated: () => void;
}

// The new phase is appended after the last one and starts closed (DRAFT)
function CreatePhaseDialog({ eventId, nextOrder, onClose, onCreated }: CreatePhaseDialogProps) {
    const { t } = useI18n();
    const [phaseName, setPhaseName] = useState('');
    const [phaseType, setPhaseType] = useState<'QUESTIONNAIRE' | 'PITCH'>('QUESTIONNAIRE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phaseName.trim()) {
            setError(t('phases.form.nameRequired'));
            return;
        }
        if (startDate && endDate && endDate < startDate) {
            setError(t('phases.form.datesOrder'));
            return;
        }
        setIsSaving(true);
        try {
            const created = await api.createPhase(eventId, {
                phaseName: phaseName.trim(),
                phaseType,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            toast.success(t('phases.form.created', { name: created.phaseName }));
            onCreated();
        } catch (err: any) {
            toast.error(err.message || t('phases.form.failed'));
        } finally {
            setIsSaving(false);
        }
    };

    const fieldClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50';
    const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.form
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onSubmit={handleSubmit}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-phase-title"
                className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 id="create-phase-title" className="text-lg font-semibold text-foreground">{t('phases.form.title')}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{t('phases.form.subtitle', { order: nextOrder - 1 })}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('common.cancel')}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/5">
                        <X size={18} />
                    </button>
                </div>

                <div>
                    <label htmlFor="phase-name" className={labelClass}>{t('phases.form.name')}</label>
                    <input id="phase-name" autoFocus value={phaseName} maxLength={120}
                        onChange={e => { setPhaseName(e.target.value); setError(''); }}
                        placeholder={t('phases.form.namePlaceholder')} className={fieldClass} />
                </div>

                <div>
                    <label htmlFor="phase-type" className={labelClass}>{t('phases.form.type')}</label>
                    <select id="phase-type" value={phaseType}
                        onChange={e => setPhaseType(e.target.value as 'QUESTIONNAIRE' | 'PITCH')} className={fieldClass}>
                        <option value="QUESTIONNAIRE">{t('phases.form.typeQuestionnaire')}</option>
                        <option value="PITCH">{t('phases.form.typePitch')}</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="phase-start" className={labelClass}>{t('phases.form.start')}</label>
                        <input id="phase-start" type="date" value={startDate}
                            onChange={e => { setStartDate(e.target.value); setError(''); }} className={fieldClass} />
                    </div>
                    <div>
                        <label htmlFor="phase-end" className={labelClass}>{t('phases.form.end')}</label>
                        <input id="phase-end" type="date" value={endDate} min={startDate || undefined}
                            onChange={e => { setEndDate(e.target.value); setError(''); }} className={fieldClass} />
                    </div>
                </div>

                {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} size="sm">{t('common.cancel')}</Button>
                    <Button type="submit" variant="primary" disabled={isSaving} size="sm">
                        <Plus size={14} />
                        {isSaving ? t('phases.form.creating') : t('phases.form.create')}
                    </Button>
                </div>
            </motion.form>
        </motion.div>
    );
}
