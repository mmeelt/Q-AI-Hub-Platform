import { useState } from 'react';
import { Upload, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PitchVideo } from './PitchVideo';

const MAX_VIDEO_MB = 200;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v'];

/**
 * Pitch video picker that uploads immediately (with progress) and returns the stored URL.
 * Used where the form is saved separately (e.g. "Manage startup").
 */
export function PitchVideoUploader({ value, onChange }: { value?: string | null; onChange: (url: string) => void }) {
  const [percent, setPercent] = useState<number | null>(null);
  const inputId = 'pitch-video-uploader';

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!VIDEO_EXTENSIONS.includes(ext)) {
      toast.error('Please choose an MP4, MOV or WebM video');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`The video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The maximum is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setPercent(0);
    try {
      const url = await api.uploadFile(file, 'pitch-videos', setPercent);
      onChange(url);
      toast.success('Video uploaded. Click Save to keep it.');
    } catch (err: any) {
      toast.error(err.message || 'Video upload failed');
    } finally {
      setPercent(null);
    }
  };

  return (
    <div className="space-y-3">
      <input id={inputId} type="file" className="hidden" onChange={pick}
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v" disabled={percent !== null} />

      {percent !== null ? (
        <div className="rounded-xl border border-border p-4" role="status" aria-live="polite">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground">Uploading video…</span>
            <span className="text-muted-foreground tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : value ? (
        <>
          <PitchVideo url={value} />
          <div className="flex gap-2">
            <label htmlFor={inputId} className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-foreground/5 text-sm text-foreground">
              <Upload size={14} /> Replace video
            </label>
            <button type="button" onClick={() => onChange('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-destructive/10 text-sm text-destructive">
              <X size={14} /> Remove
            </button>
          </div>
        </>
      ) : (
        <label htmlFor={inputId} className="block border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <Video className="w-9 h-9 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Upload a pitch video from your device</p>
          <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV or WebM · up to {MAX_VIDEO_MB} MB</p>
        </label>
      )}
    </div>
  );
}
