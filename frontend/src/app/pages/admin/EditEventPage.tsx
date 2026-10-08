import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, FileText, Tag, Trash2, Plus } from 'lucide-react';
import { ParticleBackground } from '../../components/effects/ParticleBackground';
import { Logo } from '../../components/common/Logo';
import { DatePicker } from '../../components/ui/date-picker';
import { Button } from '../../components/common/Button';
import { InviteExpertsPanel, type EventExpert } from '../../components/admin/InviteExpertsPanel';
import { toast } from 'sonner';
import { api } from '../../services/api';

const categories = ['Hackathon', 'Bootcamp', 'Workshop', 'Masterclass', 'Summit', 'Competition'];

export function EditEventPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingExperts, setPendingExperts] = useState<EventExpert[]>([]);
    const [applicationQuestions, setApplicationQuestions] = useState<any[]>([]);
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
    });

    /* Pre-fill form from API */
    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            try {
                const e = await api.getEventById(id);
                setForm({
                    name: e.title || '',
                    category: e.category || '',
                    description: e.description || '',
                    startDate: e.startDate || '',
                    endDate: e.endDate || '',
                    location: e.location || '',
                    maxParticipants: e.maxParticipants ? String(e.maxParticipants) : '',
                    deadline: e.applicationDeadline || '',
                    tags: (e.tags || []).join(', '),
                    imageUrl: e.coverImageUrl || '',
                    status: e.status === 'ACTIVE' ? 'active' : e.status === 'CLOSED' ? 'closed' : 'draft',
                });
                if (e.formFieldsJson) {
                    try {
                        setApplicationQuestions(JSON.parse(e.formFieldsJson));
                    } catch (_) {}
                }
                if (e.expertInvitations) {
                    setPendingExperts(e.expertInvitations.map((ei: any) => ({
                        email: ei.email,
                        role: ei.role,
                        invitedAt: ei.invitedAt
                    })));
                }
            } catch (_) {
                toast.error('Event not found');
                navigate('/admin');
            }
        };
        fetchEvent();
    }, [id, navigate]);

    const handleChange = (field: string, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const addApplicationQuestion = () => {
        const newQuestion = {
            id: Date.now().toString(),
            question: '',
            type: 'text',
            required: true,
            options: []
        };
        setApplicationQuestions(prev => [...prev, newQuestion]);
    };

    const updateApplicationQuestion = (id: string, field: string, value: any) => {
        setApplicationQuestions(prev => 
            prev.map(q => q.id === id ? { ...q, [field]: value } : q)
        );
    };

    const removeApplicationQuestion = (id: string) => {
        setApplicationQuestions(prev => prev.filter(q => q.id !== id));
    };

    const generateFormFieldsJson = () => {
        if (applicationQuestions.length === 0) {
            return null;
        }
        return JSON.stringify(applicationQuestions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.category || !form.startDate || !form.endDate) {
            toast.error('Please fill in all required fields.');
            return;
        }
        setIsSubmitting(true);
        try {
            const statusMap: Record<string, string> = {
                active: 'ACTIVE', draft: 'DRAFT', closed: 'CLOSED'
            };
            await api.updateEvent(id!, {
                title: form.name,
                category: form.category,
                description: form.description,
                location: form.location,
                startDate: form.startDate,
                endDate: form.endDate,
                applicationDeadline: form.deadline || undefined,
                maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
                coverImageUrl: form.imageUrl || undefined,
                status: statusMap[form.status] || 'DRAFT',
                formFieldsJson: generateFormFieldsJson() || undefined
            });
            toast.success('Event updated successfully!');
            navigate('/admin?section=events');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update event.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await api.deleteEvent(id!);
            toast.success('Event deleted.');
            navigate('/admin?section=events');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete event.');
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
                    <div className="mb-10 flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl mb-2">Edit Event</h1>
                            <p className="text-muted-foreground">Update the details for <span className="text-foreground/80">{form.name}</span></p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-brand-red/30 text-red-600 dark:text-brand-red hover:bg-brand-red/10 transition-all text-sm"
                        >
                            <Trash2 size={14} />
                            Delete Event
                        </button>
                    </div>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 p-6 bg-brand-red/10 border border-brand-red/30 rounded-2xl"
                        >
                            <p className="text-foreground mb-4">Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
                                    {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                                </Button>
                                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Basic Info Card */}
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                            <h2 className="text-lg mb-6 text-foreground/90 flex items-center gap-2">
                                <FileText size={18} className="text-emerald-600 dark:text-brand-mint" />
                                Basic Information
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Event Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>

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

                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Description</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors min-h-[120px] resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={form.tags}
                                        onChange={e => handleChange('tags', e.target.value)}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors"
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
                                        date={form.startDate ? new Date(form.startDate) : undefined}
                                        setDate={(d) => handleChange('startDate', d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Pick start date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">End Date *</label>
                                    <DatePicker
                                        date={form.endDate ? new Date(form.endDate) : undefined}
                                        setDate={(d) => handleChange('endDate', d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Pick end date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <Clock size={13} /> Application Deadline
                                    </label>
                                    <DatePicker
                                        date={form.deadline ? new Date(form.deadline) : undefined}
                                        setDate={(d) => handleChange('deadline', d ? d.toISOString().split('T')[0] : '')}
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
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Participants & Status Card */}
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8">
                            <h2 className="text-lg mb-6 text-foreground/90 flex items-center gap-2">
                                <Users size={18} className="text-purple-700 dark:text-brand-purple" />
                                Participants & Status
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">Max Participants</label>
                                    <input
                                        type="number"
                                        value={form.maxParticipants}
                                        onChange={e => handleChange('maxParticipants', e.target.value)}
                                        min={1}
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                        <Users size={13} /> Cover Image URL
                                    </label>
                                    <input
                                        type="url"
                                        value={form.imageUrl}
                                        onChange={e => handleChange('imageUrl', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground outline-none focus:border-white/30 transition-colors placeholder:text-muted-foreground/40"
                                    />
                                </div>

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
                        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-8 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg text-foreground/90 flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-600 dark:text-brand-purple" />
                                    Application Questions
                                </h2>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={addApplicationQuestion}
                                    className="gap-2 text-xs"
                                >
                                    <Plus size={14} /> Add Question
                                </Button>
                            </div>
                            
                            {applicationQuestions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4 italic">No custom questions defined.</p>
                            ) : (
                                <div className="space-y-4">
                                    {applicationQuestions.map((q, idx) => (
                                        <div key={q.id} className="p-4 bg-muted/30 rounded-xl border border-border relative group">
                                            <button
                                                type="button"
                                                onClick={() => removeApplicationQuestion(q.id)}
                                                className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                            <div className="grid gap-3">
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={e => updateApplicationQuestion(q.id, 'question', e.target.value)}
                                                    placeholder="Enter question..."
                                                    className="w-full bg-transparent border-b border-border outline-none focus:border-primary text-sm py-1"
                                                />
                                                <div className="flex gap-4 items-center">
                                                    <select
                                                        value={q.type}
                                                        onChange={e => updateApplicationQuestion(q.id, 'type', e.target.value)}
                                                        className="bg-transparent text-xs outline-none"
                                                    >
                                                        <option value="text">Short Text</option>
                                                        <option value="textarea">Long Text</option>
                                                        <option value="select">Choice</option>
                                                    </select>
                                                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={q.required}
                                                            onChange={e => updateApplicationQuestion(q.id, 'required', e.target.checked)}
                                                        />
                                                        Required
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Expert Invitations */}
                        <InviteExpertsPanel 
                            eventId={id} 
                            initialExperts={pendingExperts} 
                            onChange={setPendingExperts} 
                        />

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving changes...' : 'Save Changes'}
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
