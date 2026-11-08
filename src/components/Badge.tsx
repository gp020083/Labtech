import React from 'react';

export type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'brand' | 'mute';

const TONE_MAP: Record<BadgeTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/25',
  warn: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25',
  bad: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/25',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/25',
  brand: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/25',
  mute: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'mute', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE_MAP[tone]} ${className}`}
  >
    {children}
  </span>
);
