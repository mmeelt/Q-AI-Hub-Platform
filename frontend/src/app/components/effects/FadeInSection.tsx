import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface FadeInSectionProps {
  children: ReactNode;
  className?: string;
  /** 'fade' | 'fade-up' | 'fade-down' | 'scale' */
  variant?: 'fade' | 'fade-up' | 'fade-down' | 'scale';
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}

const variants = {
  fade: { initial: { opacity: 0 }, visible: { opacity: 1 } },
  'fade-up': { initial: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0 } },
  'fade-down': { initial: { opacity: 0, y: -24 }, visible: { opacity: 1, y: 0 } },
  scale: { initial: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } },
};

export function FadeInSection({
  children,
  className = '',
  variant = 'fade-up',
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.2,
}: FadeInSectionProps) {
  const v = variants[variant];
  return (
    <motion.section
      className={className}
      initial={v.initial}
      whileInView={v.visible}
      viewport={{ once, amount }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.section>
  );
}
