import { useState } from 'react';
import { Users, X, Clock, FileText, ExternalLink, Sparkles, Brain, Target, Star, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../services/api';
import { Button } from '../../common/Button';
import { DateTimePicker } from '../../ui/datetime-picker';
import { toast } from 'sonner';
import { StatusBadge } from './shared';

export function ApplicantPanel({ applicant, onClose }: { applicant: any; onClose: () => void }) {
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [customQuestion, setCustomQuestion] = useState('');
    const [followupStatus, setFollowupStatus] = useState(applicant.followupStatus || 'none');
    const [pitchDate, setPitchDate] = useState<Date | undefined>(applicant.pitchDate ? new Date(applicant.pitchDate) : undefined);

    const [expectations, setExpectations] = useState(applicant.questionnaireAnswers?.expectations || '');

    const saveToLocalStorage = (updates: any) => {
        const key = `application-${applicant.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        const updated = { ...existing, ...updates };
        localStorage.setItem(key, JSON.stringify(updated));
    };

    const questionnaireQuestions = [
        { id: 'vision', title: 'Vision & Impact', icon: <Brain size={18} className="text-purple-500" /> },
        { id: 'validation', title: 'Market Validation', icon: <Target size={18} className="text-cyan-500" /> },
        { id: 'technical', title: 'Technical Depth', icon: <Sparkles size={18} className="text-amber-500" /> },
        { id: 'team', title: 'Team Strength', icon: <Users size={18} className="text-emerald-500" /> },
        { id: 'expectations', title: 'Q-AI Hub Goals', icon: <Star size={18} className="text-blue-500" /> }
    ];

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[900px] flex-col border-l border-border bg-brand-navy/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-8 py-6 bg-card/30">
                <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-2xl font-bold text-brand-navy shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                        {applicant.avatar || applicant.startup[0]}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">{applicant.startup}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-medium text-cyan-400">Founder: {applicant.name}</span>
                            <div className="w-1 h-1 rounded-full bg-border" />
                            <StatusBadge status={applicant.status} />
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all border border-border/50"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-12 gap-8">
                    {/* Main Content Column */}
                    <div className="col-span-8 space-y-8">
                        
                        {/* Vision & Topic Card (Replicating Startup Page) */}
                        <section className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                                <Brain size={18} className="text-purple-400" />
                                Project Vision & Topic
                            </h4>
                            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                                <p>
                                    Our project, <span className="text-white font-semibold">{applicant.startup}</span>, leverages advanced technological frameworks to solve critical bottlenecks in the current market.
                                </p>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 italic">
                                    "{applicant.answers.find((a: any) => a.question === 'Pitch')?.answer || 'No project description provided yet.'}"
                                </div>
                            </div>
                        </section>

                        {/* Full Application Answers */}
                        <section className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-wider">
                                <FileText size={18} />
                                Application Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {applicant.answers.filter((a: any) => a.question !== 'Pitch').map((a: any, i: number) => (
                                    <div key={i} className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{a.question}</p>
                                        <p className="text-sm text-white">
                                            {a.type === 'url' && a.answer !== 'N/A' ? (
                                                <a href={a.answer.startsWith('http') ? a.answer : `https://${a.answer}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                                                    {a.answer} <ExternalLink size={12} />
                                                </a>
                                            ) : a.answer}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Deep-Dive Questionnaire Section */}
                        {applicant.questionnaireAnswers && (
                            <section className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                                <h4 className="text-sm font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-wider">
                                    <Sparkles size={18} />
                                    Deep-Dive Evaluation
                                </h4>
                                <div className="grid grid-cols-1 gap-6">
                                    {questionnaireQuestions.map((q) => applicant.questionnaireAnswers![q.id] && (
                                        <div key={q.id} className="group">
                                            <div className="flex items-center gap-2 mb-2 text-white font-semibold text-sm">
                                                {q.icon}
                                                {q.title}
                                            </div>
                                            <div className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-muted-foreground border border-white/5 group-hover:bg-white/[0.07] transition-colors">
                                                {applicant.questionnaireAnswers![q.id]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Milestones Card */}
                        <section className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
                                <Target size={18} className="text-emerald-400" />
                                Development Milestones
                            </h4>
                            <div className="space-y-3">
                                {!applicant.milestones || applicant.milestones.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                                        <p className="text-xs text-muted-foreground italic">No milestones set for this application phase.</p>
                                    </div>
                                ) : (
                                    applicant.milestones.map((m: any) => (
                                        <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {m.completed ? <CheckCircle2 size={16} /> : <Target size={16} />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${m.completed ? 'text-muted-foreground line-through decoration-emerald-500/30' : 'text-white'}`}>
                                                        {m.task}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{m.date}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${m.completed ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                                                {m.completed ? 'Done' : 'Pending'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Progression Workflow (Idea -> Pre-Seed) */}
                        {applicant.status === 'Accepted' && (
                            <section className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-sm">
                                <h4 className="text-sm font-bold text-brand-amber mb-6 flex items-center gap-2 uppercase tracking-wider">
                                    <TrendingUp size={18} />
                                    Idea Progression Workflow
                                </h4>

                                {followupStatus === 'none' && (
                                    <div className="space-y-6">
                                        <p className="text-sm text-muted-foreground">This startup is in the <b>Idea</b> stage. Send follow-up questions to evaluate their potential for <b>Pre-Seed</b> promotion.</p>
                                        
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-2 block uppercase tracking-widest font-bold">Pick Suggested Questions</label>
                                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/5">
                                                {['Provide more technical details on your architecture.', 'How do you plan to monetize this in the first year?', 'What is your current team composition and hiring plan?', 'Describe your competitive advantage in the local market.'].map(q => (
                                                    <button 
                                                        key={q}
                                                        onClick={() => setSelectedQuestions(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}
                                                        className={`text-left p-3 rounded-lg text-xs transition-all border ${selectedQuestions.includes(q) ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'hover:bg-white/5 border-transparent text-muted-foreground'}`}
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground block uppercase tracking-widest font-bold">Add Custom Question</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={customQuestion}
                                                    onChange={(e) => setCustomQuestion(e.target.value)}
                                                    placeholder="Type your own question..."
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                                                />
                                                <Button 
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (customQuestion.trim()) {
                                                            setSelectedQuestions(prev => [...prev, customQuestion]);
                                                            setCustomQuestion('');
                                                        }
                                                    }}
                                                    className="!px-3"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        </div>

                                        {selectedQuestions.length > 0 && (
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-widest">Questions to Send ({selectedQuestions.length})</p>
                                                <ul className="space-y-2 mb-6">
                                                    {selectedQuestions.map((q, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-xs text-white bg-white/5 p-2 rounded-lg border border-white/5">
                                                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                                                            {q}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Button 
                                                    fullWidth 
                                                    onClick={() => {
                                                        (async () => {
                                                            try {
                                                                await api.sendFollowupQuestions(String(applicant.id), selectedQuestions);
                                                                setFollowupStatus('waiting_answers');
                                                                toast.success('Questions sent to startup!');
                                                            } catch (e: any) {
                                                                toast.error(e.message || 'Failed to send questions');
                                                            }
                                                        })();
                                                    }}
                                                    className="shadow-lg shadow-cyan-500/20"
                                                >
                                                    Send Questions
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {followupStatus === 'waiting_answers' && (
                                    <div className="text-center py-10 space-y-4">
                                        <div className="relative inline-block">
                                            <Clock size={48} className="text-cyan-400/30 animate-pulse" />
                                            <div className="absolute inset-0 bg-cyan-400/10 blur-2xl rounded-full" />
                                        </div>
                                        <p className="text-lg font-medium text-white tracking-tight">Waiting for Founder's response...</p>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">The startup founder has been notified. You will see their answers here once submitted.</p>
                                        <div className="pt-4">
                                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400 bg-cyan-400/10 px-4 py-1.5 rounded-full border border-cyan-400/20">Questions Sent</span>
                                        </div>
                                    </div>
                                )}

                                {followupStatus === 'answers_received' && (
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            {applicant.followupQuestions?.map((q: any, i: number) => (
                                                <div key={i} className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                                    <p className="text-sm font-bold text-white flex gap-2">
                                                        <span className="text-cyan-400 tracking-tighter">Q:</span>
                                                        {q}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground pl-6 border-l border-white/10 ml-1 py-1 italic leading-relaxed">
                                                        "{applicant.followupAnswers?.[i] || 'No answer provided.'}"
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-8 border-t border-white/10">
                                            <div className="flex gap-4">
                                                <Button 
                                                    fullWidth 
                                                    onClick={() => {
                                                        saveToLocalStorage({ stage: 'Pre-Seed', status: 'Accepted' });
                                                        toast.success('Startup promoted to Pre-Seed!');
                                                        onClose();
                                                    }}
                                                    className="h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20"
                                                >
                                                    <TrendingUp className="mr-2 h-4 w-4" />
                                                    Promote to Pre-Seed
                                                </Button>
                                                <Button 
                                                    fullWidth 
                                                    variant="outline"
                                                    onClick={() => {
                                                        toast.warning('Promotion ignored for now.');
                                                        onClose();
                                                    }}
                                                    className="h-12 border-white/10 text-white hover:bg-white/5"
                                                >
                                                    Ignore Promotion
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* Sidebar Column */}
                    <div className="col-span-4 space-y-6">
                        {/* Status & Actions Sidebar Card */}
                        <section className="bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-0 shadow-xl">
                            <h4 className="text-xs font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                <Clock size={16} />
                                Submission Details
                            </h4>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Submission Date</span>
                                    <span className="text-white font-medium">{applicant.submittedAt}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Contact</span>
                                    <span className="text-white font-medium truncate ml-2">{applicant.email}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Project Sector</span>
                                    <span className="text-white font-medium">{applicant.answers.find((a: any) => a.question === 'Sector')?.answer || 'N/A'}</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Schedule Pitch</span>
                                    <DateTimePicker 
                                        date={pitchDate} 
                                        setDate={async (d) => {
                                            if (!d) return;
                                            try {
                                                await api.schedulePitch(String(applicant.id), d);
                                                setPitchDate(d);
                                                toast.success(`Pitch scheduled for ${d.toLocaleString()}`);
                                            } catch (error: any) {
                                                toast.error(error.message || 'Failed to schedule pitch');
                                            }
                                        }}
                                        className="!bg-white/5 !border-white/10 !h-10 !text-xs"
                                    />
                                    {pitchDate && (
                                        <p className="text-[10px] text-muted-foreground text-center">Founder has been notified of the pitch date.</p>
                                    )}
                                </div>
                            </div>

                            {applicant.status !== 'Accepted' && applicant.status !== 'ACCEPTED' && applicant.status !== 'Rejected' && applicant.status !== 'REJECTED' && (
                                <div className="mt-8 flex flex-col gap-3">
                                    <Button 
                                        fullWidth 
                                        onClick={async () => {
                                            try {
                                                await api.acceptApplication(String(applicant.id));
                                                toast.success('Application accepted. The participant has been notified (Phase 1 opens separately).');
                                                onClose();
                                            } catch (e: any) {
                                                toast.error(e.message || 'Failed to accept application');
                                            }
                                        }}
                                        className="shadow-lg shadow-cyan-500/20"
                                    >
                                        Accept Startup
                                    </Button>
                                    <Button 
                                        fullWidth 
                                        variant="outline" 
                                        onClick={async () => {
                                            try {
                                                await api.rejectApplication(String(applicant.id));
                                                toast.success('Application rejected');
                                                onClose();
                                            } catch (e: any) {
                                                toast.error(e.message || 'Failed to reject application');
                                            }
                                        }}
                                        className="border-white/10 text-white hover:bg-white/5"
                                    >
                                        Reject Application
                                    </Button>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
