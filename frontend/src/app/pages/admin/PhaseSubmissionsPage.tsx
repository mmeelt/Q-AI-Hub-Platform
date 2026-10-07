import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, FileText, Star, MessageSquare, CheckCircle, X, Clock, TrendingUp, Search, Filter } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Submission {
    id: number;
    userId: string;
    applicationId: number;
    answersJson: string;
    submittedAt: string;
    evaluationScore?: number;
    evaluatorFeedback?: string;
    status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
    decisionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    // Effective result computed by the backend: the admin decision, or (Phase 2+) the grading rule
    outcome?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    user: {
        fullName: string;
        emailAddress: string;
        startupName?: string;
    };
    phaseOrder: number;
}

interface GradingModalProps {
    submission: Submission;
    isOpen: boolean;
    onClose: () => void;
    onGrade: (submissionId: number, score: number, feedback: string) => void;
    onDecide: (submissionId: number, decision: 'ACCEPTED' | 'REJECTED', feedback: string) => void;
}

function GradingModal({ submission, isOpen, onClose, onGrade, onDecide }: GradingModalProps) {
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync state when submission changes or modal opens
    useEffect(() => {
        if (submission) {
            setScore(submission.evaluationScore || 0);
            setFeedback(submission.evaluatorFeedback || '');
        }
    }, [submission, isOpen]);

    const handleSubmit = async () => {
        if (score < 0 || score > 100) {
            toast.error('Score must be between 0 and 100');
            return;
        }

        setIsSubmitting(true);
        try {
            await onGrade(submission.id, score, feedback);
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDecide = async (decision: 'ACCEPTED' | 'REJECTED') => {
        setIsSubmitting(true);
        try {
            await onDecide(submission.id, decision, feedback);
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !submission) return null;

    const answers = JSON.parse(submission.answersJson || '{}');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">Grade Submission</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {submission.user?.fullName || 'Unknown User'} • {submission.user?.startupName || 'No startup'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Answers */}
                    <div className="mb-6">
                        <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                            <FileText size={18} />
                            Submission Answers
                        </h4>
                        <div className="space-y-4">
                            {Object.entries(answers).map(([key, value]) => {
                                const textValue = typeof value === 'string' ? value : JSON.stringify(value);
                                const isUploadsUrl = typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('http://') || value.startsWith('https://'));
                                const isPdf = typeof value === 'string' && value.toLowerCase().includes('.pdf');
                                const isImage = typeof value === 'string' && /\.(png|jpe?g|webp|gif)$/i.test(value);
                                return (
                                <div key={key} className="bg-muted/30 rounded-lg p-4">
                                    <p className="text-sm font-medium text-foreground mb-2 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </p>
                                    {isUploadsUrl ? (
                                        <div className="space-y-2">
                                            <a
                                                href={textValue}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-primary hover:text-accent underline break-all"
                                            >
                                                {textValue}
                                            </a>
                                            {isImage && (
                                                <img
                                                    src={textValue}
                                                    alt={key}
                                                    className="max-h-64 rounded-lg border border-border object-contain bg-background"
                                                />
                                            )}
                                            {isPdf && (
                                                <p className="text-xs text-muted-foreground">
                                                    PDF attached. Open the link to view.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            {textValue}
                                        </p>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grading - Only show for Phase 2+ */}
                    {submission.phaseOrder > 1 && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                                <Star size={18} />
                                Scoring
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">
                                        Score (0-100)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={score}
                                            onChange={(e) => setScore(Number(e.target.value))}
                                            className="flex-1"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={score}
                                            onChange={(e) => setScore(Number(e.target.value))}
                                            className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                                                style={{ width: `${score}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {score >= 50 ? 'Pass' : 'Fail'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className="mt-6">
                        <label className="block text-sm text-muted-foreground mb-2">
                            Feedback / Decision Note
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Provide detailed feedback on the submission..."
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40 min-h-[120px] resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    <div className="flex gap-2">
                        {submission.phaseOrder === 1 ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleDecide('REJECTED')}
                                    disabled={isSubmitting}
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                >
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => handleDecide('ACCEPTED')}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    Accept
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => { setScore(100); setFeedback('Excellent work! Approved.'); }}
                                    className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                                >
                                    Quick Pass
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Grading...' : 'Submit Grade'}
                                </Button>
                            </>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function PhaseSubmissionsPage() {
    const { phaseId } = useParams<{ phaseId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);

    useEffect(() => {
        if (phaseId) {
            loadSubmissions();
        }
    }, [phaseId]);

    const loadSubmissions = async () => {
        try {
            setError(null);
            const data = await api.getSubmissionsByPhase(phaseId!);
            setSubmissions(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load submissions');
            toast.error('Failed to load submissions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGrade = async (submissionId: number, score: number, feedback: string) => {
        try {
            await api.gradeSubmission(submissionId, score, feedback);
            toast.success('Submission graded successfully');
            loadSubmissions();
        } catch (error: any) {
            toast.error(error.message || 'Failed to grade submission');
        }
    };

    const handleDecide = async (submissionId: number, decision: 'ACCEPTED' | 'REJECTED', feedback: string) => {
        try {
            await api.decideSubmission(submissionId, decision, feedback);
            toast.success(`Submission ${decision.toLowerCase()} successfully`);
            loadSubmissions();
        } catch (error: any) {
            toast.error(error.message || 'Failed to record decision');
        }
    };

    const openGradingModal = (submission: Submission) => {
        setSelectedSubmission(submission);
        setIsGradingModalOpen(true);
    };


    const getDecision = (submission: Submission) => submission.outcome || submission.decisionStatus || 'PENDING';
    const isExplicitDecision = (submission: Submission) =>
        !!submission.decisionStatus && submission.decisionStatus !== 'PENDING';
    const hasScore = (submission: Submission) => submission.evaluationScore != null;

    const getStatusColor = (submission: Submission) => {
        switch (getDecision(submission)) {
            case 'ACCEPTED':
                return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'REJECTED':
                return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
            default:
                return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30';
        }
    };

    const getStatusLabel = (submission: Submission) => {
        switch (getDecision(submission)) {
            case 'ACCEPTED': return isExplicitDecision(submission) ? 'ACCEPTED' : 'PASSED';
            case 'REJECTED': return isExplicitDecision(submission) ? 'REJECTED' : 'FAILED';
            default: return hasScore(submission) ? 'GRADED · PENDING DECISION' : 'PENDING REVIEW';
        }
    };

    const filteredSubmissions = submissions.filter(submission => {
        const fullName = submission.user?.fullName || '';
        const startupName = submission.user?.startupName || '';
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           startupName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || getDecision(submission) === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const passCount = submissions.filter(s => getDecision(s) === 'ACCEPTED').length;
    const failCount = submissions.filter(s => getDecision(s) === 'REJECTED').length;
    const pendingCount = submissions.filter(s => getDecision(s) === 'PENDING').length;
    const gradedCount = submissions.filter(hasScore).length;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading submissions...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-destructive">{error}</p>
                <button onClick={() => { setIsLoading(true); loadSubmissions(); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Retry</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Back to Admin
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Phase Submissions</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage and grade submissions for Phase {phaseId}
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {submissions.length} total submissions
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name or startup..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 bg-card border border-border rounded-lg text-foreground outline-none focus:border-primary/40"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="ACCEPTED">Accepted / Passed</option>
                        <option value="REJECTED">Rejected / Failed</option>
                    </select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total', value: submissions.length, color: 'text-blue-600', icon: Users },
                        { label: 'Graded', value: gradedCount, color: 'text-cyan-600', icon: CheckCircle },
                        { label: 'Pending', value: pendingCount, color: 'text-amber-600', icon: Clock },
                        { label: 'Accepted', value: passCount, color: 'text-emerald-600', icon: CheckCircle },
                        { label: 'Rejected', value: failCount, color: 'text-red-600', icon: X },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <stat.icon size={14} className={stat.color} />
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </div>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* All reviewed */}
                {submissions.length > 0 && pendingCount === 0 && (
                    <div className="mb-8 flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <TrendingUp className="text-emerald-500" size={20} />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">All submissions reviewed</p>
                            <p className="text-xs text-muted-foreground">{passCount} accepted, {failCount} rejected. You can open the next phase from the event's Phases panel.</p>
                        </div>
                    </div>
                )}

                {/* Submissions Table */}
                {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                        <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">No submissions found</p>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Participant
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Score
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredSubmissions.map((submission) => (
                                    <motion.tr
                                        key={submission.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-foreground">{submission.user?.fullName || 'Unknown User'}</p>
                                                <p className="text-sm text-muted-foreground">{submission.user?.emailAddress || 'No email'}</p>
                                                {submission.user?.startupName && (
                                                    <p className="text-xs text-muted-foreground">{submission.user.startupName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {new Date(submission.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {submission.evaluationScore != null ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground">{submission.evaluationScore}</span>
                                                    <div className="w-16 h-2 bg-foreground/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${
                                                                submission.evaluationScore >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${submission.evaluationScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Not graded</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(submission)}`}>
                                                {getStatusLabel(submission)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                onClick={() => openGradingModal(submission)}
                                                className="text-xs gap-2"
                                            >
                                                <Star size={14} />
                                                {getDecision(submission) === 'PENDING' ? 'Review' : 'View'}
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Grading Modal */}
            <AnimatePresence>
                {isGradingModalOpen && selectedSubmission && (
                    <GradingModal
                        submission={selectedSubmission}
                        isOpen={isGradingModalOpen}
                        onClose={() => {
                            setIsGradingModalOpen(false);
                            setSelectedSubmission(null);
                        }}
                        onGrade={handleGrade}
                        onDecide={handleDecide}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
