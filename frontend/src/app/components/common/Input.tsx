import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, type, className = '', placeholder, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const isFloating = isFocused || hasValue || !!props.value;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type={inputType}
          placeholder={isFloating ? placeholder : ''}
          className={`w-full px-4 pt-7 pb-2.5 bg-card rounded-xl border transition-all duration-300 outline-none text-sm text-foreground
            ${error
              ? 'border-brand-red animate-shake'
              : isFocused
                ? 'border-border bg-foreground/5 shadow-[0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]'
                : 'border-border'
            }
          `}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            props.onChange?.(e);
          }}
          {...props}
        />
        {isFocused && !error && (
          <div className="absolute inset-0 bg-card rounded-xl -z-10 m-[1px]" />
        )}

        <label
          className={`absolute left-4 transition-all duration-200 pointer-events-none leading-none
            ${isFloating
              ? 'top-2.5 text-[11px] text-muted-foreground'
              : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
            }
          `}
        >
          {label}
        </label>

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive dark:text-brand-red">{error}</p>
      )}
    </div>
  );
}

