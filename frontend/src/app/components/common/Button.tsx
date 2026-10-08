import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  children: ReactNode;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const sizes = { sm: 'px-4 py-2', md: 'px-6 py-3' };
  const baseStyles = 'rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm inline-flex items-center justify-center gap-2';

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
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <span className="whitespace-nowrap flex items-center gap-2">{children}</span>
    </motion.button>
  );
});

Button.displayName = 'Button';
