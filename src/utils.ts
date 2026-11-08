import { EquipmentItem, TestMethodItem, FieldCalcRecord, JobItem } from './types';
import { resolveDocLink } from './driveDocs';

export function getHkTodayIso(dateObj: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(dateObj);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  return dateObj.toISOString().slice(0, 10);
}

export const REF_TODAY = getHkTodayIso();

export function daysBetween(d1: string, d2: string): number {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

export function isValidIsoDate(d?: string): boolean {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export interface CalStatusResult {
  kind: 'ok' | 'warn' | 'bad' | 'mute';
  label: string;
  daysLeft?: number;
  mismatch: boolean;
  disposed: boolean;
  effectiveDue: string;
  canUseInTest: boolean;
}

export function getEquipmentCalStatus(eq: EquipmentItem, today = REF_TODAY, lang: 'zh' | 'en' = 'zh'): CalStatusResult {
  const en = lang === 'en';
  const disposed = /dispos/i.test(eq.loc) || /dispos/i.test(eq.store);
  if (disposed) {
    return { kind: 'mute', label: en ? 'Disposed' : 'Disposed 已棄置', mismatch: false, disposed: true, effectiveDue: eq.due, canUseInTest: false };
  }
  const mismatch = !!(eq.certDue && isValidIsoDate(eq.due) && eq.certDue.slice(0, 7) !== eq.due.slice(0, 7));
  if (!isValidIsoDate(eq.due)) {
    return {
      kind: 'mute',
      label: eq.req === 'Internal Check' ? 'Internal Check' : en ? 'No Ext. Cal' : '免外校',
      mismatch: false,
      disposed: false,
      effectiveDue: eq.due || '—',
      canUseInTest: true,
    };
  }
  const d = daysBetween(today, eq.due);
  if (d < 0) return { kind: 'bad', label: en ? `Overdue ${-d}d` : `Cal 過期 ${-d} 日`, daysLeft: d, mismatch, disposed: false, effectiveDue: eq.due, canUseInTest: false };
  if (d <= 90) return { kind: 'warn', label: en ? `Due in ${d}d` : `${d} 日後 Cal 到期`, daysLeft: d, mismatch, disposed: false, effectiveDue: eq.due, canUseInTest: true };
  return { kind: 'ok', label: en ? 'Cal Valid' : 'Cal 有效', daysLeft: d, mismatch, disposed: false, effectiveDue: eq.due, canUseInTest: true };
}

export function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function downloadBlankTemplate(test: TestMethodItem) {
  if (test.worksheetUrl) {
    const resolved = resolveDocLink(test.worksheetUrl, test.worksheetCode);
    const a = document.createElement('a');
    a.href = resolved.downloadUrl || test.worksheetUrl;
    a.download = test.worksheetCode;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    return;
  }
  const bom = '\uFEFF';
  const rows = [
    ['LABTECH TESTING LTD — 受控空白現場紀錄紙 (BLANK WORKSHEET)'],
    ['試驗項目', test.name, '代碼', test.code],
    ['標準方法', test.std, '受控 STP 版本', `${test.stpDocCode} ${test.stpRev} (生效日期: ${test.stpEffectiveDate})`],
    ['範本檔名', test.worksheetCode, '下載時間', nowTimestamp()],
    [],
    ['Job No. / 地盤簡稱:', '', '測試位置 / 樁號:', ''],
    ['測試日期 / 時間:', '', 'Operator 姓名及簽署:', ''],
    ['所用器材編號:', '', '', ''],
    [],
    ['【標準程序關鍵檢查項目】'],
    ...test.keyParams.map((k, i) => [`Step ${i + 1}`, k, '讀數 / 確認:', '']),
  ];
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = test.worksheetCode.replace(/\.xlsx$/i, '.csv');
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCalcRecordCsv(rec: FieldCalcRecord, job?: JobItem) {
  const bom = '\uFEFF';
  const summaryLines = rec.summary.split('\n').map((l, idx) => [`Calculation Line ${idx + 1}`, l]);
  const rows = [
    ['LABTECH TESTING LTD — HOKLAS 298 現場測試計算紀錄表 (FIELD TEST CALCULATION SHEET)'],
    ['Record ID', rec.id, 'Test Date / Time', rec.testedAt],
    ['Site ID (Job No.)', rec.jobNo, 'Company Project No.', job?.companyProjNo || '—'],
    ['Site Name', job?.shortName || '—', 'Site Address', job?.mapAddress || job?.site || '—'],
    ['Test Code (STP)', rec.stpCode, 'Test Method', rec.title],
    ['Pile / Sample Ref', rec.locationNote || '—', 'Operator', rec.operatorName],
    ['Compliance Verdict', rec.pass ? 'PASS (合規)' : 'EXCEED / REVIEW (超標／需覆核)', '', ''],
    [],
    ['【計算明細 Calculation Summary】'],
    ...summaryLines,
  ];
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Labtech_${rec.jobNo}_${rec.stpCode}_${rec.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
