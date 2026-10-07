import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className={`relative p-2 rounded-full transition-colors flex items-center justify-center
        ${theme === 'light' 
          ? 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 shadow-[0_0_10px_rgba(0,186,255,0.1)]' 
          : 'bg-white/5 text-white hover:bg-white/10'
        } border ${theme === 'light' ? 'border-cyan-200' : 'border-border'}`}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          className={`absolute inset-0 transition-all duration-300 ${
            theme === 'dark' ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'
          }`}
          size={20}
        />
        <Moon
          className={`absolute inset-0 transition-all duration-300 ${
            theme === 'light' ? 'scale-0 opacity-0 -rotate-90' : 'scale-100 opacity-100 rotate-0'
          }`}
          size={20}
        />
      </div>
    </motion.button>
  );
}
