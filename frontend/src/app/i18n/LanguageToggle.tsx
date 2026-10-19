import { motion } from 'motion/react';
import { useI18n } from './I18nProvider';

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleLanguage}
      className="relative h-9 min-w-9 px-2 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold tracking-wide transition-colors flex items-center justify-center"
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      {/* Shows the language the click switches to */}
      {language === 'en' ? 'FR' : 'EN'}
    </motion.button>
  );
}
