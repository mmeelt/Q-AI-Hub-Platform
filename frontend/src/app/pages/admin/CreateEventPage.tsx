import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, FileText, Tag, Image, HelpCircle, Plus, Trash2, AlignLeft, List, Type, GripVertical } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { DatePicker } from '../../components/ui/date-picker';
import { Button } from '../../components/common/Button';
import { InviteExpertsPanel, type EventExpert } from '../../components/admin/InviteExpertsPanel';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface ApplicationQuestion {
    id: string;
    question: string;
    type: 'text' | 'textarea' | 'select';
    required: boolean;
    options?: string[];
}

export function CreateEventPage() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const createdEventIdRef = useRef<string | null>(null);
    const [pendingExperts, setPendingExperts] = useState<EventExpert[]>([]);
    const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
    const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        name: '',
        category: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        maxParticipants: '',
        deadline: '',
        tags: '',
        imageUrl: '',
        status: 'active',
        eventType: 'SIMPLE',
        hasPitch: false,
    });

    const categories = ['Hackathon', 'Bootcamp', 'Workshop', 'Masterclass', 'Summit', 'Competition'];

    const handleChange = (field: string, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const addApplicationQuestion = () => {
        const newQuestion: ApplicationQuestion = {
            id: Date.now().toString(),
            question: '',
            type: 'text',
            required: true,
            options: []
        };
        setApplicationQuestions(prev => [...prev, newQuestion]);
        setOptionDrafts(prev => ({ ...prev, [newQuestion.id]: '' }));
    };

    const updateApplicationQuestion = (id: string, field: keyof ApplicationQuestion, value: any) => {
        setApplicationQuestions(prev => 
            prev.map(q => q.id === id ? { ...q, [field]: value } : q)
        );
    };

    const removeApplicationQuestion = (id: string) => {
        setApplicationQuestions(prev => prev.filter(q => q.id !== id));
        setOptionDrafts(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const generateFormFieldsJson = () => {
        if (applicationQuestions.length === 0) {
            return null;
        }
        
        return JSON.stringify(applicationQuestions.map(q => ({
            id: q.id,
            question: q.question,
            type: q.type,
            required: q.required,
            options: q.options || []
        })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.category || !form.startDate || !form.endDate) {
            toast.error('Please fill in all required fields.');
            return;
        }
        if (isSubmitting) return;
        if (createdEventIdRef.current) {
            // The event already exists (a later step failed): never create it twice
            navigate('/admin/events');
            return;
        }
        setIsSubmitting(true);
        try {
            const eventData = {
                title: form.name,
                category: form.category,
                description: form.description,
                location: form.location,
                startDate: form.startDate,
                endDate: form.endDate,
                applicationDeadline: form.deadline || null,
                status: form.status === 'active' ? 'ACTIVE' : (form.status === 'draft' ? 'DRAFT' : 'CLOSED'),
                eventType: form.eventType,
                hasPitch: form.hasPitch,
                maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
                coverImageUrl: form.imageUrl || null,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(t => t) : [],
                partners: [],
                organizerAdminId: localStorage.getItem('userEmail') || 'admin',
                formFieldsJson: generateFormFieldsJson()
            };

            let response: any;
            try {
                response = await api.createEvent(eventData);
            } catch (error: any) {
                // Only a failure of the creation request itself is a creation failure
                toast.error(error.message || 'Failed to create event. Please try again.');
                return;
            }

            // The backend returns the created event with its id in `eventId`
            const eventId = String(response.eventId ?? response.id);
            createdEventIdRef.current = eventId;
            toast.success('Event created successfully!');

            // Follow-up steps: a failure here must not be reported as a creation failure
            if (pendingExperts.length > 0) {
                const results = await Promise.allSettled(
                    pendingExperts.map(expert => api.inviteExpert(expert.email, expert.role, eventId))
                );
                const failed = results.filter(r => r.status === 'rejected').length;
                const sent = results.length - failed;
                if (sent > 0) toast.success(`Invitations sent to ${sent} expert${sent > 1 ? 's' : ''}`);
                if (failed > 0) toast.error(`${failed} expert invitation${failed > 1 ? 's' : ''} failed. You can resend them from the event page.`);
            }

            if (form.eventType === 'INCUBATION') {
                const shouldActivateNow = window.confirm('Event created. Activate it now to open applications?');
                if (shouldActivateNow) {
                    try {
                        await api.activateEvent(eventId);
                        toast.success('Event activated. Applications are now open.');
                    } catch (error: any) {
                        toast.error(`Event created, but activation failed: ${error.message || 'unknown error'}. You can activate it from the events list.`);
                    }
                } else {
                    toast.message('You can activate the event later from the events list.');
                }
            }

            navigate('/admin/events');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative">
            <ParticleBackground />

            {/* Header */}
            <div className="relative z-10 border-b border-border bg-muted/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
                    <Link to="/admin">
                        <Logo size="sm" />
                    </Link>
                    <div className="h-6 w-px bg-foreground/10" />
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm">Back to Dashboard</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Page Title */}
                    <div className="mb-10">
                        <h1 className="text-4xl mb-2">Create New Event</h1>
                        <p className="text-muted-foreground">Fill in the details below to publish a new event on the Q-AI Hub platform.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Basic Info Card */}
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                            <h2 className="text-lg mb-6 text-foreground/90 flex items-center gap-2">
                                <FileText size={18} className="text-emerald-600 dark:text-brand-mint" />
                                Basic Information
                            </h2>
                            <div className="space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Event Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        placeholder="e.g. Quantum AI Hackathon 2026"
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <Tag size={13} /> Category *
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleChange('category', cat)}
                                                className={`px-4 py-2 rounded-full text-sm border transition-all ${form.category === cat
                                                    ? 'bg-foreground/10 border-white/30 text-foreground'
                                                    : 'bg-transparent border-border text-muted-foreground hover:border-border hover:text-foreground'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Event Type */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Event Type *</label>
                                    <select
                                        value={form.eventType}
                                        onChange={e => handleChange('eventType', e.target.value)}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors"
                                    >
                                        <option value="SIMPLE">Simple Event (Workshop, Formation)</option>
                                        <option value="INCUBATION">Incubation Program</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {form.eventType === 'SIMPLE' 
                                            ? 'Direct registration without application process'
                                            : 'Multi-phase program with application and pitch phases'
                                        }
                                    </p>
                                </div>

                                {/* Has Pitch (only for INCUBATION) */}
                                {form.eventType === 'INCUBATION' && (
                                    <div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.hasPitch}
                                                onChange={e => handleChange('hasPitch', e.target.checked)}
                                                className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary/20"
                                            />
                                            <span className="text-sm text-foreground">Include Pitch Phase</span>
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-1 ml-7">
                                            Enable a dedicated pitch phase for selected applicants
                                        </p>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Description *</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        placeholder="Describe the event, its goals, and what participants will gain..."
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40 min-h-[120px] resize-none"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={form.tags}
                                        onChange={e => handleChange('tags', e.target.value)}
                                        placeholder="AI, Deep Tech, Startups, Innovation"
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date & Location Card */}
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                            <h2 className="text-lg mb-6 text-foreground/90 flex items-center gap-2">
                                <Calendar size={18} className="text-cyan-700 dark:text-brand-sky" />
                                Date & Location
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Start Date *</label>
                                    <DatePicker
                                        date={form.startDate ? new Date(form.startDate + 'T00:00:00') : undefined}
                                        setDate={(d) => handleChange('startDate', d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '')}
                                        placeholder="Pick start date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">End Date *</label>
                                    <DatePicker
                                        date={form.endDate ? new Date(form.endDate + 'T00:00:00') : undefined}
                                        setDate={(d) => handleChange('endDate', d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '')}
                                        placeholder="Pick end date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <Clock size={13} /> Application Deadline
                                    </label>
                                    <DatePicker
                                        date={form.deadline ? new Date(form.deadline + 'T00:00:00') : undefined}
                                        setDate={(d) => handleChange('deadline', d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '')}
                                        placeholder="Pick deadline"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <MapPin size={13} /> Location
                                    </label>
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={e => handleChange('location', e.target.value)}
                                        placeholder="City, Country or Online"
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Participants & Media Card */}
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                            <h2 className="text-lg mb-6 text-foreground/90 flex items-center gap-2">
                                <Users size={18} className="text-purple-700 dark:text-brand-purple" />
                                Participants & Media
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Max Participants</label>
                                    <input
                                        type="number"
                                        value={form.maxParticipants}
                                        onChange={e => handleChange('maxParticipants', e.target.value)}
                                        placeholder="e.g. 100"
                                        min={1}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <Image size={13} /> Cover Image URL
                                    </label>
                                    <input
                                        type="url"
                                        value={form.imageUrl}
                                        onChange={e => handleChange('imageUrl', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-3">Publishing Status</label>
                                    <div className="flex gap-3">
                                        {[
                                            { value: 'active', label: 'Active', color: 'text-emerald-600 dark:text-brand-mint' },
                                            { value: 'draft', label: 'Draft', color: 'text-amber-600 dark:text-brand-amber' },
                                            { value: 'closed', label: 'Closed', color: 'text-red-600 dark:text-brand-red' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => handleChange('status', opt.value)}
                                                className={`px-5 py-2.5 rounded-full text-sm border transition-all ${form.status === opt.value
                                                    ? `bg-foreground/10 border-border ${opt.color}`
                                                    : 'bg-transparent border-border text-muted-foreground hover:border-white/15'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Application Questions */}
                        {(true) && (
                            <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                                <h2 className="text-lg mb-2 text-foreground/90 flex items-center gap-2">
                                    <HelpCircle size={18} className="text-indigo-600 dark:text-brand-purple" />
                                    Application Questions
                                </h2>
                                <p className="text-sm text-muted-foreground mb-8">
                                    Define the questions applicants will answer. Choose between short text, long text, or multiple choice (QCM).
                                </p>
                                
                                {applicationQuestions.length === 0 ? (
                                    <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl bg-card/30">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                            <HelpCircle size={32} className="text-indigo-500/40" />
                                        </div>
                                        <p className="text-muted-foreground mb-1 font-medium">No questions yet</p>
                                        <p className="text-sm text-muted-foreground/60 mb-6">Add questions that applicants will need to answer</p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={addApplicationQuestion}
                                            className="gap-2 border border-border hover:border-indigo-500/30 hover:bg-indigo-500/5"
                                        >
                                            <Plus size={16} />
                                            Add First Question
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {applicationQuestions.map((question, index) => (
                                            <div key={question.id} className="group relative bg-card/80 border border-border hover:border-indigo-500/20 rounded-2xl p-6 transition-all duration-200">
                                                {/* Question Header */}
                                                <div className="flex items-start gap-4 mb-5">
                                                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10">
                                                        <span className="text-sm font-bold text-indigo-400">{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={question.question}
                                                            onChange={e => updateApplicationQuestion(question.id, 'question', e.target.value)}
                                                            placeholder="Type your question here..."
                                                            className="w-full px-0 py-1 bg-transparent text-foreground text-base font-medium outline-none border-b-2 border-transparent focus:border-indigo-500/40 transition-colors placeholder:text-muted-foreground/30"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeApplicationQuestion(question.id)}
                                                        className="flex-shrink-0 p-2 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                
                                                {/* Type Selector + Required Toggle */}
                                                <div className="flex items-center justify-between gap-4 mb-4">
                                                    <div className="flex gap-2">
                                                        {[
                                                            { value: 'text', label: 'Text', icon: <Type size={14} /> },
                                                            { value: 'textarea', label: 'Long Text', icon: <AlignLeft size={14} /> },
                                                            { value: 'select', label: 'Multiple Choice', icon: <List size={14} /> },
                                                        ].map(t => (
                                                            <button
                                                                key={t.value}
                                                                type="button"
                                                                onClick={() => updateApplicationQuestion(question.id, 'type', t.value)}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                                    question.type === t.value
                                                                        ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                                                                        : 'bg-transparent border-border text-muted-foreground hover:border-border hover:text-foreground'
                                                                }`}
                                                            >
                                                                {t.icon}
                                                                {t.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Required Toggle */}
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={question.required}
                                                                onChange={e => updateApplicationQuestion(question.id, 'required', e.target.checked)}
                                                                className="sr-only"
                                                            />
                                                            <div className={`w-8 h-[18px] rounded-full transition-colors ${
                                                                question.required ? 'bg-indigo-500' : 'bg-foreground/15'
                                                            }`}>
                                                                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform mt-[2px] ${
                                                                    question.required ? 'translate-x-[18px]' : 'translate-x-[2px]'
                                                                }`} />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">Required</span>
                                                    </label>
                                                </div>

                                                {/* Multiple Choice Options — full width, prominent */}
                                                {question.type === 'select' && (
                                                    <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                                                        <label className="flex items-center gap-2 text-xs font-medium text-indigo-400 mb-3">
                                                            <List size={13} />
                                                            Answer Choices
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={optionDrafts[question.id] ?? question.options?.join(', ') ?? ''}
                                                            onChange={e => setOptionDrafts(prev => ({ ...prev, [question.id]: e.target.value }))}
                                                            onBlur={e => {
                                                                const parsed = e.target.value.split(',').map(o => o.trim()).filter(o => o);
                                                                updateApplicationQuestion(question.id, 'options', parsed);
                                                            }}
                                                            placeholder="Enter choices separated by commas: Option A, Option B, Option C"
                                                            className="w-full px-4 py-3 bg-background rounded-xl border border-border text-foreground outline-none focus:border-indigo-500/40 transition-colors text-sm placeholder:text-muted-foreground/30"
                                                        />
                                                        {/* Live preview chips */}
                                                        {(() => {
                                                            const raw = optionDrafts[question.id] ?? question.options?.join(', ') ?? '';
                                                            const parsed = raw.split(',').map(o => o.trim()).filter(o => o);
                                                            if (parsed.length === 0) return null;
                                                            return (
                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                    {parsed.map((opt, i) => (
                                                                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-medium rounded-full border border-indigo-500/20">
                                                                            <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
                                                                            {opt}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        
                                        {/* Add Question Button */}
                                        <button
                                            type="button"
                                            onClick={addApplicationQuestion}
                                            className="w-full py-4 border-2 border-dashed border-border/60 rounded-2xl text-muted-foreground hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                        >
                                            <Plus size={16} />
                                            Add Another Question
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expert Invitations */}
                        <InviteExpertsPanel onChange={setPendingExperts} />

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating event...' : 'Create Event'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                fullWidth
                                onClick={() => navigate('/admin')}
                            >
                                Cancel
                            </Button>
                        </div>

                    </form>
                </motion.div>
            </div>
        </div>
    );
}
