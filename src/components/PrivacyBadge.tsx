import { Lock } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      <span>Your photo never leaves this browser</span>
    </div>
  );
}
