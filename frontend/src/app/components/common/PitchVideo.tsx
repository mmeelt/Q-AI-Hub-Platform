import { ExternalLink, Video } from 'lucide-react';
import { parseVideoUrl } from '../../utils/video';

/** Shows a pitch video link: embedded YouTube/Vimeo/Drive player, HTML5 video, or an "open" link. */
export function PitchVideo({ url, title = 'Pitch video', emptyText = 'No pitch video' }: {
  url?: string | null;
  title?: string;
  emptyText?: string;
}) {
  const video = parseVideoUrl(url);

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-8">
        <Video className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/60">{emptyText}</p>
      </div>
    );
  }

  const openLink = (
    <a href={video.url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
      <ExternalLink size={12} /> Open the video in a new tab
    </a>
  );

  if (video.kind === 'link') {
    return (
      <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
        <p className="text-sm text-muted-foreground">This link cannot be played here.</p>
        {openLink}
      </div>
    );
  }

  return (
    <div>
      <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-black">
        {video.kind === 'embed' ? (
          <iframe
            src={video.src}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video src={video.src} controls preload="metadata" className="absolute inset-0 w-full h-full object-contain" />
        )}
      </div>
      {video.kind === 'embed' && openLink}
    </div>
  );
}
