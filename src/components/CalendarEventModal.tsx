import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { STATIC_DATA } from '../data/initialState';
import { CalendarEvent } from '../types';
import { checkFqs49AndConflicts, getStaffFqs49Role } from '../utils/limsRules';
import { SharedDocUploadBox } from './SharedDocUploadBox';
import { X, Trash2, CalendarDays, ShieldCheck, AlertTriangle } from 'lucide-react';

const TEST_CHOICES = [
  { key: 'KD', label: 'KD (Koden)' },
  { key: 'SO', label: 'SO (Sonic)' },
  { key: 'FC', label: 'FC (Flow Cone)' },
  { key: 'BL', label: 'BL (Bleeding)' },
  { key: 'PO', label: 'PO (Point Load)' },
  { key: 'PLT', label: 'PLT (Plate Load)' },
];

export const CalendarEventModal: React.FC<{
  initialDate: string;
  existing?: CalendarEvent | null;
  onClose: () => void;
}> = ({ initialDate, existing, onClose }) => {
  const { saveEvent, deleteEvent, uploadEventAttachment, jobs, events, equipment, pushToast } = useApp();
  const { lang, tx } = usePrefs();
  const [type, setType] = useState<CalendarEvent['type']>(existing?.type || 'training');
  const [title, setTitle] = useState(existing?.title || '');
  const [date, setDate] = useState(existing?.date || initialDate);
  const [timeSlot, setTimeSlot] = useState(existing?.timeSlot || '09:30 - 12:30');
  const [site, setSite] = useState(existing?.site || 'Fanling Lab Training Room');
  const [tests, setTests] = useState<string[]>(existing?.tests || ['SO']);
  const [operators, setOperators] = useState<string[]>(existing?.operators || ['Shih Chak Lung, Ben']);
  const [notes, setNotes] = useState(existing?.notes || '');

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const fqsCheck = useMemo(
    () =>
      checkFqs49AndConflicts({
        testCodes: tests,
        date,
        timeSlot,
        selectedOperators: operators,
        existingEventId: existing?.id,
        allEvents: events,
        allEquipment: equipment,
        allStaffNames: STATIC_DATA.staff.map((s: any) => s.name),
      }),
    [tests, date, timeSlot, operators, existing?.id, events, equipment]
  );

  const qualifiedSelectedCount = useMemo(
    () =>
      operators.filter((op) => {
        const r = getStaffFqs49Role(op, tests);
        return r === 'as' || r === 'op';
      }).length,
    [operators, tests]
  );

  const traineeSelectedCount = useMemo(
    () => operators.filter((op) => getStaffFqs49Role(op, tests) === 'trainee').length,
    [operators, tests]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEvent(
      {
        type,
        title: title.trim() || (type === 'training' ? `${tests.join('/')} 實操培訓` : site),
        date,
        timeSlot: timeSlot.trim(),
        dateTentative: false,
        site: site.trim(),
        tests,
        operators,
        helpers: existing?.helpers || [],
        signatories: existing?.signatories || ['Lam Hoi Fan, James'],
        notes: notes.trim(),
        status: existing?.status || 'planned',
        attachments: existing?.attachments || [],
      },
      existing?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-3.5 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
            <CalendarDays className="h-4 w-4 text-brand" />
            {existing ? tx('編輯 Calendar 排程項目', 'Edit Calendar Event') : tx('新增 Calendar 排程項目', 'Add Calendar Event')}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            ['site_test', tx('📍 Site Test', '📍 Site Test')],
            ['training', tx('🎓 Training', '🎓 Training')],
            ['hoklas', tx('🏅 HOKLAS 評審', '🏅 HOKLAS Audit')],
          ] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setType(k)} className={`rounded-xl border py-2 font-extrabold cursor-pointer ${type === k ? (k === 'training' ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-brand bg-brand-wash text-brand-deep') : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div><label className="font-bold text-slate-600">{tx('Date 日期 *', 'Date *')}</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label className="font-bold text-slate-600">{tx('Time 時段', 'Time Slot')}</label><input value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} placeholder="09:30 - 12:30" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
        </div>

        <div><label className="font-bold text-slate-600">{tx('排程項目主題 *', 'Schedule Title *')}</label><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tx('例如：Sonic Logging 現場測試 / 實務培訓', 'e.g. Sonic Logging Site Test / Training')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>

        <div>
          <label className="font-bold text-slate-600">{tx('地點 / 工地位置 Location', 'Location / Venue')}</label>
          <input value={site} onChange={(e) => setSite(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" />
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button type="button" onClick={() => setSite(tx('粉嶺 Lab Training Room', 'Fanling Lab Training Room'))} className="rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 cursor-pointer">{tx('粉嶺 Lab Training Room', 'Fanling Lab Training Room')}</button>
            {jobs.slice(0, 5).map((j) => (
              <button key={j.no} type="button" onClick={() => setSite(`${j.shortName} (${j.companyProjNo})`)} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-brand-wash cursor-pointer">{j.shortName}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-600">{tx('關聯 Test Scope（可直接檢視 STP）', 'Linked Test Scope (Direct STP link)')}</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TEST_CHOICES.map((tc) => (
              <button key={tc.key} type="button" onClick={() => toggleArr(tests, setTests, tc.key)} className={`rounded-full border px-2.5 py-1 cursor-pointer ${tests.includes(tc.key) ? 'border-violet-500 bg-violet-50 font-bold text-violet-800' : 'border-slate-200 text-slate-500'}`}>{tc.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-600">{tx('參與人員 / 同事 Staff (FQS49 授權標示)', 'Assigned Staff (FQS49 Competence)')}</label>
            <span className="text-[10px] font-semibold text-slate-400">🏅AS · ✓Op · 🎓Trainee</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {STATIC_DATA.staff.slice(5, 16).map((s: any) => {
              const selected = operators.includes(s.name);
              const role = fqsCheck.staffRoles[s.name] || getStaffFqs49Role(s.name, tests);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleArr(operators, setOperators, s.name)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 cursor-pointer transition ${
                    selected ? 'border-brand bg-brand-wash font-bold text-brand-deep' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{lang === 'zh' ? (s.zh || s.name) : s.name}</span>
                  {role === 'as' && <span className="rounded bg-amber-100 px-1 text-[9px] font-extrabold text-amber-800">🏅AS</span>}
                  {role === 'op' && <span className="rounded bg-emerald-100 px-1 text-[9px] font-extrabold text-emerald-800">✓Op</span>}
                  {role === 'trainee' && <span className="rounded bg-violet-100 px-1 text-[9px] font-extrabold text-violet-800">🎓Tr</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between font-extrabold text-slate-800">
            <span className="inline-flex items-center gap-1.5">
              {type === 'site_test' && !fqsCheck.hasQualifiedLead ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              )}
              {tx('HOKLAS FQS49 授權、撞期及在庫儀器檢查', 'FQS49 Competence, Conflict & Instrument Check')}
            </span>
          </div>

          {type === 'site_test' && !fqsCheck.hasQualifiedLead ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-bold text-amber-900">
              ⚠️ {tx('注意：目前所選人員均為 Trainee 或未具該測試之 FQS49 獨立操作授權，現場測試須由認可 Operator / Signatory 帶領。', 'Warning: Selected staff do not hold independent FQS49 Operator/Signatory qualification for this test.')}
            </div>
          ) : (
            <div className="text-emerald-800 font-semibold">
              ✓ {tx(`已指派具 FQS49 認可資格人員（合格：${qualifiedSelectedCount} 人${traineeSelectedCount ? ` · 實習：${traineeSelectedCount} 人` : ''}）`, `FQS49 qualified personnel assigned (${qualifiedSelectedCount} qualified)`)}
            </div>
          )}

          {fqsCheck.doubleBookedStaff.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-bold text-rose-800">
              🚨 {tx('同日排程撞期提示：', 'Same-day schedule conflict: ')}
              {fqsCheck.doubleBookedStaff.map((d) => `${d.name.split(',')[1]?.trim() || d.name} (${d.conflictTitle})`).join('；')}
            </div>
          )}

          {fqsCheck.equipmentSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="font-bold text-slate-500">{tx('在庫有效校準器材：', 'Available Calibrated Eq:')}</span>
              {fqsCheck.equipmentSummary.map((es) => (
                <span
                  key={es.testCode}
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                    es.availableCalibrated > 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {es.testCode}: {es.availableCalibrated} {tx('件可借', 'avail')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div><label className="font-bold text-slate-600">{tx('備註 / 安全裝備提醒 Remark', 'Notes / PPE Reminder')}</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tx('例如：請攜帶個人安全裝備及預先查閱受控 STP', 'e.g. Bring PPE & review controlled STP')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm" /></div>

        {existing && (
          <SharedDocUploadBox title={tx('📎 相關文件 / 簽到表附件', '📎 Event Handouts / Attachments')} buttonLabel={tx('上傳附件', 'Upload File')} docTypeOptions={[tx('參考文件 PDF', 'Reference PDF'), tx('簽到表', 'Attendance Sheet'), tx('考核表', 'Assessment Checklist')]} docs={existing.attachments || []} onUpload={(d) => uploadEventAttachment(existing.id, d)} onPreviewToast={(fn) => pushToast(tx('已開啟附件', 'Opened attachment'), fn)} />
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {existing ? (
            <button type="button" onClick={() => { deleteEvent(existing.id); onClose(); }} className="inline-flex items-center gap-1 font-bold text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" />{tx('Delete', 'Delete')}</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">{tx('取消', 'Cancel')}</button>
            <button type="submit" className="rounded-xl bg-brand px-5 py-2 font-bold text-white hover:bg-brand-deep cursor-pointer">{tx('Save 排程', 'Save Schedule')}</button>
          </div>
        </div>
      </form>
    </div>
  );
};

