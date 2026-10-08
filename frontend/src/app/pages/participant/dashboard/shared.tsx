import type { ReactNode } from 'react';
import { motion } from 'motion/react';

/** Fade-in wrapper used by every dashboard tab. */
export function TabPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}

export const statusColors: Record<string, string> = {
  Pending: 'bg-brand-amber/20 text-amber-600 dark:text-brand-amber',
  'Under Review': 'bg-primary/20 text-primary',
  Accepted: 'bg-foreground/15 text-foreground/90',
  Rejected: 'bg-destructive/20 text-destructive',
  Registered: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  PENDING: 'bg-brand-amber/20 text-amber-600 dark:text-brand-amber',
  ACCEPTED: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  REJECTED: 'bg-destructive/20 text-destructive',
};

export const isAcceptedApplication = (app: any) =>
  app.status?.toLowerCase() === 'accepted' || app.applicationStatus?.toLowerCase() === 'accepted';

/** The backend can occasionally return duplicates (after migrations/retries). */
export const dedupeNotifications = (items: any[]) =>
  Array.from(
    new Map(
      (Array.isArray(items) ? items : []).map((n: any) => [
        String(n.notificationId ?? n.id ?? JSON.stringify([n.notificationTitle ?? n.title, n.notificationMessage ?? n.message, n.notificationCreatedAt ?? n.createdAt ?? n.date])),
        n,
      ])
    ).values()
  );

/** Phase data loaded by the dashboard for accepted applications, keyed by application id / event id. */
export interface PhaseData {
  phaseSubmissions: Record<string, any[]>;
  eventPhases: Record<string, any[]>;
}
