import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  children: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  children,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'px-6 py-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm inline-flex items-center justify-center gap-2';

  const variants = {
    primary: 'neon-btn-gradient text-white shadow-lg',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:hover:bg-white/5',
    outline: 'btn-glass-outline shadow-sm',
    danger: 'bg-destructive/90 backdrop-blur-sm text-destructive-foreground border border-destructive/20 hover:bg-destructive shadow-soft hover:shadow-soft-lg',
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ 
        scale: 1.02, 
        y: -1,
        transition: { type: 'spring', stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <span className="whitespace-nowrap flex items-center gap-2">{children}</span>
    </motion.button>
  );
});

Button.displayName = 'Button';
