import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function GradientButton({
  children,
  fullWidth,
  className = '',
  ...props
}: GradientButtonProps) {
  return (
    <Button
      variant="primary"
      fullWidth={fullWidth}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

