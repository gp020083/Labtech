import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { CalendarEvent } from '../types';
import { REF_TODAY, daysBetween } from '../utils';
import { CalendarEventModal } from '../components/CalendarEventModal';
import { DailyDispatchModal } from '../components/DailyDispatchModal';
import { SERVER_MASTER_SCHEDULES } from '../data/serverScheduleEvents';
import { ChevronLeft, ChevronRight, Plus, BookOpen, MapPin, Users, Clock, Edit3, MessageSquareShare, FileText, FolderOpen } from 'lucide-react';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function mapTestToStp(raw?: string): string {
  if (!raw) return 'KD';
  const m: Record<string, string> = { koden: 'KD', sonic: 'SO', flowcone_bleeding: 'FC', point_load: 'PO', plate_load: 'PLT' };
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
    () => events.filter((e) => e.date >= REF_TODAY && (typeFilter === 'all' || e.type === typeFilter)).sort((a, b) => a.date.localeCompare(b.date)),
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
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3.5 border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900">{tx('📅 工程及培訓排程月曆', '📅 Field Schedule Calendar')}</h1>
          <p className="text-[11px] text-slate-500">{tx('藍點：地盤測試 · 紫點：培訓 · 黃點：HOKLAS', 'Blue: Site · Purple: Training · Amber: HOKLAS')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setDispatchOpen(true)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-2 font-extrabold text-emerald-900 cursor-pointer">
            <MessageSquareShare className="h-3.5 w-3.5 text-emerald-700" /> {tx('派工單', 'Brief')}
          </button>
          <button type="button" onClick={() => setModalState({ date: selectedDate })} className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 font-extrabold text-white cursor-pointer">
            <Plus className="h-4 w-4" /> {tx('新增', 'Add')}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {([
          ['all', tx('全部', 'All')],
          ['site_test', '📍 Site'],
          ['training', '🎓 Training'],
          ['hoklas', '🏅 HOKLAS'],
        ] as const).map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setTypeFilter(k)} className={`rounded-xl px-3 py-1.5 font-extrabold shrink-0 cursor-pointer ${typeFilter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{lbl}</button>
        ))}
        <button type="button" onClick={() => setMyOnly(!myOnly)} className={`rounded-xl px-3 py-1.5 font-extrabold shrink-0 cursor-pointer ${myOnly ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{tx('👤 我的', '👤 Mine')}</button>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
            <FolderOpen className="h-3.5 w-3.5 text-violet-600" />
            {tx('伺服器排程總表及會議紀錄', 'Server Master Schedules')}
          </span>
          <span className="text-[10px] font-bold text-slate-400">LTData</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
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
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left shrink-0 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-violet-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">{lang === 'en' ? doc.titleEn : doc.titleZh}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="rounded-xl border border-slate-200 p-2 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900">{lang === 'en' ? `${new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })} ${year}` : `${year} 年 ${month + 1} 月`}</span>
            <button type="button" onClick={() => { setYear(initY || 2026); setMonth((initM || 11) - 1); setSelectedDate(REF_TODAY); }} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 cursor-pointer">{tx('今日', 'Today')}</button>
          </div>
          <button type="button" onClick={() => shift(1)} className="rounded-xl border border-slate-200 p-2 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-slate-400 border-b border-slate-100 pb-1.5">
          {weekdays.map((w, i) => <div key={i} className={i === 0 ? 'text-rose-500' : ''}>{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
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
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition cursor-pointer ${!c.inMonth ? 'opacity-30' : ''} ${isSel ? 'bg-violet-600 text-white shadow-xs' : isToday ? 'bg-brand-wash ring-1 ring-brand' : 'hover:bg-slate-50'}`}
              >
                <span className={`text-xs font-extrabold leading-none ${isSel ? 'text-white' : isToday ? 'text-brand-deep' : hol || c.weekday === 0 ? 'text-rose-600' : 'text-slate-800'}`}>{c.day}</span>
                <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                  {evs.slice(0, 3).map((ev, idx) => (
                    <span key={idx} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : ev.type === 'training' ? 'bg-violet-600' : ev.type === 'hoklas' ? 'bg-amber-500' : 'bg-brand'}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <div className="font-mono text-sm font-extrabold text-slate-900">📅 {selectedDate}</div>
            {selectedHoliday && <div className="text-[11px] font-bold text-rose-600">{lang === 'en' ? selectedHoliday.name || selectedHoliday.zh : selectedHoliday.zh || selectedHoliday.name}</div>}
          </div>
          <button type="button" onClick={() => setModalState({ date: selectedDate })} className="rounded-xl bg-violet-50 px-3 py-1.5 font-extrabold text-violet-700 cursor-pointer">+ {tx('新增排程', 'Add Event')}</button>
        </div>
        {dayEvents.length === 0 ? (
          <div className="py-4 text-center text-slate-400">{tx('當日暫無排程項目', 'No scheduled events on this date')}</div>
        ) : (
          dayEvents.map((ev) => {
            const stpCode = mapTestToStp(ev.tests[0]);
            return (
              <div key={ev.id} className={`rounded-2xl border p-3 space-y-2 ${ev.type === 'training' ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold text-white ${ev.type === 'training' ? 'bg-violet-600' : ev.type === 'hoklas' ? 'bg-amber-600' : 'bg-brand'}`}>{ev.type === 'training' ? '🎓 Training' : ev.type === 'hoklas' ? '🏅 HOKLAS' : '📍 Site Test'}</span>
                  {ev.timeSlot && <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-600"><Clock className="h-3 w-3" />{ev.timeSlot}</span>}
                </div>
                <div className="text-sm font-extrabold text-slate-900">{ev.title || ev.site}</div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-brand shrink-0" /><span>{ev.site}</span></div>
                  <div className="flex items-start gap-1"><Users className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" /><span>{ev.operators.join(', ') || 'TBD'}</span></div>
                  {ev.notes && <div className="rounded-xl bg-white p-2 text-slate-700">📝 {ev.notes}</div>}
                  {ev.attachments && ev.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          <FileText className="h-3 w-3 text-brand shrink-0" />
                          <span className="truncate max-w-[160px]">{att.fileName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                  <button type="button" onClick={() => setStpPreviewCode(stpCode)} className="inline-flex items-center gap-1 rounded-lg bg-white border border-violet-200 px-2.5 py-1 font-extrabold text-violet-700 cursor-pointer"><BookOpen className="h-3 w-3" /> {tx(`檢視 ${stpCode} STP`, `Open ${stpCode} STP`)}</button>
                  <button type="button" onClick={() => setModalState({ date: ev.date, ev })} className="inline-flex items-center gap-1 font-bold text-slate-600 cursor-pointer"><Edit3 className="h-3 w-3" /> {tx('編輯 / 附件', 'Edit / Docs')}</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2">
        <div className="font-extrabold text-slate-900">{tx(`⚡ 近期排程 (${upcoming.length})`, `⚡ Upcoming (${upcoming.length})`)}</div>
        {upcoming.slice(0, 6).map((tr) => {
          const diff = daysBetween(REF_TODAY, tr.date);
          return (
            <div key={tr.id} onClick={() => { const [y, m] = tr.date.split('-').map(Number); setYear(y); setMonth(m - 1); setSelectedDate(tr.date); }} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] font-bold text-slate-500">{tr.date} {tr.timeSlot ? `· ${tr.timeSlot}` : ''}</div>
                <div className="truncate font-extrabold text-slate-900">{tr.title || tr.site}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold shrink-0 ${diff === 0 ? 'bg-rose-100 text-rose-700' : 'bg-brand-wash text-brand-deep'}`}>{diff === 0 ? tx('今日', 'Today') : tx(`${diff}日後`, `In ${diff}d`)}</span>
            </div>
          );
        })}
      </div>

      {modalState && <CalendarEventModal initialDate={modalState.date} existing={modalState.ev || null} onClose={() => setModalState(null)} />}
      {dispatchOpen && <DailyDispatchModal initialDate={selectedDate} onClose={() => setDispatchOpen(false)} />}
    </div>
  );
};
