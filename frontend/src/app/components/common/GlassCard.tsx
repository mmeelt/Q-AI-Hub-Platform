import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  gradient?: boolean;
  className?: string;
  /** Stronger frosted effect and blur */
  strong?: boolean;
}

export function GlassCard({ children, gradient = false, className = '', strong = false }: GlassCardProps) {
  const baseStyles = strong
    ? 'glass-strong rounded-3xl shadow-float min-h-0'
    : 'glass rounded-3xl shadow-soft min-h-0';

  const gradientStyles = gradient
    ? 'bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.06] border-border'
    : '';

  return (
    <div className={`${baseStyles} ${gradientStyles} ${className}`}>
      {children}
    </div>
  );
}

