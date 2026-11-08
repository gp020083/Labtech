import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { REF_TODAY } from '../utils';
import { addDaysIso, buildWhatsAppDispatchBriefing } from '../utils/limsProcessTools';
import { MessageSquareShare, Copy, CheckCircle2, CalendarDays, X, Sparkles } from 'lucide-react';

export const DailyDispatchModal: React.FC<{
  initialDate?: string;
  onClose: () => void;
}> = ({ initialDate, onClose }) => {
  const { events, jobs, equipment, pushToast } = useApp();
  const { lang, tx } = usePrefs();

  const tomorrowIso = useMemo(() => addDaysIso(REF_TODAY, 1), []);
  const upcomingScheduledDates = useMemo(() => {
    const set = new Set<string>();
    events
      .filter((e) => e.status !== 'cancelled' && e.date >= REF_TODAY)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => set.add(e.date));
    if (set.size === 0) {
      events
        .filter((e) => e.status !== 'cancelled')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .forEach((e) => set.add(e.date));
    }
    return Array.from(set).slice(0, 6);
  }, [events]);

  const defaultTargetDate = useMemo(() => {
    if (initialDate && events.some((e) => e.date === initialDate && e.status !== 'cancelled')) {
      return initialDate;
    }
    if (events.some((e) => e.date === REF_TODAY && e.status !== 'cancelled')) {
      return REF_TODAY;
    }
    if (events.some((e) => e.date === tomorrowIso && e.status !== 'cancelled')) {
      return tomorrowIso;
    }
    return initialDate || upcomingScheduledDates[0] || REF_TODAY;
  }, [initialDate, events, tomorrowIso, upcomingScheduledDates]);

  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate);
  const [copied, setCopied] = useState(false);

  const briefing = useMemo(
    () =>
      buildWhatsAppDispatchBriefing({
        targetDate,
        events,
        jobs,
        equipment,
        lang,
        refToday: REF_TODAY,
      }),
    [targetDate, events, jobs, equipment, lang]
  );

  const [editableText, setEditableText] = useState<string>(briefing.text);

  useEffect(() => {
    setEditableText(briefing.text);
    setCopied(false);
  }, [briefing.text]);

  const handleCopyBriefing = () => {
    navigator.clipboard?.writeText(editableText);
    setCopied(true);
    pushToast(
      tx('已複製 WhatsApp 每日派工通告', 'WhatsApp Daily Dispatch Briefing Copied'),
      tx(`${targetDate} · 共 ${briefing.eventCount} 項排程`, `${targetDate} · ${briefing.eventCount} event(s)`)
    );
    setTimeout(() => setCopied(false), 3000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-2 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">
              <MessageSquareShare className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold">
                {tx(
                  '📆 每日 WhatsApp / 通訊群組派工通告產生器',
                  '📆 WhatsApp / Team Daily Dispatch Briefing Generator'
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                {tx(
                  '自動彙整當日地盤地址、Google Maps 導航連結、主責 AS/Op 同事及建議攜帶之在庫有效器材清單',
                  'Auto-formats site locations, Google Maps links, assigned AS/Op staff, and valid calibrated equipment'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Date Selector Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                <CalendarDays className="h-4 w-4 text-brand" />
                <span>{tx('選擇派工日期 (Dispatch Date)', 'Select Dispatch Date')}</span>
              </div>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-extrabold text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTargetDate(REF_TODAY)}
                className={`rounded-xl px-3 py-1.5 font-extrabold transition cursor-pointer ${
                  targetDate === REF_TODAY
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tx(`今日 (${REF_TODAY})`, `Today (${REF_TODAY})`)}
              </button>
              <button
                type="button"
                onClick={() => setTargetDate(tomorrowIso)}
                className={`rounded-xl px-3 py-1.5 font-extrabold transition cursor-pointer ${
                  targetDate === tomorrowIso
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tx(`明日 (${tomorrowIso})`, `Tomorrow (${tomorrowIso})`)}
              </button>

              {upcomingScheduledDates.map((dt) => {
                if (dt === REF_TODAY || dt === tomorrowIso) return null;
                const count = events.filter((e) => e.date === dt && e.status !== 'cancelled').length;
                return (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setTargetDate(dt)}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-mono font-bold transition cursor-pointer ${
                      targetDate === dt
                        ? 'bg-brand text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-brand/50'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {dt} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Stat Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-bold text-slate-500">{tx('當日排程總數', 'Total Scheduled')}</div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-slate-900 tabular-nums">
                {briefing.eventCount}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-bold text-slate-500">{tx('📍 地盤測試 Site Tests', '📍 Site Tests')}</div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-brand-deep tabular-nums">
                {briefing.siteTestCount}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-bold text-slate-500">{tx('🎓 培訓／HOKLAS', '🎓 Training / Audit')}</div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-violet-700 tabular-nums">
                {briefing.eventCount - briefing.siteTestCount}
              </div>
            </div>
          </div>

          {/* Editable WhatsApp Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800">
                {tx('WhatsApp / 群組訊息預覽（可直接微調文字後一鍵複製）', 'WhatsApp Briefing Preview (Editable before copying)')}
              </label>
              <span className="font-mono text-[11px] text-slate-400">{editableText.length} chars</span>
            </div>
            <textarea
              rows={13}
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {tx('關閉', 'Close')}
          </button>
          <button
            type="button"
            onClick={handleCopyBriefing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied
              ? tx('✓ 已複製！可直接貼上至 WhatsApp 群組', '✓ Copied! Ready to paste in WhatsApp')
              : tx('📋 一鍵複製 WhatsApp 派工通告', '📋 Copy WhatsApp Dispatch Briefing')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
