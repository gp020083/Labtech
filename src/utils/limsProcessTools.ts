import { CalendarEvent, EquipmentItem, FieldCalcRecord, JobItem, TestMethodItem } from '../types';
import { getHkTodayIso } from '../utils';
import { localizeJob, localizeEquipment, localizeTest } from '../data/enTranslations';
import { toEnglishWorksheetText } from './completedWorksheetGenerator';
import {
  buildEquipmentCertStatusPath,
  buildEquipmentQrUrl,
  parseEquipmentCodeFromUrl,
  encodeIsoQrMatrix,
  renderQrMatrixToSvg,
  generateEquipmentQrCode,
  generateAllEquipmentQrCodes,
  EquipmentQrCodeResult,
} from './equipmentQr';

export interface HoklasWorksheetRow {
  parameter: string;
  value: string;
}

export interface HoklasWorksheetEquipmentRow {
  code: string;
  name: string;
  model: string;
  serial: string;
  calDue: string;
  source: 'on_site' | 'recommended_lab';
}

export interface HoklasWorksheetPayload {
  reportRefNo: string;
  jobRefNo: string;
  worksOrderNo: string;
  batchNo: string;
  sampleId: string;
  jobNo: string;
  companyProjNo: string;
  projectTitle: string;
  clientName: string;
  siteLocation: string;
  locationNote: string;
  stpCode: string;
  testName: string;
  standardMethod: string;
  stpDocCode: string;
  stpRev: string;
  worksheetCode: string;
  testedAt: string;
  operatorName: string;
  approvedSignatory: string;
  pass: boolean;
  rows: HoklasWorksheetRow[];
  equipmentList: HoklasWorksheetEquipmentRow[];
  signatureDataUrl?: string;
  signedBy?: string;
  signedRole?: string;
  signedAt?: string;
  sitePhotos: NonNullable<FieldCalcRecord['sitePhotos']>;
}

export function mapRawTestToStpCode(raw?: string): string {
  if (!raw) return 'KD';
  const m: Record<string, string> = {
    koden: 'KD',
    sonic: 'SO',
    flowcone_bleeding: 'FC',
    flowcone: 'FC',
    bleeding: 'BL',
    point_load: 'PO',
    pointload: 'PO',
    plate_load: 'PLT',
    plt: 'PLT',
    inclinometer: 'VC',
  };
  return m[raw.toLowerCase()] || raw.toUpperCase();
}

export function parseCalcSummaryToRows(summary: string): HoklasWorksheetRow[] {
  const lines = (summary || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: HoklasWorksheetRow[] = [];
  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      rows.push({ parameter: 'Test Mode / Section', value: line.slice(1, -1) });
      continue;
    }
    const segments = line.split('｜').map((s) => s.trim()).filter(Boolean);
    for (const seg of segments) {
      const colonIdx = seg.indexOf(':');
      const eqIdx = seg.indexOf('=');
      if (colonIdx > 0 && (eqIdx < 0 || colonIdx < eqIdx)) {
        rows.push({
          parameter: seg.slice(0, colonIdx).trim(),
          value: seg.slice(colonIdx + 1).trim(),
        });
      } else if (eqIdx > 0) {
        rows.push({
          parameter: seg.slice(0, eqIdx).trim(),
          value: seg.slice(eqIdx + 1).trim(),
        });
      } else {
        rows.push({ parameter: 'Observation / Remark', value: seg });
      }
    }
  }
  return rows;
}

export function stripManualInputPlaceholder(raw?: string | null): string {
  const clean = toEnglishWorksheetText(raw, '').trim();
  if (!clean) return '';
  if (/^manual\s+input\b/i.test(clean)) return '';
  return clean;
}

