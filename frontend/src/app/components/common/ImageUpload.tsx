import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

// Same formats and size as the backend FileUploadService accepts for images
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Returns an error message if the file is not a JPG/PNG under 10 MB, otherwise null. */
export function imageFileProblem(file: File): string | null {
    const okType = ['image/jpeg', 'image/png'].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name);
    if (!okType) return 'Choose a JPG or PNG image';
    if (file.size > MAX_IMAGE_BYTES) return 'The image must be 10 MB or less';
    return null;
}

interface ImageUploadProps {
    /** Current image URL ('' when none) */
    value: string;
    onChange: (url: string) => void;
    /** Server folder the image is stored in, e.g. "event-covers" */
    folder: string;
    label?: string;
    className?: string;
}

/** Picks a JPG/PNG from the device, uploads it right away and gives back its URL. */
export function ImageUpload({ value, onChange, folder, label = 'Choose an image', className = '' }: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [percent, setPercent] = useState<number | null>(null);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        const problem = imageFileProblem(file);
        if (problem) {
            toast.error(problem);
            return;
        }
        setPercent(0);
        try {
            const url = await api.uploadFile(file, folder, setPercent);
            onChange(url);
            toast.success('Image uploaded');
        } catch (e: any) {
            toast.error(e.message || 'Image upload failed');
        } finally {
            setPercent(null);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className={className}>
            <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} className="hidden"
                onChange={e => pick(e.target.files?.[0])} />
            {value ? (
                <div className="relative overflow-hidden rounded-xl border border-border">
                    <img src={value} alt="" className="h-44 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-black/50 p-2 backdrop-blur-sm">
                        <button type="button" onClick={() => inputRef.current?.click()} disabled={percent !== null}
                            className="flex-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-white disabled:opacity-60">
                            {percent !== null ? `Uploading… ${percent}%` : 'Change image'}
                        </button>
                        <button type="button" onClick={() => onChange('')} disabled={percent !== null} aria-label="Remove image"
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-60">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={percent !== null}
                    className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-foreground/[0.03] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60">
                    {percent !== null ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
                    <span className="text-sm font-medium">{percent !== null ? `Uploading… ${percent}%` : label}</span>
                    <span className="text-xs">JPG or PNG, up to 10 MB</span>
                </button>
            )}
        </div>
    );
}
