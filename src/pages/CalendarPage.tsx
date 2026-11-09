import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { CalendarEvent } from '../types';
import { REF_TODAY, daysBetween } from '../utils';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { DailyDispatchModal } from '../components/DailyDispatchModal';
import { SERVER_MASTER_SCHEDULES } from '../data/serverScheduleEvents';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, BookOpen, MapPin, Users, Clock, Edit3, MessageSquareShare, FileText, FolderOpen } from 'lucide-react';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
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

  const holidayMap = useMemo(() => new Map(STATIC_DATA.holidays.map((h: any) => [h.date, h])), []);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.date >= REF_TODAY && (typeFilter === 'all' || e.type === typeFilter)).sort((a, b) => a.date.localeCompare(b.date)),
    [events, typeFilter]
  );

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

  const selectedDayEvents = eventsByDate.get(selectedDate) || [];
  const selectedHoliday = holidayMap.get(selectedDate) as any;
  const weekdays = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_ZH;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-[11px] font-extrabold text-violet-800">
            <CalendarDays className="h-3.5 w-3.5" /> PROJECT &amp; SCHEDULE CALENDAR
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {tx('Calendar — 工程及工作排程日曆', 'Calendar — Project & Field Schedule')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {tx('查閱每日地盤測試（Site Test）、內部培訓（Training）及 HOKLAS 評審日程，並可直接檢視對應之受控 STP。', 'View daily Site Tests, Training sessions, and HOKLAS audit schedules with direct access to Controlled STPs.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDispatchOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
          >
            <MessageSquareShare className="h-4 w-4 text-emerald-700" />
            {tx('複製今日／明日 WhatsApp 派工通告', 'WhatsApp Daily Dispatch')}
          </button>
          <button type="button" onClick={() => setModalState({ date: selectedDate })} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-brand-deep cursor-pointer whitespace-nowrap">
            <Plus className="h-4 w-4" /> {tx('新增排程項目', 'Add Schedule Event')}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <FolderOpen className="h-4 w-4 text-violet-600" />
            {tx('伺服器排程總表及會議紀錄 (Server Schedules & Programme)', 'Server Master Schedules & Programme Docs')}
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {tx('已同步 LTData\\New Structure 最新排程、進度及校準時間表', 'Synced with LTData\\New Structure schedules, progress & calibration tables')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SERVER_MASTER_SCHEDULES.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() =>
                openPreviewDoc({
                  title: lang === 'en' ? doc.titleEn : doc.titleZh,
                  url: doc.url,
                  fileName: doc.fileName,
                  subtitle: `${lang === 'en' ? doc.subtitleEn : doc.subtitleZh} · ${doc.fileSize}`,
                })
              }
              className="flex items-start justify-between gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 text-left hover:border-violet-400 hover:bg-violet-50/40 transition cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="truncate text-xs font-extrabold text-slate-900">{lang === 'en' ? doc.titleEn : doc.titleZh}</span>
                </div>
                <div className="truncate text-[11px] text-slate-500">{lang === 'en' ? doc.subtitleEn : doc.subtitleZh}</div>
              </div>
              <span className="shrink-0 rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-800">{doc.badge}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <CalendarDays className="h-4 w-4 text-brand" />
            {tx(`近期排程項目 (${upcomingEvents.length})`, `Upcoming Schedule (${upcomingEvents.length})`)}
          </div>
          <span className="text-[11px] font-semibold text-slate-500">{tx('點擊項目可跳至該日期', 'Click item to jump to date')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcomingEvents.slice(0, 6).map((tr) => {
            const diff = daysBetween(REF_TODAY, tr.date);
            const stpCode = mapTestToStp(tr.tests[0]);
            return (
              <div
                key={tr.id}
                onClick={() => {
                  const [y, m] = tr.date.split('-').map(Number);
                  setYear(y); setMonth(m - 1); setSelectedDate(tr.date);
                }}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5 hover:border-brand/50 hover:bg-white transition cursor-pointer space-y-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-extrabold text-slate-800">{tr.date} {tr.timeSlot ? `· ${tr.timeSlot}` : ''}</span>
                    <span className={`rounded-full px-2 py-0.5 font-extrabold ${diff === 0 ? 'bg-rose-100 text-rose-700' : 'bg-brand-wash text-brand-deep'}`}>
                      {diff === 0 ? tx('今日 Today', 'Today') : tx(`${diff} 日後`, `In ${diff}d`)}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">{tr.title || tr.site}</div>
                  <div className="text-[11px] text-slate-500 truncate">{tr.site} ｜ {tr.operators.map((o) => o.split(',')[1]?.trim() || o).join(', ')}</div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setStpPreviewCode(stpCode); }} className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-extrabold text-brand-deep hover:bg-brand-wash cursor-pointer">
                    <BookOpen className="h-3 w-3" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setModalState({ date: tr.date, ev: tr }); }} className="font-bold text-slate-500 hover:text-slate-900 cursor-pointer">{tx('詳情 →', 'Details →')}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {([
            ['all', tx('全部排程 All', 'All Events')],
            ['site_test', 'Site Test'],
            ['training', 'Training'],
            ['hoklas', 'HOKLAS'],
          ] as const).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTypeFilter(k)} className={`rounded-xl px-3 py-2 text-xs font-extrabold whitespace-nowrap cursor-pointer ${typeFilter === k ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {lbl}
            </button>
          ))}
          <button type="button" onClick={() => setMyOnly(!myOnly)} className={`rounded-xl px-3 py-2 text-xs font-extrabold whitespace-nowrap cursor-pointer ${myOnly ? 'bg-brand text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {tx('我的排程', 'My Schedule')}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shift(-1)} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-28 text-center text-sm font-extrabold text-slate-900">{lang === 'en' ? `${new Date(year, month, 1).toLocaleString('en-US', { month: 'short' })} ${year}` : `${year} 年 ${month + 1} 月`}</span>
          <button type="button" onClick={() => shift(1)} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => { setYear(initY || 2026); setMonth((initM || 11) - 1); setSelectedDate(REF_TODAY); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">{tx('本月 Today', 'Today')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-extrabold text-slate-500">
            {weekdays.map((w, i) => <div key={w} className={`py-2.5 ${i === 0 ? 'text-rose-600' : ''}`}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c) => {
              const hol = holidayMap.get(c.key) as any;
              const dayEvents = eventsByDate.get(c.key) || [];
              const hasTraining = dayEvents.some((e) => e.type === 'training');
              const isSelected = c.key === selectedDate;
              const isToday = c.key === REF_TODAY;
              return (
                <div
                  key={c.key}
                  onClick={() => setSelectedDate(c.key)}
                  className={`min-h-18 sm:min-h-26 border-b border-r border-slate-100 p-1.5 sm:p-2 transition cursor-pointer ${
                    !c.inMonth ? 'bg-slate-50/70 text-slate-300' : hasTraining ? 'bg-violet-50/55 hover:bg-violet-50' : 'bg-white hover:bg-slate-50'
                  } ${isSelected ? 'ring-2 ring-inset ring-violet-600' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${isToday ? 'bg-brand text-white' : hol || c.weekday === 0 ? 'text-rose-600' : 'text-slate-800'}`}>{c.day}</span>
                    {hasTraining && <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">Training</span>}
                  </div>
                  {hol && <div className="mt-0.5 truncate text-[10px] font-bold text-rose-600">{lang === 'en' ? hol.name || hol.zh : hol.zh || hol.name}</div>}
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ev.type === 'training' ? 'bg-violet-100 text-violet-900' : ev.type === 'hoklas' ? 'bg-amber-100 text-amber-900' : 'bg-brand-wash text-brand-deep'}`}>
                        <span className="hidden sm:inline">{ev.title || ev.site}</span>
                        <span className="sm:hidden">{ev.type === 'training' ? 'Training' : 'Site'}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] font-bold text-slate-400">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-3xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="font-mono text-sm font-extrabold text-slate-900">{selectedDate}</div>
              {selectedHoliday && <div className="text-xs font-bold text-rose-600">{lang === 'en' ? selectedHoliday.name || selectedHoliday.zh : selectedHoliday.zh || selectedHoliday.name}</div>}
            </div>
            <button type="button" onClick={() => setModalState({ date: selectedDate })} className="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700 hover:bg-violet-100 cursor-pointer">{tx('+ 新增', '+ Add')}</button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">{tx('當日暫無排程項目', 'No events scheduled')}</div>
          ) : (
            selectedDayEvents.map((ev) => {
              const stpCode = mapTestToStp(ev.tests[0]);
              return (
                <div key={ev.id} className={`rounded-2xl border p-3.5 space-y-2 text-xs ${ev.type === 'training' ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-lg px-2 py-0.5 font-extrabold ${ev.type === 'training' ? 'bg-violet-600 text-white' : 'bg-brand text-white'}`}>{ev.type === 'training' ? 'Training' : ev.type === 'hoklas' ? 'HOKLAS' : 'Site Test'}</span>
                    {ev.timeSlot && <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-600"><Clock className="h-3 w-3" />{ev.timeSlot}</span>}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">{ev.title || ev.site}</div>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand shrink-0" /><span>{ev.site}</span></div>
                    <div className="flex items-start gap-1.5"><Users className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" /><span>{ev.operators.join(', ') || 'TBD'}</span></div>
                    {ev.notes && <div className="rounded-xl bg-white/80 px-2.5 py-1.5 text-[11px] text-slate-700">{ev.notes}</div>}
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
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-brand hover:text-brand-deep cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-brand shrink-0" />
                            <span className="truncate max-w-[180px]">{att.fileName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                    <button type="button" onClick={() => setStpPreviewCode(stpCode)} className="inline-flex items-center gap-1 rounded-lg bg-white border border-violet-200 px-2.5 py-1 font-extrabold text-violet-700 hover:bg-violet-100 cursor-pointer"><BookOpen className="h-3 w-3" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}</button>
                    <button type="button" onClick={() => setModalState({ date: ev.date, ev })} className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"><Edit3 className="h-3 w-3" /> {tx('編輯 / 附件', 'Edit / Docs')}</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {modalState && <CalendarEventModal initialDate={modalState.date} existing={modalState.ev || null} onClose={() => setModalState(null)} />}
      {dispatchOpen && <DailyDispatchModal initialDate={selectedDate} onClose={() => setDispatchOpen(false)} />}
    </div>
  );
};