export function equipmentMatchesStp(eq: Pick<EquipmentItem, 'testTags' | 'tests'>, stpCode: string): boolean {
  const cleanStp = (stpCode || '').trim().toUpperCase();
  if (!cleanStp) return false;
  const tags =
    eq.testTags && eq.testTags.length > 0
      ? eq.testTags.map((s) => s.trim().toUpperCase()).filter(Boolean)
      : (eq.tests || '')
          .split('+')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
  return tags.includes(cleanStp);
}

export function deduplicateEquipmentRows(
  rows: HoklasWorksheetEquipmentRow[],
  refDateIso = getHkTodayIso(),
  maxRows = 7
): HoklasWorksheetEquipmentRow[] {
  const isCalValid = (due: string) => {
    const d = (due || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d >= refDateIso;
    return d.length > 0 && d !== '—';
  };
  const indexed = rows.map((row, idx) => {
    const valid = isCalValid(row.calDue);
    const loaned = row.source === 'on_site';
    const tier = valid ? (loaned ? 0 : 1) : loaned ? 2 : 3;
    return { row, idx, tier };
  });
  indexed.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const dueA = (a.row.calDue || '').trim();
    const dueB = (b.row.calDue || '').trim();
    const isoA = /^\d{4}-\d{2}-\d{2}$/.test(dueA);
    const isoB = /^\d{4}-\d{2}-\d{2}$/.test(dueB);
    if (isoA && isoB && dueA !== dueB) return dueB.localeCompare(dueA);
    return a.idx - b.idx;
  });

  const prefixCounts = new Map<string, number>();
  const seenCodes = new Set<string>();
  const out: HoklasWorksheetEquipmentRow[] = [];
  for (const { row } of indexed) {
    const normCode = row.code.trim().toUpperCase();
    if (seenCodes.has(normCode)) continue;
    const prefix = normCode.replace(/-\d+$/, '');
    const maxForPrefix = prefix === 'LT-PL' ? 2 : 1;
    const used = prefixCounts.get(prefix) || 0;
    if (used >= maxForPrefix) continue;
    seenCodes.add(normCode);
    prefixCounts.set(prefix, used + 1);
    out.push(row);
    if (out.length >= maxRows) break;
  }
  return out;
}

