// Shared by the events manager screens: list animations and the application status badge

export const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
export const cardItem = { hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

export function StatusBadge({ status }: { status: string }) {
    const s: Record<string, string> = {
        Accepted: 'bg-brand-teal/15 text-emerald-600 dark:text-brand-teal', 
        ACCEPTED: 'bg-brand-teal/15 text-emerald-600 dark:text-brand-teal',
        Rejected: 'bg-brand-purple/20 text-purple-600 dark:text-brand-purple',
        REJECTED: 'bg-brand-purple/20 text-purple-600 dark:text-brand-purple',
        Pending: 'bg-brand-cyan/20 text-cyan-600 dark:text-brand-cyan',
        PENDING: 'bg-brand-cyan/20 text-cyan-600 dark:text-brand-cyan',
        'Under Review': 'bg-brand-cyan/15 text-cyan-600 dark:text-brand-cyan',
    };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s[status] || 'bg-foreground/10 text-foreground/70'}`}>{status}</span>;
}
