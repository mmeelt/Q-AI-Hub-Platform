import { motion } from 'motion/react';
import logoImg from '../../../assets/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 48, text: 'text-xl' },
    lg: { icon: 80, text: 'text-3xl' },
  };

  const iconSize = sizes[size].icon;

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className="relative"
        style={{
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 1px rgba(255,255,255,0.15))',
          width: iconSize,
          height: iconSize,
        }}
      >
        <img
          src={logoImg}
          alt="Q-AI Hub Logo"
          className="w-full h-full object-contain"
        />
      </motion.div>

      {showText && (
        <span
          className={`${sizes[size].text} font-bold text-foreground`}
          style={{ fontFamily: 'var(--font-heading)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
        >
          Q-AI Hub
        </span>
      )}
    </div>
  );
}