export function buildHoklasFieldWorksheetData(params: {
  record: FieldCalcRecord;
  job?: JobItem | null;
  equipment: EquipmentItem[];
  tests?: TestMethodItem[];
}): HoklasWorksheetPayload {
  const { record, job: rawJob, equipment, tests = [] } = params;
  const cleanStp = (record.stpCode || 'KD').trim().toUpperCase();
  const isAccredited = cleanStp !== 'PLT' && cleanStp !== 'VC';
  const job = rawJob ? localizeJob(rawJob, 'en') : null;
  const rawStpMethod = tests.find((t) => t.code.toUpperCase() === cleanStp);
  const stpMethod = rawStpMethod ? localizeTest(rawStpMethod, 'en') : undefined;
  const inUseEq = equipment.filter((e) => e.inUse !== 'N').map((e) => localizeEquipment(e, 'en'));

  const candidateRows: HoklasWorksheetEquipmentRow[] = inUseEq
    .filter((e) => equipmentMatchesStp(e, cleanStp))
    .map((e) => ({
      code: e.code,
      name: toEnglishWorksheetText(e.name, 'Calibrated Test Instrument'),
      model: e.model || '—',
      serial: e.serial || '—',
      calDue: e.certDue || e.due || '—',
      source: e.currentLoan?.jobNo === record.jobNo ? 'on_site' : 'recommended_lab',
    }));

  const equipmentList = deduplicateEquipmentRows(candidateRows, getHkTodayIso(), 7);

  const defaultSignatory =
    stpMethod?.approvedSignatories?.[0] ||
    (isAccredited ? 'Shih Chak Lung, Ben (HOKLAS Approved Signatory)' : 'Lam Hoi Fan, James');
  const fallbackRefNo = record.jobRefNo || `HKL-${record.jobNo}-${record.id}`;
  const stBatchNo =
    record.structuredData?.kind === 'FC' || record.structuredData?.kind === 'BL'
      ? record.structuredData.batchNo
      : undefined;
  const stSampleId =
    record.structuredData?.kind === 'FC' || record.structuredData?.kind === 'BL'
      ? record.structuredData.sampleId
      : undefined;

  return {
    reportRefNo: toEnglishWorksheetText(fallbackRefNo, `HKL-${record.jobNo}-${record.id}`),
    jobRefNo: toEnglishWorksheetText(fallbackRefNo, `HKL-${record.jobNo}-${record.id}`),
    worksOrderNo: stripManualInputPlaceholder(record.worksOrderNo),
    batchNo: stripManualInputPlaceholder(record.batchNo ?? stBatchNo),
    sampleId: stripManualInputPlaceholder(record.sampleId ?? stSampleId),
    jobNo: toEnglishWorksheetText(record.jobNo, 'LT0001'),
    companyProjNo: toEnglishWorksheetText(job?.companyProjNo || record.jobNo, record.jobNo),
    projectTitle: toEnglishWorksheetText(record.projectTitle || job?.project || job?.shortName || record.jobNo, record.jobNo),
    clientName: toEnglishWorksheetText(record.clientName || job?.client, 'Main Contractor / Resident Site Staff'),
    siteLocation: toEnglishWorksheetText(job?.mapAddress || job?.site || record.jobNo, record.jobNo),
    locationNote: toEnglishWorksheetText(record.locationNote, 'Standard Field Station'),
    stpCode: cleanStp,
    testName: toEnglishWorksheetText(stpMethod?.name || record.title, record.title),
    standardMethod: toEnglishWorksheetText(stpMethod?.std || record.title, record.title),
    stpDocCode: stpMethod?.stpDocCode || `STP-${cleanStp}`,
    stpRev: stpMethod?.stpRev || 'Rev.4',
    worksheetCode: stpMethod?.worksheetCode || `F${cleanStp}01`,
    testedAt: record.testedAt,
    operatorName: toEnglishWorksheetText(record.operatorName, 'Shih Chak Lung, Ben'),
    approvedSignatory: toEnglishWorksheetText(
      defaultSignatory,
      isAccredited ? 'Shih Chak Lung, Ben (HOKLAS AS)' : 'Lam Hoi Fan, James'
    ),
    pass: record.pass,
    rows: parseCalcSummaryToRows(record.summary).map((r) => ({
      parameter: toEnglishWorksheetText(r.parameter, r.parameter),
      value: toEnglishWorksheetText(r.value, r.value),
    })),
    equipmentList,
    signatureDataUrl: record.signatureDataUrl,
    signedBy: record.signedBy ? toEnglishWorksheetText(record.signedBy) : undefined,
    signedRole: record.signedRole ? toEnglishWorksheetText(record.signedRole) : undefined,
    signedAt: record.signedAt,
    sitePhotos: record.sitePhotos || [],
  };
}

export {
  buildEquipmentCertStatusPath,
  buildEquipmentQrUrl,
  parseEquipmentCodeFromUrl,
  encodeIsoQrMatrix,
  renderQrMatrixToSvg,
  generateEquipmentQrCode,
  generateAllEquipmentQrCodes,
};
export type { EquipmentQrCodeResult };

/**
 * Generates an ISO/IEC 18004 QR boolean matrix with authentic 7x7 finder patterns,
 * timing patterns, alignment patterns, and Reed-Solomon error correction codewords.
 */
export function generateDeterministicQrMatrix(payload: string): boolean[][] {
  return encodeIsoQrMatrix(payload).matrix;
}

