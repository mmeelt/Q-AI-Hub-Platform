import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Question {
    id: string;
    question: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'file' | 'image' | 'pdf' | 'videoUrl';
    required: boolean;
    options?: string[];
}

interface Phase2QuestionsEditorProps {
    phaseId: string;
    phaseName: string;
    onClose: () => void;
}

export function Phase2QuestionsEditor({ phaseId, phaseName, onClose }: Phase2QuestionsEditorProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, [phaseId]);

    const loadQuestions = async () => {
        try {
            const phase = await api.getPhaseById(phaseId);
            if (phase?.formFieldsJson) {
                const parsed = JSON.parse(phase.formFieldsJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setQuestions(parsed);
                    setIsLoading(false);
                    return;
                }
            }
            setQuestions([]);
        } catch (error) {
            console.error('Failed to load phase questions:', error);
            setQuestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addQuestion = () => {
        const newQ: Question = {
            id: `q_${Date.now()}`,
            question: '',
            type: 'textarea',
            required: true,
        };
        setQuestions(prev => [...prev, newQ]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const handleSave = async () => {
        const invalid = questions.find(q => !q.question.trim());
        if (invalid) {
            toast.error('All questions must have text');
            return;
        }
        setIsSaving(true);
        try {
            await api.updatePhaseFormFields(phaseId, JSON.stringify(questions));
            toast.success('Questions saved successfully');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save questions');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Edit Questions</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{phaseName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <>
                            {questions.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
                                    No questions yet. Click "Add Question" to start.
                                </div>
                            )}
                            <AnimatePresence>
                                {questions.map((q, index) => (
                                    <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-muted/40 border border-border rounded-xl p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GripVertical size={14} className="text-muted-foreground" />
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Question {index + 1}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(index)}
                                                className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <textarea
                                            value={q.question}
                                            onChange={e => updateQuestion(index, 'question', e.target.value)}
                                            placeholder="Enter question text..."
                                            rows={2}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none placeholder:text-muted-foreground/50 transition-all"
                                        />

                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Type</label>
                                                <select
                                                    value={q.type}
                                                    onChange={e => updateQuestion(index, 'type', e.target.value as Question['type'])}
                                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/40 transition-all"
                                                >
                                                    <option value="textarea">Long text</option>
                                                    <option value="text">Short text</option>
                                                    <option value="number">Number</option>
                                                    <option value="file">File upload</option>
                                                    <option value="pdf">PDF upload</option>
                                                    <option value="image">Image upload</option>
                                                    <option value="videoUrl">Video link (URL)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 pt-4">
                                                <input
                                                    type="checkbox"
                                                    id={`req-${q.id}`}
                                                    checked={q.required}
                                                    onChange={e => updateQuestion(index, 'required', e.target.checked)}
                                                    className="rounded"
                                                />
                                                <label htmlFor={`req-${q.id}`} className="text-xs text-muted-foreground">Required</label>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <button
                                onClick={addQuestion}
                                className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                Add Question
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card/80 flex-shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="gap-2"
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save Questions'}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
