import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface FloatingGlassPanelProps {
  children: ReactNode;
  className?: string;
  /** Layered depth: higher = more lift and shadow */
  depth?: 'sm' | 'md' | 'lg';
}

const depthStyles = {
  sm: 'shadow-sm hover:shadow-md',
  md: 'shadow-md hover:shadow-lg',
  lg: 'shadow-lg hover:shadow-xl',
};

export function FloatingGlassPanel({ children, className = '', depth = 'md' }: FloatingGlassPanelProps) {
  return (
    <motion.div
      className={`glass-strong rounded-3xl border border-border transition-shadow duration-300 ${depthStyles[depth]} ${className}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      {children}
    </motion.div>
  );
}