export function matchEquipmentByQrOrQuery(
  equipment: EquipmentItem[],
  rawInput: string
): EquipmentItem[] {
  const cleaned = (rawInput || '').trim();
  if (!cleaned) return [];

  // Check if input is a direct equipment URL path (/equipment/LT-KM-04/cert), query (?eq=LT-KM-04), or QR payload
  const parsedFromUrl = parseEquipmentCodeFromUrl(cleaned);
  const token = parsedFromUrl || cleaned;

  const upper = token.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, '');

  // Exact code match first
  const exact = equipment.find(
    (e) => e.code.toUpperCase() === upper || e.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === compact
  );
  if (exact) return [exact];

  // Partial matches on code, serial, or name
  return equipment.filter((e) => {
    const codeUpper = e.code.toUpperCase();
    const codeCompact = codeUpper.replace(/[^A-Z0-9]/g, '');
    const serialUpper = (e.serial || '').toUpperCase();
    const nameUpper = (e.name || '').toUpperCase();
    return (
      codeUpper.includes(upper) ||
      codeCompact.includes(compact) ||
      serialUpper.includes(upper) ||
      nameUpper.includes(upper)
    );
  });
}

export type CalForecastBucket = 'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok';

export interface CalScheduleConflict {
  eventId: string;
  eventDate: string;
  eventTitle: string;
  site: string;
  jobNo?: string;
  stpCodes: string[];
  reasonZh: string;
  reasonEn: string;
}

export interface CalForecastItem {
  equipment: EquipmentItem;
  dueDate: string;
  recommendedSendDate: string;
  daysLeft: number;
  bucket: CalForecastBucket;
  isExternalCal: boolean;
  tags: string[];
  conflicts: CalScheduleConflict[];
}

export interface CalTimelineCluster {
  dueDate: string;
  daysLeft: number;
  bucket: CalForecastBucket;
  codes: string[];
  count: number;
  hasConflict: boolean;
}

export interface CalForecastSummary {
  refToday: string;
  horizon30Date: string;
  horizon60Date: string;
  horizon90Date: string;
  items: CalForecastItem[];
  timelineClusters: CalTimelineCluster[];
  counts: {
    overdue: number;
    due30: number;
    due60: number;
    due90: number;
    validBeyond90: number;
    totalWithin90: number;
    externalWithin90: number;
    withConflicts: number;
  };
}

function diffDaysIso(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = toIso.slice(0, 10).split('-').map(Number);
  if (!y1 || !y2) return 999;
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((t2 - t1) / 86400000);
}

