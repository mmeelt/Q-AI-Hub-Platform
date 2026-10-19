import { Link } from 'react-router-dom';
import { Compass, Home, CalendarDays } from 'lucide-react';
import { Navigation } from '../../components/layout/Navigation';
import { Footer } from '../../components/layout/Footer';
import { useI18n } from '../../i18n/I18nProvider';

/** Shown for any unknown address (instead of silently sending the visitor to the home page). */
export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-16">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass size={30} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">{t('notFound.code')}</p>
          <h1 className="text-3xl font-bold text-foreground mb-3">{t('notFound.title')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('notFound.text')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
              <Home size={16} /> {t('notFound.home')}
            </Link>
            <Link to="/events" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-foreground/5 transition-all">
              <CalendarDays size={16} /> {t('notFound.events')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
