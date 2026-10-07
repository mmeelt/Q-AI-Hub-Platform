// Initials avatar drawn locally (no third-party service receives the user's name or email).
export function initialsOf(name?: string) {
  const parts = (name || '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return parts.slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';
}

export function Avatar({ name, className = 'w-9 h-9 rounded-full text-xs' }: { name?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center font-bold bg-gradient-to-br from-brand-mint to-brand-sky text-brand-navy ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
