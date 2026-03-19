import { Flame } from 'lucide-react';

interface ChatStreakProps {
  count: number;
  size?: 'sm' | 'md';
}

export function ChatStreak({ count, size = 'md' }: ChatStreakProps) {
  if (!count || count < 1) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  const iconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <div className={`flex items-center gap-1 text-orange-500 ${sizeClasses[size]}`}>
      <Flame className={`${iconSize[size]} fill-current`} />
      <span>{count}</span>
    </div>
  );
}
