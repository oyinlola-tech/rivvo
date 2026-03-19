import { CheckCircle2 } from 'lucide-react';

interface VerificationBadgeProps {
  role: 'user' | 'admin' | 'moderator';
  size?: 'sm' | 'md' | 'lg';
}

export function VerificationBadge({ role, size = 'md' }: VerificationBadgeProps) {
  if (role === 'user') {
    return null;
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const color = role === 'admin' ? 'text-foreground' : 'text-muted-foreground';

  return (
    <CheckCircle2
      className={`${sizeClasses[size]} ${color} fill-current`}
      aria-label={role === 'admin' ? 'Admin' : 'Moderator'}
    />
  );
}
