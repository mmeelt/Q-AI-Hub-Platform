import { useEffect, useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

type Recommendation = 'ACCEPT' | 'REJECT';

const scoreColor = (score: number) =>
    score >= 14 ? 'text-emerald-600 dark:text-emerald-400' : score >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

/** Expert side: grade the application /20 with a recommendation; editable until the admin decides. */
export function MyApplicationGrade({ applicationId }: { applicationId: string }) {
    const [loading, setLoading] = useState(true);
    const [canGrade, setCanGrade] = useState(false);
    const [score, setScore] = useState('');
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [comment, setComment] = useState('');
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.getApplicationReviews(applicationId)
            .then(data => {
                setCanGrade(Boolean(data.canGrade));
                const mine = data.myReview;
                if (mine) {
                    setScore(String(mine.score));
                    setRecommendation(mine.recommendation);
                    setComment(mine.comment || '');
                    setSaved(true);
                }
            })
            .catch(() => setCanGrade(false))
            .finally(() => setLoading(false));
    }, [applicationId]);

    const save = async () => {
        const value = Number(score.replace(',', '.'));
        if (score.trim() === '' || Number.isNaN(value) || value < 0 || value > 20) {
            toast.error('Enter a grade between 0 and 20');
            return;
        }
        if (!recommendation) {
            toast.error('Choose a recommendation: accept or reject');
            return;
        }
        setBusy(true);
        try {
            await api.submitMyApplicationReview(applicationId, { score: value, recommendation, comment });
            setSaved(true);
            toast.success('Your grade was saved. The admin will see it.');
        } catch (e: any) {
            toast.error(e.message || 'Failed to save your grade');
        } finally {
            setBusy(false);
        }
    };

    if (loading) return null;

    return (
        <section className="p-4 rounded-xl bg-card border border-border">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star size={12} /> Your grade
            </h4>
            {!canGrade && (
                <p className="text-xs text-muted-foreground mb-3">
                    The admin has already decided on this application: grades are closed.
                </p>
            )}
            <div className="flex items-center gap-2 mb-3">
                <input
                    type="number" min={0} max={20} step={0.25}
                    value={score}
                    onChange={e => { setScore(e.target.value); setSaved(false); }}
                    disabled={!canGrade}
                    className="w-24 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
                    aria-label="Grade out of 20"
                />
                <span className="text-sm text-muted-foreground">/ 20</span>
            </div>
            <div className="flex gap-2 mb-3">
                {(['ACCEPT', 'REJECT'] as Recommendation[]).map(r => {
                    const active = recommendation === r;
                    const Icon = r === 'ACCEPT' ? ThumbsUp : ThumbsDown;
                    const tone = r === 'ACCEPT'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400';
                    return (
                        <button
                            key={r}
                            type="button"
                            disabled={!canGrade}
                            onClick={() => { setRecommendation(r); setSaved(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${active ? tone : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            <Icon size={14} /> {r === 'ACCEPT' ? 'Recommend accept' : 'Recommend reject'}
                        </button>
                    );
                })}
            </div>
            <textarea
                value={comment}
                onChange={e => { setComment(e.target.value); setSaved(false); }}
                disabled={!canGrade}
                placeholder="Comment for the admin (strengths, weaknesses...)"
                rows={3}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60 mb-3"
            />
            {canGrade && (
                <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-lg neon-btn-gradient text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                    <Save size={14} /> {saved ? 'Grade saved — update it' : 'Save my grade'}
                </button>
            )}
        </section>
    );
}

/** Admin side: every expert's grade, the average /20 and the votes, to take the final decision. */
export function ApplicationGradesSummary({ applicationId }: { applicationId: string }) {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.getApplicationReviews(applicationId).then(setData).catch(() => setData({ reviews: [] }));
    }, [applicationId]);

    if (!data) return null;
    const reviews: any[] = data.reviews || [];

    return (
        <div className="pt-4 border-t border-border space-y-3">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Expert grades</span>
            {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">No expert has graded this application yet.</p>
            ) : (
                <>
                    <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3">
                        <span className="text-sm font-medium text-foreground">Average</span>
                        <span className={`text-xl font-bold ${scoreColor(data.averageScore)}`}>
                            {Number(data.averageScore).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ 20</span>
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {reviews.length} expert{reviews.length > 1 ? 's' : ''} ·{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">{data.acceptVotes} accept</span> ·{' '}
                        <span className="text-red-600 dark:text-red-400">{data.rejectVotes} reject</span>
                    </p>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {reviews.map(r => (
                            <div key={r.id} className="rounded-lg border border-border bg-foreground/[0.03] p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-foreground truncate">{r.reviewerName || r.reviewerEmail}</span>
                                    <span className={`text-sm font-bold ${scoreColor(r.score)}`}>{r.score}/20</span>
                                </div>
                                <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.recommendation === 'ACCEPT'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-red-500/15 text-red-700 dark:text-red-400'}`}>
                                    {r.recommendation === 'ACCEPT' ? 'Accept' : 'Reject'}
                                </span>
                                {r.comment && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
