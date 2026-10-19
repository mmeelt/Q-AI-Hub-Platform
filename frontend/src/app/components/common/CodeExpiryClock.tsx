import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';

/** Default lifetime of an emailed code (the API sends the real value as expiresIn). */
export const DEFAULT_CODE_SECONDS = 120;

const storageKey = (sessionId: string) => `codeExpiresAt:${sessionId}`;

/**
 * Seconds left before the code of this session expires, updated every second.
 * The deadline is kept per session id, so a page refresh does not restart the clock,
 * and a new session id (after "Resend code") starts a new one.
 */
export function useCodeExpiry(sessionId: string | undefined, seconds: number = DEFAULT_CODE_SECONDS) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    if (!sessionId) return;
    let deadline = 0;
    try {
      deadline = Number(sessionStorage.getItem(storageKey(sessionId))) || 0;
    } catch { /* storage unavailable: the clock just restarts on refresh */ }
    if (!deadline) {
      deadline = Date.now() + seconds * 1000;
      try { sessionStorage.setItem(storageKey(sessionId), String(deadline)); } catch { /* ignore */ }
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sessionId, seconds]);

  return secondsLeft;
}

const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** "Code expires in 1:59" with a shrinking bar; turns red in the last 20 seconds. */
export function CodeExpiryClock({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const { t } = useI18n();
  const expired = secondsLeft <= 0;
  const urgent = !expired && secondsLeft <= 20;
  const percent = Math.max(0, Math.min(100, (secondsLeft / Math.max(total, 1)) * 100));
  const tone = expired || urgent ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="w-full max-w-[320px] mx-auto" role="timer" aria-live="polite">
      <div className={`flex items-center justify-center gap-2 text-sm font-medium ${tone}`}>
        <Clock size={15} />
        {expired ? (
          <span>{t('common.codeExpired')}</span>
        ) : (
          <span>
            {t('common.codeExpiresIn')} <span className="font-mono tabular-nums font-semibold">{format(secondsLeft)}</span>
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent || expired ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
