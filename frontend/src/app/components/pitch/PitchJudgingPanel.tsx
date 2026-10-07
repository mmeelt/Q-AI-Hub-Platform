import { Fragment, useEffect, useState } from 'react';
import {
    ArrowLeft, Brain, Calendar, CheckCircle, ChevronDown, ChevronRight, ListOrdered,
    Plus, Send, Settings2, Star, Trash2, Trophy, Users, X, XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../services/api';

// Shared pitch judging UI.
//  - admin:  creates rounds, edits criteria, scores like any judge, sees every judge's
//            scores + the average (final score), and sends the results to the startups.
//  - expert: an expert invited to the event scores startups; only sees their own scores.

type Mode = 'admin' | 'expert';

interface PitchRound {
    id: number;
    roundNumber: number;
    roundName?: string;
    roundDate?: string;
    criteriaJson?: string;
    resultsSentAt?: string | null;
}

interface Criterion {
    key: string;
    label: string;
    maxPoints: number;
}

const PASS_RATIO = 0.6; // same rule as the backend: the average passes at 60% of the max

// Criteria come either from the backend defaults ({criterion, maxPoints}) or from the editor ({label, maxPoints})
export function parseCriteria(criteriaJson?: string): Criterion[] {
    if (!criteriaJson) return [];
    try {
        const parsed = JSON.parse(criteriaJson);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set<string>();
        return parsed.map((c: any, i: number) => {
            let label = String(c?.label || c?.criterion || c?.id || `Criterion ${i + 1}`).trim();
            if (seen.has(label)) label = `${label} (${i + 1})`;
            seen.add(label);
            return { key: label, label, maxPoints: Number(c?.maxPoints) > 0 ? Number(c.maxPoints) : 5 };
        });
    } catch {
        return [];
    }
}

const maxOf = (criteria: Criterion[]) => criteria.reduce((sum, c) => sum + c.maxPoints, 0);

const roundTitle = (r: PitchRound) => r.roundName ? `Round ${r.roundNumber} · ${r.roundName}` : `Round ${r.roundNumber}`;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-card/40 backdrop-blur-xl border border-border rounded-2xl p-6 ${className}`}>
            {children}
        </div>
    );
}

function DecisionBadge({ decision }: { decision?: string }) {
    const passed = decision === 'PASSED';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
            {decision || '—'}
        </span>
    );
}

export function PitchJudgingPanel({ eventId, mode, onBack }: { eventId: string; mode: Mode; onBack?: () => void }) {
    const isAdmin = mode === 'admin';
    const [isLoading, setIsLoading] = useState(true);
    const [pitchPhase, setPitchPhase] = useState<any>(null);
    const [rounds, setRounds] = useState<PitchRound[]>([]);
    const [view, setView] = useState<'rounds' | 'evaluate' | 'results'>('rounds');
    const [selectedRound, setSelectedRound] = useState<PitchRound | null>(null);

    const loadRounds = async () => {
        setIsLoading(true);
        try {
            const phases = await api.getPhasesByEvent(String(eventId));
            const phase = (phases || []).find((p: any) =>
                (p.phaseName || '').toLowerCase().includes('pitch') || p.phaseOrder === 3);
            setPitchPhase(phase || null);
            if (phase) {
                const list = await api.getPitchRoundsByPhase(phase.phaseId);
                setRounds((list || []).sort((a: PitchRound, b: PitchRound) => a.roundNumber - b.roundNumber));
            }
        } catch (e: any) {
            toast.error(e.message || 'Failed to load pitch rounds');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadRounds(); }, [eventId]);

    const createRound = async () => {
        if (!pitchPhase) return;
        try {
            const round = await api.addPitchRound(pitchPhase.phaseId);
            setRounds(prev => [...prev, round]);
            toast.success('Pitch round created');
        } catch (e: any) {
            toast.error(e.message || 'Failed to create round');
        }
    };

    const openRound = (round: PitchRound, next: 'evaluate' | 'results') => {
        setSelectedRound(round);
        setView(next);
    };

    const backToRounds = () => {
        setView('rounds');
        setSelectedRound(null);
        loadRounds();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                <p className="text-muted-foreground text-sm">Loading pitch rounds...</p>
            </div>
        );
    }

    if (!pitchPhase) {
        return (
            <Card>
                <div className="text-center py-8">
                    <Trophy size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">This event has no pitch phase.</p>
                    {onBack && (
                        <button onClick={onBack} className="mt-4 text-sm text-primary hover:text-primary/80">← Back</button>
                    )}
                </div>
            </Card>
        );
    }

    if (view === 'evaluate' && selectedRound) {
        return <EvaluateView round={selectedRound} mode={mode} onBack={backToRounds}
            onViewResults={isAdmin ? () => setView('results') : undefined} />;
    }

    if (view === 'results' && selectedRound && isAdmin) {
        return <ResultsView round={selectedRound} onBack={backToRounds} />;
    }

    return (
        <RoundsView
            rounds={rounds}
            mode={mode}
            onBack={onBack}
            onCreateRound={createRound}
            onEvaluate={r => openRound(r, 'evaluate')}
            onResults={r => openRound(r, 'results')}
            onCriteriaSaved={loadRounds}
        />
    );
}

// ── Rounds list ──────────────────────────────────────────────────────

function RoundsView({ rounds, mode, onBack, onCreateRound, onEvaluate, onResults, onCriteriaSaved }: {
    rounds: PitchRound[];
    mode: Mode;
    onBack?: () => void;
    onCreateRound: () => void;
    onEvaluate: (r: PitchRound) => void;
    onResults: (r: PitchRound) => void;
    onCriteriaSaved: () => void;
}) {
    const isAdmin = mode === 'admin';
    const [editing, setEditing] = useState<PitchRound | null>(null);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-lg hover:bg-foreground/5 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Pitch Evaluation</h2>
                        <p className="text-muted-foreground text-sm">
                            {isAdmin
                                ? 'Each judge scores separately. The final score is the average of all judges.'
                                : 'Score each startup. Your evaluation is private: the admin combines all judges and sends the results.'}
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <button onClick={onCreateRound}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        <Plus size={16} /> Create Round
                    </button>
                )}
            </div>

            {rounds.length === 0 ? (
                <Card>
                    <div className="text-center py-8">
                        <Calendar size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No pitch rounds yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            {isAdmin ? 'Create the first round to start the evaluations.' : 'The admin has not opened a pitch round yet.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {rounds.map(round => {
                        const criteria = parseCriteria(round.criteriaJson);
                        return (
                            <Card key={round.id}>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-foreground/5"><Trophy size={20} /></div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">{roundTitle(round)}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {criteria.length} criteria · max {maxOf(criteria)} pts
                                                {round.roundDate ? ` · ${new Date(round.roundDate).toLocaleDateString()}` : ''}
                                            </p>
                                            {round.resultsSentAt && (
                                                <p className="text-xs text-emerald-500 mt-1">
                                                    Results sent on {new Date(round.resultsSentAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {isAdmin && (
                                            <button onClick={() => setEditing(round)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors text-sm">
                                                <Settings2 size={14} /> Criteria
                                            </button>
                                        )}
                                        <button onClick={() => onEvaluate(round)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm">
                                            <Star size={14} /> {isAdmin ? 'Score' : 'Score startups'}
                                        </button>
                                        {isAdmin && (
                                            <button onClick={() => onResults(round)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 transition-colors text-sm">
                                                <ListOrdered size={14} /> All judges & results
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {editing && (
                    <CriteriaEditor round={editing} onClose={() => setEditing(null)}
                        onSaved={() => { setEditing(null); onCriteriaSaved(); }} />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function CriteriaEditor({ round, onClose, onSaved }: { round: PitchRound; onClose: () => void; onSaved: () => void }) {
    const [criteria, setCriteria] = useState(() => {
        const parsed = parseCriteria(round.criteriaJson);
        return parsed.length ? parsed.map(c => ({ label: c.label, maxPoints: c.maxPoints }))
            : [{ label: 'Innovation', maxPoints: 5 }];
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const cleaned = criteria.map(c => ({ ...c, label: c.label.trim() })).filter(c => c.label);
        if (!cleaned.length) { toast.error('Add at least one criterion'); return; }
        if (cleaned.some(c => !(c.maxPoints > 0))) { toast.error('Max points must be greater than 0'); return; }
        setSaving(true);
        try {
            // Same shape as the backend defaults
            await api.updateRoundCriteria(round.id, JSON.stringify(
                cleaned.map(c => ({ criterion: c.label, maxPoints: c.maxPoints }))));
            toast.success('Criteria saved');
            onSaved();
        } catch (e: any) {
            toast.error(e.message || 'Failed to save criteria');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">Evaluation Criteria</h3>
                        <p className="text-sm text-muted-foreground">{roundTitle(round)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-foreground/5"><X size={20} /></button>
                </div>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                    {criteria.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <input value={c.label} placeholder="Criterion name"
                                onChange={e => setCriteria(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary/40" />
                            <input type="number" min={1} max={100} value={c.maxPoints}
                                onChange={e => setCriteria(prev => prev.map((x, i) => i === idx ? { ...x, maxPoints: Number(e.target.value) } : x))}
                                className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary/40" />
                            <button onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={() => setCriteria(prev => [...prev, { label: '', maxPoints: 5 }])}
                    className="flex items-center gap-2 text-sm text-primary mb-6"><Plus size={16} /> Add Criterion</button>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20">Cancel</button>
                    <button disabled={saving} onClick={save}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                        {saving ? 'Saving...' : 'Save Criteria'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Scoring (admin and experts) ──────────────────────────────────────

function EvaluateView({ round, mode, onBack, onViewResults }: {
    round: PitchRound;
    mode: Mode;
    onBack: () => void;
    onViewResults?: () => void;
}) {
    const isAdmin = mode === 'admin';
    const criteria = parseCriteria(round.criteriaJson);
    const maxScore = maxOf(criteria);
    const myEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
    const locked = !isAdmin && !!round.resultsSentAt;

    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [myResults, setMyResults] = useState<Record<string, any>>({});
    const [scoring, setScoring] = useState<any | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [cands, results] = await Promise.all([
                api.getRoundCandidates(round.id),
                api.getPitchRoundResults(round.id),
            ]);
            setCandidates(cands || []);
            // Experts only receive their own results; admins receive all, so keep the admin's own
            const mine: Record<string, any> = {};
            (results || []).forEach((r: any) => {
                if (!isAdmin || (r.evaluatedBy || '').toLowerCase() === myEmail) mine[r.applicationId] = r;
            });
            setMyResults(mine);
        } catch (e: any) {
            toast.error(e.message || 'Failed to load startups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [round.id]);

    const scoredCount = candidates.filter(c => myResults[c.applicationId]).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-foreground/5"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{roundTitle(round)}</h2>
                        <p className="text-muted-foreground text-sm">
                            You scored {scoredCount} / {candidates.length} startups · max {maxScore} pts per startup
                        </p>
                    </div>
                </div>
                {onViewResults && (
                    <button onClick={onViewResults}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20">
                        <ListOrdered size={16} /> All judges & results
                    </button>
                )}
            </div>

            {locked && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-500">
                    The results of this round have already been sent to the startups. Scores can no longer be changed.
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : candidates.length === 0 ? (
                <Card>
                    <div className="text-center py-8">
                        <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No startups to score in this round yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            {round.roundNumber > 1 ? 'Startups appear here once they pass the previous round.' : 'Startups appear here once their application (and Phase 2) is accepted.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {candidates.map(c => {
                        const mine = myResults[c.applicationId];
                        return (
                            <Card key={c.applicationId} className="!p-4">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {(c.startupName || 'S')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">{c.startupName}</h4>
                                            <p className="text-sm text-muted-foreground">{c.founderName}</p>
                                            {mine && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <DecisionBadge decision={mine.decision} />
                                                    <span className="text-xs text-muted-foreground">Your score: {mine.totalScore} / {maxScore}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button disabled={locked} onClick={() => setScoring(c)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mine ? 'bg-foreground/10 text-foreground hover:bg-foreground/20' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                                        <Star size={14} /> {mine ? 'Edit my score' : 'Score'}
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {scoring && (
                    <ScoreModal
                        round={round}
                        criteria={criteria}
                        candidate={scoring}
                        existing={myResults[scoring.applicationId]}
                        onClose={() => setScoring(null)}
                        onSaved={() => { setScoring(null); load(); }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ScoreModal({ round, criteria, candidate, existing, onClose, onSaved }: {
    round: PitchRound;
    criteria: Criterion[];
    candidate: any;
    existing?: any;
    onClose: () => void;
    onSaved: () => void;
}) {
    const maxScore = maxOf(criteria);
    const [scores, setScores] = useState<Record<string, number>>(() => {
        try { return existing?.scoresJson ? JSON.parse(existing.scoresJson) : {}; } catch { return {}; }
    });
    const [feedback, setFeedback] = useState<string>(existing?.feedback || '');
    const [decision, setDecision] = useState<'PASSED' | 'REJECTED' | null>(existing?.decision || null);
    const [enhancing, setEnhancing] = useState(false);
    const [saving, setSaving] = useState(false);

    const total = criteria.reduce((sum, c) => sum + (Number(scores[c.key]) || 0), 0);
    const suggested: 'PASSED' | 'REJECTED' = total >= maxScore * PASS_RATIO ? 'PASSED' : 'REJECTED';
    const effectiveDecision = decision || suggested;

    const setScore = (key: string, value: number, max: number) =>
        setScores(prev => ({ ...prev, [key]: Math.max(0, Math.min(max, value)) }));

    const enhance = async () => {
        setEnhancing(true);
        try {
            const res = await api.enhancePitchFeedback({
                roundName: round.roundName || `Round ${round.roundNumber}`,
                scoresJson: JSON.stringify(scores),
                feedback,
            });
            if (res.enhancedFeedback) setFeedback(res.enhancedFeedback);
            toast.success('Feedback enhanced with AI');
        } catch {
            toast.error('AI enhancement failed');
        } finally {
            setEnhancing(false);
        }
    };

    const submit = async () => {
        const missing = criteria.filter(c => scores[c.key] === undefined || scores[c.key] === null || Number.isNaN(scores[c.key]));
        if (missing.length) { toast.error(`Please score: ${missing.map(m => m.label).join(', ')}`); return; }
        setSaving(true);
        try {
            const scoresOnly: Record<string, number> = {};
            criteria.forEach(c => { scoresOnly[c.key] = Number(scores[c.key]); });
            await api.evaluatePitchRound(round.id, {
                applicationId: candidate.applicationId,
                scoresJson: JSON.stringify(scoresOnly),
                totalScore: total,
                decision: effectiveDecision,
                feedback,
            });
            toast.success(existing ? 'Your score was updated' : 'Score submitted');
            onSaved();
        } catch (e: any) {
            toast.error(e.message || 'Failed to submit score');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-6"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">Score {candidate.startupName}</h3>
                        <p className="text-sm text-muted-foreground">{roundTitle(round)} · {candidate.founderName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-foreground/5"><X size={20} /></button>
                </div>

                <div className="space-y-4 mb-6">
                    {criteria.map(c => (
                        <div key={c.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">{c.label}</label>
                                <span className="text-xs text-muted-foreground">max {c.maxPoints}</span>
                            </div>
                            {c.maxPoints <= 10 ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {Array.from({ length: c.maxPoints + 1 }, (_, i) => i).map(v => (
                                        <button key={v} type="button" onClick={() => setScore(c.key, v, c.maxPoints)}
                                            className={`w-10 h-10 rounded-lg border transition-colors ${scores[c.key] === v ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input type="number" min={0} max={c.maxPoints} value={scores[c.key] ?? ''}
                                    onChange={e => setScore(c.key, Number(e.target.value), c.maxPoints)}
                                    className="w-28 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary/40" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-xl bg-foreground/5 border border-border mb-6">
                    <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold text-foreground">{total} <span className="text-sm text-muted-foreground">/ {maxScore}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-1">Your decision</span>
                        {(['PASSED', 'REJECTED'] as const).map(d => (
                            <button key={d} type="button" onClick={() => setDecision(d)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${effectiveDecision === d
                                    ? (d === 'PASSED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'bg-red-500/15 border-red-500/40 text-red-500')
                                    : 'border-border text-muted-foreground hover:bg-foreground/5'}`}>
                                {d === 'PASSED' ? <CheckCircle size={13} /> : <XCircle size={13} />} {d === 'PASSED' ? 'Pass' : 'Reject'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">Feedback for the startup</label>
                        <button type="button" disabled={!feedback.trim() || enhancing} onClick={enhance}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/25 text-xs hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                            <Brain size={12} /> {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                        </button>
                    </div>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                        placeholder="Strengths, weaknesses, advice..."
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary/40 min-h-[100px] resize-none" />
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20">Cancel</button>
                    <button disabled={saving} onClick={submit}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                        {saving ? 'Saving...' : existing ? 'Update my score' : 'Submit score'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Results: every judge + average (admin) ───────────────────────────

function ResultsView({ round, onBack }: { round: PitchRound; onBack: () => void }) {
    const criteria = parseCriteria(round.criteriaJson);
    const maxScore = maxOf(criteria);
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sentAt, setSentAt] = useState<string | null | undefined>(round.resultsSentAt);

    const load = async () => {
        setLoading(true);
        try {
            setSummary(await api.getRoundSummary(round.id));
        } catch (e: any) {
            toast.error(e.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [round.id]);

    const send = async () => {
        if (!summary.length) { toast.error('No evaluations to send yet'); return; }
        const msg = sentAt
            ? 'Results were already sent. Send the updated results to every startup again?'
            : `Send the final results (average of all judges) to ${summary.length} startup(s)?`;
        if (!window.confirm(msg)) return;
        setSending(true);
        try {
            const res = await api.sendPitchRoundResults(round.id);
            setSentAt(new Date().toISOString());
            toast.success(`Results sent to ${res.emailsSent ?? summary.length} startup(s)`);
        } catch (e: any) {
            toast.error(e.message || 'Failed to send results');
        } finally {
            setSending(false);
        }
    };

    const passed = summary.filter(s => s.finalDecision === 'PASSED').length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-foreground/5"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{roundTitle(round)} — Results</h2>
                        <p className="text-muted-foreground text-sm">
                            Final score = average of all judges · passes at {Math.round(PASS_RATIO * 100)}% ({Math.round(maxScore * PASS_RATIO * 100) / 100} / {maxScore})
                        </p>
                        {sentAt && <p className="text-xs text-emerald-500 mt-1">Sent on {new Date(sentAt).toLocaleString()}</p>}
                    </div>
                </div>
                <button onClick={send} disabled={sending}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                    <Send size={16} /> {sending ? 'Sending...' : sentAt ? 'Send again' : 'Send results to all'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><p className="text-sm text-muted-foreground">Startups evaluated</p><p className="text-2xl font-bold text-foreground">{summary.length}</p></Card>
                <Card><p className="text-sm text-muted-foreground">Passed (final)</p><p className="text-2xl font-bold text-emerald-500">{passed}</p></Card>
                <Card><p className="text-sm text-muted-foreground">Rejected (final)</p><p className="text-2xl font-bold text-red-500">{summary.length - passed}</p></Card>
            </div>

            <Card className="!p-0 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : summary.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No judge has scored this round yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Startup</th>
                                    <th className="py-3 px-4 text-center">Judges</th>
                                    <th className="py-3 px-4 text-center">Votes</th>
                                    <th className="py-3 px-4 text-center">Average (final)</th>
                                    <th className="py-3 px-4 text-center">Final decision</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.map((s, idx) => {
                                    const open = expanded === s.applicationId;
                                    return (
                                        <Fragment key={s.applicationId}>
                                            <tr onClick={() => setExpanded(open ? null : s.applicationId)}
                                                className="border-b border-border/50 hover:bg-foreground/5 cursor-pointer">
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        <div>
                                                            <p className="font-medium text-foreground">{s.startupName}</p>
                                                            <p className="text-xs text-muted-foreground">{s.founderName}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center text-sm">{s.judgeCount}</td>
                                                <td className="py-3 px-4 text-center text-xs">
                                                    <span className="text-emerald-500">✓ {s.passedVotes}</span>
                                                    <span className="text-muted-foreground mx-1">·</span>
                                                    <span className="text-red-500">✗ {s.rejectedVotes}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-semibold text-foreground">{s.averageScore} / {s.maxScore || maxScore}</td>
                                                <td className="py-3 px-4 text-center"><DecisionBadge decision={s.finalDecision} /></td>
                                            </tr>
                                            {open && (
                                                <tr className="bg-foreground/[0.02] border-b border-border/50">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="grid gap-3">
                                                            {(s.evaluations || []).map((e: any) => {
                                                                let detail: Record<string, number> = {};
                                                                try { detail = JSON.parse(e.scoresJson || '{}'); } catch { /* ignore */ }
                                                                return (
                                                                    <div key={e.id} className="p-3 rounded-xl bg-card border border-border">
                                                                        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                                                                            <span className="text-sm font-medium text-foreground">{e.evaluatedBy}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <DecisionBadge decision={e.decision} />
                                                                                <span className="text-sm font-semibold">{e.totalScore} / {s.maxScore || maxScore}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                                            {Object.entries(detail).map(([k, v]) => (
                                                                                <span key={k} className="px-2 py-0.5 rounded-md bg-foreground/5 text-xs text-muted-foreground">{k}: <b className="text-foreground">{v}</b></span>
                                                                            ))}
                                                                        </div>
                                                                        {e.feedback && <p className="text-xs text-muted-foreground whitespace-pre-line">{e.feedback}</p>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </motion.div>
    );
}
