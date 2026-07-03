import React from 'react';
import type { Toast } from '../App';

interface MilestoneToastProps {
  toasts: Toast[];
}

export function MilestoneToast({ toasts }: MilestoneToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-card border border-primary/40 rounded-lg px-4 py-3 shadow-[0_0_20px_rgba(0,200,200,0.2)] font-mono text-sm max-w-xs animate-in slide-in-from-left-4 fade-in"
          style={{ borderLeft: '3px solid hsl(var(--primary))' }}
        >
          <span className="text-foreground">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
