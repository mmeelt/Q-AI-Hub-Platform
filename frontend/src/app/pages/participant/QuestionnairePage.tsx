import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, Brain, Target, Users, Sparkles, Rocket } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { DashboardHeader } from '../../components/layout/DashboardHeader';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface DynamicQuestion {
    id: string;
    question: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'file' | 'image' | 'pdf' | 'videoUrl';
    required: boolean;
    options?: string[];
}

export function QuestionnairePage() {
    const { id, type } = useParams<{ id: string; type: string }>(); // type is 'event' or 'program'
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const profileName = localStorage.getItem('userName') || 'Founder';
    const applicationIdFromState = (location.state as any)?.applicationId as string | undefined;

    // A phase questionnaire is always opened from the dashboard with the target phase.
    // The backend re-checks every rule (application accepted, phase open, previous phase accepted).
    const phaseId = (location.state as any)?.phaseId as string | undefined;
    const phaseOrder = (location.state as any)?.phaseOrder as number | undefined;
    const isPhase2Mode = !!phaseId && phaseOrder === 2;

    useEffect(() => {
        loadDynamicQuestions();
    }, [id, phaseId]);

    const backToDashboard = (message: string) => {
        toast.error(message);
        navigate('/dashboard?tab=applications');
    };

    const parseFields = (json?: string): DynamicQuestion[] | null => {
        if (!json) return null;
        try {
            const fields = JSON.parse(json);
            return Array.isArray(fields) && fields.length > 0 ? fields : null;
        } catch {
            return null;
        }
    };

    const loadDynamicQuestions = async () => {
        try {
            if (!phaseId) {
                backToDashboard('Please open the phase questionnaire from your dashboard once the phase is open.');
                return;
            }
            const phase = await api.getPhaseById(phaseId);
            if (phase?.phaseLocked) {
                backToDashboard('This phase is locked and no longer accepts answer updates.');
                return;
            }
            if (!phase?.phaseActive) {
                backToDashboard('This phase is not open yet. You will be notified when it opens.');
                return;
            }

            const phaseFields = parseFields(phase?.formFieldsJson);
            if (phaseFields) {
                setQuestions(phaseFields);
                return;
            }

            if ((phase?.phaseOrder ?? phaseOrder) === 1) {
                // Events created before Phase 1 had its own questions keep using the event's questions
                const event = await api.getEventById(String(id));
                const legacyFields = parseFields(event?.formFieldsJson);
                if (legacyFields) {
                    setQuestions(legacyFields);
                    return;
                }
            }

            backToDashboard(`${phase?.phaseName || 'This phase'} questions have not been configured yet. Please contact the administrator.`);
        } catch (error) {
            console.error('Failed to load questions:', error);
            backToDashboard('Could not load the questionnaire. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getQuestionIcon = (index: number) => {
        const icons = [
            <Rocket className="text-purple-500" size={24} />,
            <Target className="text-cyan-500" size={24} />,
            <Brain className="text-emerald-500" size={24} />,
            <Users className="text-amber-500" size={24} />,
            <Sparkles className="text-pink-500" size={24} />,
            <Check className="text-blue-500" size={24} />,
            <ArrowRight className="text-orange-500" size={24} />
        ];
        return icons[index % icons.length];
    };

    const getQuestionTitle = (question: DynamicQuestion, index: number) => {
        // Keep titles simple and stable for users.
        return `Question ${index + 1}`;
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        try {
            const applicationId = applicationIdFromState;

            if (!applicationId) {
                toast.error('Session error. Please restart your application.');
                navigate('/events');
                return;
            }

            const answersJson = JSON.stringify(answers);

            if (!phaseId) {
                backToDashboard('Please open the phase questionnaire from your dashboard.');
                return;
            }

            await api.submitPhaseAnswers(phaseId, applicationId, answersJson);
            toast.success('Answers submitted. Your submission is awaiting review.');
            navigate('/dashboard?tab=applications');
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit answers.');
        }
    };

    const currentQ = questions[currentStep];

    if (isLoading) {
        return (
            <div className="min-h-screen relative">
                <ParticleBackground />
                <DashboardHeader activeTab="" profileName={profileName} />
                <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (!applicationIdFromState) {
        return (
            <div className="min-h-screen relative">
                <ParticleBackground />
                <DashboardHeader activeTab="" profileName={profileName} />
                <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
                    <div className="bg-card/95 backdrop-blur-xl border border-border rounded-3xl p-8 text-center">
                        <h2 className="text-2xl font-bold mb-3">Session expired</h2>
                        <p className="text-muted-foreground mb-6">
                            We could not find your application context. Please reopen the questionnaire from your dashboard.
                        </p>
                        <Button onClick={() => navigate('/dashboard?tab=applications')}>
                            Go to Applications
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />
            <DashboardHeader activeTab="" profileName={profileName} />

            <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            {phaseOrder ? `Phase ${phaseOrder} — Questionnaire` : 'Questionnaire'}
                        </h1>
                        <span className="text-sm text-cyan-500 font-mono">Step {currentStep + 1} of {questions.length}</span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        className="bg-card/95 backdrop-blur-xl border border-border rounded-3xl p-8 md:p-12 shadow-2xl"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center">
                                {getQuestionIcon(currentStep)}
                            </div>
                            <h2 className="text-2xl font-bold">{getQuestionTitle(currentQ, currentStep)}</h2>
                        </div>

                        <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                            {currentQ.question}
                        </p>

                        {/* File upload types (Phase 2 mainly) */}
                        {(currentQ.type === 'file' || currentQ.type === 'pdf' || currentQ.type === 'image') ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl border border-border bg-foreground/5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium">Upload {currentQ.type === 'pdf' ? 'a PDF' : currentQ.type === 'image' ? 'an image' : 'a file'}</p>
                                            <p className="text-xs text-muted-foreground">We’ll store a secure link in your submission.</p>
                                        </div>
                                        {isUploading && (
                                            <span className="text-xs text-muted-foreground">Uploading…</span>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept={
                                            currentQ.type === 'pdf'
                                                ? 'application/pdf'
                                                : currentQ.type === 'image'
                                                    ? 'image/*'
                                                    : 'application/pdf,image/*'
                                        }
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setIsUploading(true);
                                            try {
                                                const subfolder = isPhase2Mode && phaseId ? `phase2-${phaseId}` : 'questionnaire';
                                                const url = await api.uploadFile(file, subfolder);
                                                setAnswers((prev) => ({ ...prev, [currentQ.id]: url }));
                                                toast.success('File uploaded');
                                            } catch (err: any) {
                                                toast.error(err.message || 'Upload failed');
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                        className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
                                    />
                                </div>

                                {answers[currentQ.id] && (
                                    <div className="p-4 rounded-2xl border border-border bg-muted/30">
                                        <p className="text-xs text-muted-foreground mb-2">Uploaded</p>
                                        <a
                                            href={answers[currentQ.id]}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-primary hover:text-accent underline break-all"
                                        >
                                            {answers[currentQ.id]}
                                        </a>
                                        {currentQ.type === 'image' && (
                                            <img
                                                src={answers[currentQ.id]}
                                                alt="Uploaded"
                                                className="mt-3 max-h-64 rounded-xl border border-border object-contain bg-background"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : currentQ.type === 'videoUrl' ? (
                            <div className="space-y-3">
                                <input
                                    type="url"
                                    autoFocus
                                    value={answers[currentQ.id] || ''}
                                    onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                    className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/30"
                                    placeholder="Paste a video link (YouTube, Drive, etc.)"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Tip: use a shareable URL accessible to reviewers.
                                </p>
                            </div>
                        ) : (
                        currentQ.type === 'textarea' ? (
                            <textarea
                                autoFocus
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 min-h-[200px] transition-all resize-none placeholder:text-muted-foreground/30"
                                placeholder="Enter your answer here..."
                            />
                        ) : currentQ.type === 'select' ? (
                            <select
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 transition-all"
                            >
                                <option value="">Select an option...</option>
                                {currentQ.options?.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                        ) : currentQ.type === 'number' ? (
                            <input
                                type="number"
                                autoFocus
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/30"
                                placeholder="Enter a number..."
                            />
                        ) : currentQ.type === 'email' ? (
                            <input
                                type="email"
                                autoFocus
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/30"
                                placeholder="Enter your email..."
                            />
                        ) : (
                            <input
                                type="text"
                                autoFocus
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                className="w-full bg-foreground/5 border border-border rounded-2xl p-6 text-foreground outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/30"
                                placeholder="Enter your answer here..."
                            />
                        ))}

                        <div className="mt-10 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                disabled={currentStep === 0}
                                className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:bg-foreground/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            
                            <Button
                                onClick={handleNext}
                                disabled={(isUploading || isLoading) || (currentQ.required && !(answers[currentQ.id]?.trim()))}
                                className="group px-8 py-3"
                            >
                                {currentStep === questions.length - 1
                                    ? 'Submit Answers'
                                    : 'Next Question'}
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 text-center text-xs text-muted-foreground">
                    Your answers will be saved securely and only shared with the review committee.
                </div>
            </main>
        </div>
    );
}
