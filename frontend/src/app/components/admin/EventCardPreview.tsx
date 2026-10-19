import { Calendar, MapPin, Sparkles, ImageOff } from 'lucide-react';

interface EventCardPreviewProps {
    title: string;
    category: string;
    description: string;
    startDate: string;
    location: string;
    imageUrl: string;
}

/** Live preview of the event card participants will see, cover image in its place. */
export function EventCardPreview({ title, category, description, startDate, location, imageUrl }: EventCardPreviewProps) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview: how participants will see it</p>
            <div className="max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="h-40 bg-foreground/[0.04]">
                    {imageUrl ? (
                        <img src={imageUrl} alt="Event cover" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                            <ImageOff size={20} /> No cover image yet
                        </div>
                    )}
                </div>
                <div className="p-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-primary/20 bg-primary/10 text-primary">
                        <Sparkles size={12} /> {category || 'Category'}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-foreground leading-tight">{title || 'Event name'}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{description || 'Event description'}</p>
                    <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} /> {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString() : 'Start date'}
                        </div>
                        <div className="flex items-center gap-2"><MapPin size={14} /> {location || 'Location'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
