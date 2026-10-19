import { useState } from 'react';
import { Check, List, Plus, X } from 'lucide-react';

// Several answers to one multiple choice question are stored as one string
const ANSWER_SEPARATOR = ', ';

export function cleanOptions(options: string[] | undefined): string[] {
    return (options || []).map(o => o.trim()).filter(Boolean);
}

interface ChoiceOptionsEditorProps {
    options: string[] | undefined;
    onChange: (options: string[]) => void;
    /** Several answers may be ticked instead of one */
    multiple?: boolean;
    onMultipleChange?: (multiple: boolean) => void;
}

/** Admin side: the answer choices of a multiple choice question, one input per choice. */
export function ChoiceOptionsEditor({ options, onChange, multiple, onMultipleChange }: ChoiceOptionsEditorProps) {
    const list = options && options.length > 0 ? options : [''];
    const [draft, setDraft] = useState('');

    const update = (index: number, value: string) => onChange(list.map((o, i) => (i === index ? value : o)));
    const remove = (index: number) => onChange(list.filter((_, i) => i !== index));
    const add = () => {
        const value = draft.trim();
        if (!value) return;
        onChange([...list.filter(o => o.trim()), value]);
        setDraft('');
    };

    return (
        <div className="mt-3 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <List size={13} /> Answer choices
                </span>
                {onMultipleChange && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" checked={!!multiple} onChange={e => onMultipleChange(e.target.checked)} className="rounded" />
                        Several answers allowed
                    </label>
                )}
            </div>
            {list.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex-shrink-0 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(65 + index)}
                    </span>
                    <input
                        type="text"
                        value={option}
                        onChange={e => update(index, e.target.value)}
                        placeholder={`Choice ${index + 1}`}
                        className="flex-1 px-3 py-2 bg-background rounded-lg border border-border text-sm text-foreground outline-none focus:border-indigo-500/40 placeholder:text-muted-foreground/40"
                    />
                    {list.length > 1 && (
                        <button type="button" onClick={() => remove(index)} aria-label="Remove this choice"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                            <X size={14} />
                        </button>
                    )}
                </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                    placeholder="New choice, then Enter"
                    className="flex-1 px-3 py-2 bg-background rounded-lg border border-dashed border-border text-sm text-foreground outline-none focus:border-indigo-500/40 placeholder:text-muted-foreground/40"
                />
                <button type="button" onClick={add} disabled={!draft.trim()}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40 transition-all">
                    <Plus size={14} /> Add choice
                </button>
            </div>
        </div>
    );
}

interface ChoiceAnswerProps {
    options: string[] | undefined;
    multiple?: boolean;
    value: string;
    onChange: (value: string) => void;
}

/** Participant side: pick one choice (or several when the question allows it). */
export function ChoiceAnswer({ options, multiple, value, onChange }: ChoiceAnswerProps) {
    const choices = cleanOptions(options);
    const selected = value ? value.split(ANSWER_SEPARATOR) : [];

    const toggle = (choice: string) => {
        if (!multiple) {
            onChange(choice);
            return;
        }
        const next = selected.includes(choice) ? selected.filter(s => s !== choice) : [...selected, choice];
        // Keep the admin's order of the choices
        onChange(choices.filter(c => next.includes(c)).join(ANSWER_SEPARATOR));
    };

    if (choices.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No choices were set for this question.</p>;
    }

    return (
        <div className="space-y-2">
            {multiple && <p className="text-xs text-muted-foreground">You can choose several answers.</p>}
            {choices.map((choice, index) => {
                const active = selected.includes(choice);
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => toggle(choice)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${active
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                    >
                        <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border ${multiple ? 'rounded-md' : 'rounded-full'} ${active ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                            {active && <Check size={12} />}
                        </span>
                        {choice}
                    </button>
                );
            })}
        </div>
    );
}
