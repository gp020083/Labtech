import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { CalendarEvent } from '../types';
import { REF_TODAY } from '../utils';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { DailyDispatchModal } from '../components/DailyDispatchModal';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, BookOpen, MapPin, Users, Clock, Edit3, MessageSquareShare, FileText } from 'lucide-react';

const WEEKDAYS_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function mapTestToStp(raw?: string): string {
  if (!raw) return 'KD';
  const m: Record<string, string> = {
    koden: 'KD', sonic: 'SO', flowcone_bleeding: 'FC', point_load: 'PO', plate_load: 'PLT',
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

export const CalendarPage: React.FC = () => {
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
  const detailWindowRef = useRef<HTMLDivElement>(null);

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

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    requestAnimationFrame(() => {
      detailWindowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const selectedDayEvents = eventsByDate.get(selectedDate) || [];
  const selectedHoliday = holidayMap.get(selectedDate) as any;
  const weekdays = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_ZH;
  const selectedWeekdayIdx = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).getDay();
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Compact Header & Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 sm:px-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
              {tx('工程及排程日曆', 'Project & Field Schedule')}
            </h1>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
                title={tx('上個月', 'Previous month')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-28 px-2 text-center text-sm font-extrabold text-slate-900 tabular-nums">
                {lang === 'en'
                  ? `${new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })} ${year}`
                  : `${year} 年 ${month + 1} 月`}
              </span>
              <button
                type="button"
                onClick={() => shift(1)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
                title={tx('下個月', 'Next month')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setYear(initY || 2026);
                  setMonth((initM || 11) - 1);
                  setSelectedDate(REF_TODAY);
                }}
                className="ml-0.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
              >
                {tx('今日', 'Today')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDispatchOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
            >
              <MessageSquareShare className="h-3.5 w-3.5 text-emerald-700" />
              {tx('WhatsApp 派工通告', 'WhatsApp Dispatch')}
            </button>
            <button
              type="button"
              onClick={() => setModalState({ date: selectedDate })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" /> {tx('新增排程', 'Add Event')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {([
              ['all', tx('全部', 'All')],
              ['site_test', tx('現場測試', 'Site Test')],
              ['training', tx('內部培訓', 'Training')],
              ['hoklas', tx('HOKLAS 評審', 'HOKLAS')],
            ] as const).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTypeFilter(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  typeFilter === k
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {lbl}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMyOnly(!myOnly)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                myOnly
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tx('只看我的排程', 'My Schedule Only')}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> {tx('現場測試', 'Site Test')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-600" /> {tx('內部培訓', 'Training')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> HOKLAS
            </span>
          </div>
        </div>
      </div>

      {/* Full-Width Large Calendar Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center text-xs font-extrabold text-slate-600">
          {weekdays.map((w, i) => (
            <div key={w} className={`py-3 ${i === 0 ? 'text-rose-600' : ''}`}>
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((c) => {
            const hol = holidayMap.get(c.key) as any;
            const dayEvents = eventsByDate.get(c.key) || [];
            const isSelected = c.key === selectedDate;
            const isToday = c.key === REF_TODAY;

            return (
              <div
                key={c.key}
                onClick={() => handleSelectDate(c.key)}
                className={`min-h-[108px] sm:min-h-[142px] lg:min-h-[158px] border-b border-r border-slate-100 p-2 sm:p-2.5 transition flex flex-col justify-between cursor-pointer ${
                  !c.inMonth
                    ? 'bg-slate-50/60 text-slate-300'
                    : isSelected
                      ? 'bg-brand-wash/35'
                      : 'bg-white hover:bg-slate-50/80'
                } ${isSelected ? 'ring-2 ring-inset ring-brand' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs sm:text-sm font-extrabold tabular-nums ${
                        isToday
                          ? 'bg-brand text-white shadow-2xs'
                          : isSelected
                            ? 'bg-slate-900 text-white'
                            : hol || c.weekday === 0
                              ? 'text-rose-600'
                              : 'text-slate-800'
                      }`}
                    >
                      {c.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 tabular-nums">
                        {dayEvents.length} {tx('項', '')}
                      </span>
                    )}
                  </div>

                  {hol && (
                    <div className="mt-1 truncate text-[11px] font-bold text-rose-600">
                      {lang === 'en' ? hol.name || hol.zh : hol.zh || hol.name}
                    </div>
                  )}

                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const pillStyle =
                        ev.type === 'training'
                          ? 'border-violet-200 bg-violet-50 text-violet-950'
                          : ev.type === 'hoklas'
                            ? 'border-amber-200 bg-amber-50 text-amber-950'
                            : 'border-blue-200 bg-blue-50/80 text-slate-900';
                      const dotColor =
                        ev.type === 'training'
                          ? 'bg-violet-600'
                          : ev.type === 'hoklas'
                            ? 'bg-amber-500'
                            : 'bg-brand';

                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1.5 truncate rounded-lg border px-2 py-1 text-[11px] font-bold leading-tight ${pillStyle}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                          <span className="truncate">{ev.title || ev.site}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="pl-1 text-[11px] font-extrabold text-slate-500">
                        +{dayEvents.length - 3} {tx('更多排程', 'more')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Window Below Calendar */}
      <div
        ref={detailWindowRef}
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-wash text-brand-deep">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-base sm:text-lg font-extrabold text-slate-900">
                  {selectedDate}
                </h2>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {weekdays[selectedWeekdayIdx]}
                </span>
                {selectedHoliday && (
                  <span className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">
                    {lang === 'en' ? selectedHoliday.name || selectedHoliday.zh : selectedHoliday.zh || selectedHoliday.name}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500">
                  {tx(`共 ${selectedDayEvents.length} 項排程`, `${selectedDayEvents.length} scheduled item(s)`)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalState({ date: selectedDate })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {tx('於此日期新增排程', 'Add Event on This Date')}
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <p className="text-sm font-bold text-slate-500">
              {tx(`${selectedDate} 暫無排程項目`, `No schedule items on ${selectedDate}`)}
            </p>
            <button
              type="button"
              onClick={() => setModalState({ date: selectedDate })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {tx('立即新增排程', 'Create Schedule Item')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {selectedDayEvents.map((ev) => {
              const stpCode = mapTestToStp(ev.tests[0]);
              const badgeStyle =
                ev.type === 'training'
                  ? 'bg-violet-600 text-white'
                  : ev.type === 'hoklas'
                    ? 'bg-amber-500 text-white'
                    : 'bg-brand text-white';
              const typeLabel =
                ev.type === 'training'
                  ? tx('內部培訓', 'Training')
                  : ev.type === 'hoklas'
                    ? 'HOKLAS'
                    : tx('現場測試', 'Site Test');

              return (
                <div
                  key={ev.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 hover:border-slate-300 hover:bg-white transition space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={`rounded-md px-2 py-0.5 font-extrabold ${badgeStyle}`}>
                        {typeLabel}
                      </span>
                      {ev.timeSlot && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {ev.timeSlot}
                        </span>
                      )}
                    </div>

                    <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {ev.title || ev.site}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                        <span className="font-semibold text-slate-800">{ev.site}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Users className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                        <span>{ev.operators.join('、') || tx('待定', 'TBD')}</span>
                      </div>
                      {ev.notes && (
                        <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] text-slate-700">
                          {ev.notes}
                        </div>
                      )}
                      {ev.attachments && ev.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
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
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand-deep cursor-pointer"
                            >
                              <FileText className="h-3 w-3 text-brand shrink-0" />
                              <span className="truncate max-w-[200px]">{att.fileName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setStpPreviewCode(stpCode)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalState({ date: ev.date, ev })}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {tx('編輯 / 附件', 'Edit / Docs')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalState && (
        <CalendarEventModal
          initialDate={modalState.date}
          existing={modalState.ev || null}
          onClose={() => setModalState(null)}
        />
      )}
      {dispatchOpen && (
        <DailyDispatchModal
          initialDate={selectedDate}
          onClose={() => setDispatchOpen(false)}
        />
      )}
    </div>
  );
};
