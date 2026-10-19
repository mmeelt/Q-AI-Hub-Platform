import { ChoiceAnswer } from './ChoiceQuestion';

export interface EventQuestion {
    id: string;
    question: string;
    type: string;
    required?: boolean;
    options?: string[];
    multiple?: boolean;
}

/** The organizer's questions stored on the event (formFieldsJson), without the empty ones. */
export function parseEventQuestions(formFieldsJson: string | null | undefined): EventQuestion[] {
    if (!formFieldsJson) return [];
    try {
        const parsed = JSON.parse(formFieldsJson);
        return Array.isArray(parsed) ? parsed.filter((q: any) => q && String(q.question || '').trim()) : [];
    } catch {
        return [];
    }
}

/** The first required question left empty, if any. */
export function firstUnansweredRequired(questions: EventQuestion[], answers: Record<string, string>) {
    return questions.find(q => q.required && !(answers[q.id] || '').trim());
}

/** Answers keyed by the question text: what the backend checks and what the admin reads. */
export function answersByQuestion(questions: EventQuestion[], answers: Record<string, string>) {
    return Object.fromEntries(questions.map(q => [q.question, answers[q.id] || '']));
}

interface EventQuestionsFieldsProps {
    questions: EventQuestion[];
    answers: Record<string, string>;
    onChange: (id: string, value: string) => void;
}

/** Participant side: one field per question of the event (text, long text or multiple choice). */
export function EventQuestionsFields({ questions, answers, onChange }: EventQuestionsFieldsProps) {
    const fieldClass = 'w-full px-4 py-3 bg-card rounded-xl border border-border text-foreground text-sm outline-none focus:border-primary/50 transition-colors';
    return (
        <div className="space-y-5">
            {questions.map(q => (
                <div key={q.id}>
                    <label className="block text-sm text-foreground mb-2">
                        {q.question} {q.required && <span className="text-destructive">*</span>}
                    </label>
                    {q.type === 'textarea' ? (
                        <textarea value={answers[q.id] || ''} onChange={e => onChange(q.id, e.target.value)}
                            className={`${fieldClass} min-h-[110px] resize-none`} />
                    ) : q.type === 'select' ? (
                        <ChoiceAnswer options={q.options} multiple={q.multiple} value={answers[q.id] || ''}
                            onChange={value => onChange(q.id, value)} />
                    ) : (
                        <input type={q.type === 'number' ? 'number' : 'text'} value={answers[q.id] || ''}
                            onChange={e => onChange(q.id, e.target.value)} className={fieldClass} />
                    )}
                </div>
            ))}
        </div>
    );
}