export function addDaysIso(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function buildCalibrationForecast(
  equipment: EquipmentItem[],
  events: CalendarEvent[],
  refToday: string = getHkTodayIso()
): CalForecastSummary {
  const activeEq = equipment.filter((e) => e.inUse !== 'N');
  const futureEvents = events.filter((ev) => ev.date >= refToday && ev.status !== 'cancelled');

  const items: CalForecastItem[] = activeEq
    .map((eq) => {
      const rawDue = (eq.certDue || eq.due || '').trim();
      const validIso = /^\d{4}-\d{2}-\d{2}/.test(rawDue) ? rawDue.slice(0, 10) : '';
      const daysLeft = validIso ? diffDaysIso(refToday, validIso) : 999;

      let bucket: CalForecastBucket = 'ok';
      if (daysLeft < 0) bucket = 'overdue';
      else if (daysLeft <= 30) bucket = 'due_30';
      else if (daysLeft <= 60) bucket = 'due_60';
      else if (daysLeft <= 90) bucket = 'due_90';

      const reqUpper = (eq.req || '').trim().toUpperCase();
      const isExternalCal =
        reqUpper === 'E' ||
        reqUpper.includes('EXTERNAL') ||
        (validIso !== '' && reqUpper !== 'INTERNAL CHECK' && reqUpper !== 'N');

      const recommendedSendDate = validIso ? addDaysIso(validIso, -14) : '—';
      const tags = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
      const conflicts: CalScheduleConflict[] = [];

      if (validIso && daysLeft <= 90) {
        for (const ev of futureEvents) {
          // Skip calibration batch reminders themselves — they are the solution, not a test conflict
          if (ev.id.includes('-cal') || (ev.title && /外送校準|Calibration/i.test(ev.title))) {
            continue;
          }
          const evStpCodes = (ev.tests || []).map((t) => mapRawTestToStpCode(t));
          const tagOverlap = evStpCodes.filter((code) => tags.includes(code));

          if (tagOverlap.length === 0) continue;

          // Conflict if event is on/after instrument due date OR within 14 days prior to due date when sent for external cal
          const daysBeforeDue = diffDaysIso(ev.date, validIso);
          if (ev.date >= validIso || (daysBeforeDue >= 0 && daysBeforeDue <= 14)) {
            const cleanTitle = (ev.title || ev.site).replace(/\s*\([A-Z/+]+\)\s*$/, '');
            conflicts.push({
              eventId: ev.id,
              eventDate: ev.date,
              eventTitle: cleanTitle,
              site: ev.site,
              jobNo: ev.jobNo,
              stpCodes: tagOverlap,
              reasonZh:
                ev.date >= validIso
                  ? `排程當日已過期`
                  : `距到期僅 ${daysBeforeDue} 日（送檢撞期）`,
              reasonEn:
                ev.date >= validIso
                  ? `Expired on event date`
                  : `Within ${daysBeforeDue}d of Cal Due`,
            });
          }
        }
      }

      return {
        equipment: eq,
        dueDate: validIso || rawDue || '—',
        recommendedSendDate,
        daysLeft,
        bucket,
        isExternalCal,
        tags,
        conflicts,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const clusterMap = new Map<string, CalTimelineCluster>();
  for (const it of items) {
    if (it.bucket === 'ok' || !/^\d{4}-\d{2}-\d{2}$/.test(it.dueDate)) continue;
    const existing = clusterMap.get(it.dueDate);
    if (existing) {
      existing.codes.push(it.equipment.code);
      existing.count += 1;
      if (it.conflicts.length > 0) existing.hasConflict = true;
    } else {
      clusterMap.set(it.dueDate, {
        dueDate: it.dueDate,
        daysLeft: it.daysLeft,
        bucket: it.bucket,
        codes: [it.equipment.code],
        count: 1,
        hasConflict: it.conflicts.length > 0,
      });
    }
  }

  const timelineClusters = Array.from(clusterMap.values()).sort((a, b) => a.daysLeft - b.daysLeft);

  const overdue = items.filter((i) => i.bucket === 'overdue').length;
  const due30 = items.filter((i) => i.bucket === 'due_30').length;
  const due60 = items.filter((i) => i.bucket === 'due_60').length;
  const due90 = items.filter((i) => i.bucket === 'due_90').length;
  const validBeyond90 = items.filter((i) => i.bucket === 'ok' && i.daysLeft < 900).length;
  const totalWithin90 = overdue + due30 + due60 + due90;
  const externalWithin90 = items.filter((i) => i.bucket !== 'ok' && i.isExternalCal).length;
  const withConflicts = items.filter((i) => i.bucket !== 'ok' && i.conflicts.length > 0).length;

  return {
    refToday,
    horizon30Date: addDaysIso(refToday, 30),
    horizon60Date: addDaysIso(refToday, 60),
    horizon90Date: addDaysIso(refToday, 90),
    items,
    timelineClusters,
    counts: {
      overdue,
      due30,
      due60,
      due90,
      validBeyond90,
      totalWithin90,
      externalWithin90,
      withConflicts,
    },
  };
}

export function buildCalibrationRenewalCsv(items: CalForecastItem[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Equipment Code',
    'Instrument Name',
    'Maker',
    'Model',
    'Serial No.',
    'Calibration Type',
    'Test Tags',
    'Last Cal Date',
    'Cal Due Date',
    'Recommended Send-Out Date (-14d)',
    'Days Remaining',
    'Renewal Window Bucket',
    'Current Location / Site Loan',
    'Schedule Conflicts',
  ];
  const bucketLabel = (b: CalForecastBucket) => {
    if (b === 'overdue') return 'OVERDUE (<0d)';
    if (b === 'due_30') return '0-30 DAYS';
    if (b === 'due_60') return '31-60 DAYS';
    if (b === 'due_90') return '61-90 DAYS';
    return '>90 DAYS (VALID)';
  };
  const rows = items.map((it) => {
    const eq = it.equipment;
    const loc = eq.currentLoan
      ? `Loaned: ${eq.currentLoan.siteLocation} (${eq.currentLoan.borrowerName})`
      : `In Lab: ${eq.loc || eq.store || 'Lab'}`;
    const conflictText = it.conflicts.map((c) => `${c.eventDate} ${c.site} (${c.stpCodes.join('/')})`).join('; ');
    return [
      eq.code,
      eq.name,
      eq.maker,
      eq.model,
      eq.serial,
      it.isExternalCal ? 'External Calibration (E)' : eq.req || 'Internal Check',
      it.tags.join('+'),
      eq.last || '',
      it.dueDate,
      it.recommendedSendDate,
      it.daysLeft === 999 ? 'N/A' : String(it.daysLeft),
      bucketLabel(it.bucket),
      loc,
      conflictText || 'None',
    ].map(esc).join(',');
  });
  return '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
}

export function buildWhatsAppDispatchBriefing(params: {
  targetDate: string;
  events: CalendarEvent[];
  jobs: JobItem[];
  equipment: EquipmentItem[];
  lang?: 'zh' | 'en';
  refToday?: string;
}): {
  text: string;
  eventCount: number;
  siteTestCount: number;
  trainingCount: number;
} {
  const { targetDate, events, jobs, equipment, lang = 'zh', refToday = getHkTodayIso() } = params;
  const dayEvents = events
    .filter((e) => e.date === targetDate && e.status !== 'cancelled')
    .sort((a, b) => (a.timeSlot || '09:00').localeCompare(b.timeSlot || '09:00'));

  const jobMap = new Map(jobs.map((j) => [j.no, j]));
  const activeEq = equipment.filter((e) => e.inUse !== 'N');

  const siteTestCount = dayEvents.filter((e) => e.type === 'site_test').length;
  const trainingCount = dayEvents.filter((e) => e.type === 'training').length;

  if (dayEvents.length === 0) {
    const emptyText =
      lang === 'en'
        ? `📋 *Labtech Field Dispatch Briefing (${targetDate})*\nNo site tests or training events scheduled for ${targetDate}.`
        : `📋 *Labtech 每日地盤派工及出隊通告 (${targetDate})*\n當日 (${targetDate}) 暫無已排定之地盤測試或培訓項目。`;
    return { text: emptyText, eventCount: 0, siteTestCount: 0, trainingCount: 0 };
  }

  const header =
    lang === 'en'
      ? [
          `📋 *Labtech Testing Ltd — Daily Field Dispatch (${targetDate})*`,
          `📊 Total: ${dayEvents.length} item(s) ｜ 📍 Site Tests: ${siteTestCount} ｜ 🎓 Training: ${trainingCount}`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ]
      : [
          `📋 *Labtech Testing Ltd — 每日地盤派工通告 (${targetDate})*`,
          `📊 共 ${dayEvents.length} 項排程 ｜ 📍 地盤測試：${siteTestCount} 單 ｜ 🎓 培訓／評審：${ dayEvents.length - siteTestCount } 項`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ];

  const blocks = dayEvents.map((ev, idx) => {
    const stpCodes = (ev.tests || []).map((t) => mapRawTestToStpCode(t));
    const matchedJob =
      (ev.jobNo && jobMap.get(ev.jobNo)) ||
      jobs.find((j) => ev.site.includes(j.shortName) || ev.site.includes(j.no) || (ev.title && ev.title.includes(j.no)));

    const mapUrl = matchedJob
      ? matchedJob.googleMapsUrl ||
        (matchedJob.lat && matchedJob.lng
          ? `https://www.google.com/maps/search/?api=1&query=${matchedJob.lat},${matchedJob.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedJob.mapAddress || matchedJob.site)}`)
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.site)}`;

    // Find equipment already on this site + recommended available calibrated equipment in lab
    const onSiteGear = matchedJob
      ? activeEq.filter((e) => e.currentLoan?.jobNo === matchedJob.no)
      : [];

    const recommendedLabGear: EquipmentItem[] = [];
    for (const code of stpCodes) {
      const matches = activeEq.filter((e) => {
        if (e.currentLoan) return false;
        const due = (e.certDue || e.due || '').slice(0, 10);
        if (due && due < refToday) return false;
        const tags = e.testTags || e.tests.split('+').map((s) => s.trim()).filter(Boolean);
        return tags.includes(code);
      });
      for (const m of matches.slice(0, 2)) {
        if (!recommendedLabGear.some((r) => r.code === m.code)) {
          recommendedLabGear.push(m);
        }
      }
    }

    const typeBadge =
      ev.type === 'training'
        ? '🎓 [內部培訓 Training]'
        : ev.type === 'hoklas'
        ? '🏅 [HOKLAS 評審]'
        : '📍 [地盤測試 Site Test]';

    const lines: string[] = [
      `*${idx + 1}. ${typeBadge} ${ev.title || ev.site}*`,
      `🕒 時間 Time: ${ev.timeSlot || '09:00 - 17:00'}${ev.dateTentative ? ' (暫定 Tentative)' : ''}`,
      `🏗️ 地盤 Site: ${matchedJob ? `${matchedJob.no} (${matchedJob.companyProjNo}) · ` : ''}${ev.site}`,
      `🗺️ 導航 Map: ${mapUrl}`,
      `🧪 測試項目 Tests: ${stpCodes.join(' + ') || '—'}`,
      `👤 主責操作員 Op: ${ev.operators.length > 0 ? ev.operators.join(' / ') : 'TBD'}`,
    ];

    if (ev.signatories && ev.signatories.length > 0) {
      lines.push(`🏅 授權簽署人 AS: ${ev.signatories.join(' / ')}`);
    }
    if (ev.helpers && ev.helpers.length > 0) {
      lines.push(`🛠️ 助理同事 Asst: ${ev.helpers.join(' / ')}`);
    }
    if (onSiteGear.length > 0) {
      lines.push(
        `📦 已在場器材 On-Site: ${onSiteGear.map((g) => `${g.code} (Due:${g.certDue || g.due})`).join(', ')}`
      );
    }
    if (recommendedLabGear.length > 0 && ev.type !== 'training') {
      lines.push(
        `🧰 建議攜帶有效在庫器材 Bring from Lab: ${recommendedLabGear
          .slice(0, 4)
          .map((g) => `${g.code} ${g.name.split(' ')[0]} (Due:${g.certDue || g.due})`)
          .join(', ')}`
      );
    }
    if (ev.notes) {
      lines.push(`📝 備註 Note: ${ev.notes}`);
    }
    return lines.join('\n');
  });

  const footer =
    lang === 'en'
      ? `━━━━━━━━━━━━━━━━━━━━\n✅ Please verify equipment Cal Due dates & FQS50 loan checkout before departure.`
      : `━━━━━━━━━━━━━━━━━━━━\n✅ 出隊前請核對儀器有效校準標籤 (Cal Due) 並於系統辦理 FQS50 借出登記。`;

  return {
    text: [...header, ...blocks.map((b) => b + '\n'), footer].join('\n'),
    eventCount: dayEvents.length,
    siteTestCount,
    trainingCount,
  };
}
