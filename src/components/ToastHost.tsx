import React from 'react';
import { useApp } from '../store';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export const ToastHost: React.FC = () => {
  const { toasts } = useApp();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-xs shadow-xl"
        >
          {t.tone === 'warn' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#a35f00] mt-0.5" />
          ) : t.tone === 'info' ? (
            <Info className="h-4 w-4 shrink-0 text-[#1d6fc0] mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1f7a4d] mt-0.5" />
          )}
          <div className="min-w-0">
            <div className="font-bold text-ink">{t.title}</div>
            {t.detail && (
              <div className="mt-0.5 break-all text-[11px] text-ink-soft">{t.detail}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
