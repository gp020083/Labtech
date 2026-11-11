import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { CalendarEvent } from '../types';
import { REF_TODAY, daysBetween } from '../utils';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { DailyDispatchModal } from '../components/DailyDispatchModal';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  MapPin,
  Users,
  Clock,
  Edit3,
  MessageSquareShare,
  FileText,
} from 'lucide-react';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function mapTestToStp(raw?: string): string {
  if (!raw) return 'KD';
  const m: Record<string, string> = {
    koden: 'KD',
    sonic: 'SO',
    flowcone_bleeding: 'FC',
    point_load: 'PO',
    plate_load: 'PLT',
  };
  return m[raw.toLowerCase()] || raw.toUpperCase();
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: total }, (_, idx) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx);
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: d.getDate(),
      weekday: d.getDay(),
      inMonth: d.getMonth() === month,
    };
  });
}

export const MobileCalendarView: React.FC = () => {
  const { events, user, setStpPreviewCode, openPreviewDoc } = useApp();
  const { lang, tx } = usePrefs();
  const [initY, initM] = useMemo(() => REF_TODAY.split('-').map(Number), []);
  const [year, setYear] = useState(initY || 2026);
  const [month, setMonth] = useState((initM || 11) - 1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'site_test' | 'training' | 'hoklas'>('all');
  const [myOnly, setMyOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(REF_TODAY);
  const [modalState, setModalState] = useState<{ date: string; ev?: CalendarEvent } | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const holidayMap = useMemo(() => new Map(STATIC_DATA.holidays.map((h: any) => [h.date, h])), []);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (typeFilter !== 'all' && ev.type !== typeFilter) continue;
      if (myOnly && user && !ev.operators.includes(user.name) && !ev.signatories.includes(user.name)) continue;
      m.set(ev.date, [...(m.get(ev.date) || []), ev]);
    }
    return m;
  }, [events, typeFilter, myOnly, user]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= REF_TODAY && (typeFilter === 'all' || e.type === typeFilter))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, typeFilter]
  );

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const dayEvents = eventsByDate.get(selectedDate) || [];
  const selectedHoliday = holidayMap.get(selectedDate) as any;
  const weekdays = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_ZH;

  return (
    <div className="space-y-2.5 pb-3 w-full min-w-0 text-xs">
      {/* Header Card */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-slate-900 leading-snug">
            {tx('工程及培訓排程月曆', 'Field Schedule Calendar')}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand" />
              {tx('地盤測試', 'Site')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              {tx('培訓', 'Training')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>HOKLAS</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setDispatchOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 font-extrabold text-emerald-800 active:bg-emerald-100 whitespace-nowrap cursor-pointer"
          >
            <MessageSquareShare className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{tx('派工單', 'Brief')}</span>
          </button>
          <button
            type="button"
            onClick={() => setModalState({ date: selectedDate })}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-brand px-3 font-extrabold text-white active:bg-brand-deep whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{tx('新增', 'Add')}</span>
          </button>
        </div>
      </div>

      {/* Filter Pills — sized & padded so all 5 pills fit cleanly on 390px without clipping */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-4">
        {(
          [
            ['all', tx('全部', 'All')],
            ['site_test', tx('地盤測試', 'Site')],
            ['training', tx('內部培訓', 'Training')],
            ['hoklas', 'HOKLAS'],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTypeFilter(k)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-2.5 font-extrabold shrink-0 whitespace-nowrap transition cursor-pointer ${
              typeFilter === k
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-700'
            }`}
          >
            {lbl}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMyOnly(!myOnly)}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-2.5 font-extrabold shrink-0 whitespace-nowrap transition cursor-pointer ${
            myOnly
              ? 'bg-brand text-white shadow-2xs'
              : 'border border-slate-200 bg-white text-slate-700'
          }`}
        >
          {tx('我的排程', 'Mine')}
        </button>
        <span aria-hidden="true" className="w-2 shrink-0" />
      </div>

      {/* Month Grid Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={tx('上個月', 'Previous Month')}
            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 active:bg-slate-50 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {lang === 'en'
                ? `${new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })} ${year}`
                : `${year} 年 ${month + 1} 月`}
            </span>
            <button
              type="button"
              onClick={() => {
                setYear(initY || 2026);
                setMonth((initM || 11) - 1);
                setSelectedDate(REF_TODAY);
              }}
              className="inline-flex min-h-[36px] items-center justify-center rounded-xl bg-slate-100 px-2.5 text-[11px] font-extrabold text-slate-700 active:bg-slate-200 cursor-pointer"
            >
              {tx('今日', 'Today')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={tx('下個月', 'Next Month')}
            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 active:bg-slate-50 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 pb-1.5 text-center text-[11px] font-extrabold text-slate-400">
          {weekdays.map((w, i) => (
            <div key={i} className={i === 0 ? 'text-rose-500' : ''}>
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            const hol = holidayMap.get(c.key);
            const evs = eventsByDate.get(c.key) || [];
            const isSel = c.key === selectedDate;
            const isToday = c.key === REF_TODAY;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedDate(c.key)}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl py-1 tabular-nums transition cursor-pointer ${
                  !c.inMonth ? 'opacity-30' : ''
                } ${
                  isSel
                    ? 'bg-violet-600 text-white shadow-xs'
                    : isToday
                    ? 'bg-brand-wash ring-1 ring-brand'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-xs font-extrabold leading-none ${
                    isSel
                      ? 'text-white'
                      : isToday
                      ? 'text-brand-deep'
                      : hol || c.weekday === 0
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {c.day}
                </span>
                <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                  {evs.slice(0, 3).map((ev, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSel
                          ? 'bg-white'
                          : ev.type === 'training'
                          ? 'bg-violet-600'
                          : ev.type === 'hoklas'
                          ? 'bg-amber-500'
                          : 'bg-brand'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="min-w-0">
            <div className="font-mono text-sm font-extrabold text-slate-900 tabular-nums">
              {selectedDate}
            </div>
            {selectedHoliday && (
              <div className="mt-0.5 text-[11px] font-bold text-rose-600 truncate">
                {lang === 'en'
                  ? selectedHoliday.name || selectedHoliday.zh
                  : selectedHoliday.zh || selectedHoliday.name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalState({ date: selectedDate })}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1 rounded-xl bg-violet-50 px-3 font-extrabold text-violet-700 active:bg-violet-100 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>{tx('新增排程', 'Add Event')}</span>
          </button>
        </div>

        {dayEvents.length === 0 ? (
          <div className="py-5 text-center font-semibold text-slate-400">
            {tx('當日暫無排程項目', 'No scheduled events on this date')}
          </div>
        ) : (
          dayEvents.map((ev) => {
            const stpCode = mapTestToStp(ev.tests[0]);
            return (
              <div
                key={ev.id}
                className={`rounded-2xl border p-3.5 space-y-2.5 ${
                  ev.type === 'training'
                    ? 'border-violet-200 bg-violet-50/50'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold text-white ${
                      ev.type === 'training'
                        ? 'bg-violet-600'
                        : ev.type === 'hoklas'
                        ? 'bg-amber-600'
                        : 'bg-brand'
                    }`}
                  >
                    {ev.type === 'training' ? 'Training' : ev.type === 'hoklas' ? 'HOKLAS' : 'Site Test'}
                  </span>
                  {ev.timeSlot && (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-600 tabular-nums">
                      <Clock className="h-3 w-3 shrink-0" />
                      {ev.timeSlot}
                    </span>
                  )}
                </div>

                <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">
                  {ev.title || ev.site}
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="break-words min-w-0">{ev.site}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span className="break-words min-w-0">{ev.operators.join(', ') || 'TBD'}</span>
                  </div>
                  {ev.notes && (
                    <div className="rounded-xl bg-white p-2.5 text-slate-700 break-words">{ev.notes}</div>
                  )}
                  {ev.attachments && ev.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {ev.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() =>
                            openPreviewDoc({
                              title: att.fileName,
                              url: att.dataUrl || '',
                              fileName: att.fileName,
                              subtitle: `${att.serverPath} · ${att.fileSize}`,
                            })
                          }
                          className="inline-flex min-h-[40px] max-w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-brand" />
                          <span className="truncate max-w-[200px]">{att.fileName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2">
                  <button
                    type="button"
                    onClick={() => setStpPreviewCode(stpCode)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 font-extrabold text-violet-700 active:bg-violet-50 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span>{tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalState({ date: ev.date, ev })}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 active:bg-slate-50 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 shrink-0" />
                    <span>{tx('編輯及附件', 'Edit & Docs')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upcoming Schedule */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-slate-900">{tx('近期排程', 'Upcoming')}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 tabular-nums">
            {upcoming.length}
          </span>
        </div>
        {upcoming.slice(0, 6).map((tr) => {
          const diff = daysBetween(REF_TODAY, tr.date);
          return (
            <button
              key={tr.id}
              type="button"
              onClick={() => {
                const [y, m] = tr.date.split('-').map(Number);
                setYear(y);
                setMonth(m - 1);
                setSelectedDate(tr.date);
              }}
              className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left active:bg-brand-wash/40 transition cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] font-bold text-slate-500 tabular-nums">
                  {tr.date}
                  {tr.timeSlot ? ` · ${tr.timeSlot}` : ''}
                </div>
                <div className="truncate font-extrabold text-slate-900">{tr.title || tr.site}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-extrabold tabular-nums shrink-0 ${
                  diff === 0 ? 'bg-rose-100 text-rose-700' : 'bg-brand-wash text-brand-deep'
                }`}
              >
                {diff === 0 ? tx('今日', 'Today') : tx(`${diff}日後`, `In ${diff}d`)}
              </span>
            </button>
          );
        })}
      </div>

      {modalState && (
        <CalendarEventModal
          initialDate={modalState.date}
          existing={modalState.ev || null}
          onClose={() => setModalState(null)}
        />
      )}
      {dispatchOpen && (
        <DailyDispatchModal initialDate={selectedDate} onClose={() => setDispatchOpen(false)} />
      )}
    </div>
  );
};
