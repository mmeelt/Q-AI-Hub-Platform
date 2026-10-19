import { Linkedin, Github, Instagram } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useI18n } from '../../i18n/I18nProvider';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative z-10 bg-background border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left: Logo + Tagline + Socials */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-muted-foreground text-sm">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Github size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-brand-mint transition-colors"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Center: Quick Links */}
          <div>
            <h4 className="text-foreground mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#vision" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  {t('nav.vision')}
                </a>
              </li>
              <li>
                <a href="#programs" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  {t('nav.programs')}
                </a>
              </li>
              <li>
                <a href="#events" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  {t('footer.events')}
                </a>
              </li>
              <li>
                <a href="#apply" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  {t('footer.apply')}
                </a>
              </li>
            </ul>
          </div>

          {/* Right: Contact */}
          <div>
            <h4 className="text-foreground mb-4">{t('footer.contact')}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>ENICarthage</p>
              <p>{t('footer.campus')}</p>
              <p>contact@qai-hub.tn</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>{t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
