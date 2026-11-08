import { EquipmentItem, CalendarEvent } from '../types';
import { REF_TODAY, daysBetween, isValidIsoDate, getEquipmentCalStatus } from '../utils';
import { FQS49_MATRIX } from '../data/serverDocsCatalog';

export interface OverdueLoanStatus {
  isOverdue: boolean;
  overdueDays: number;
  expectedReturn: string;
  label: string;
}

export function getLoanOverdueStatus(
  eq: EquipmentItem,
  today = REF_TODAY,
  lang: 'zh' | 'en' = 'zh'
): OverdueLoanStatus {
  const exp = eq.currentLoan?.expectedReturn;
  if (!eq.currentLoan || !isValidIsoDate(exp)) {
    return { isOverdue: false, overdueDays: 0, expectedReturn: exp || '', label: '' };
  }
  const diff = daysBetween(exp!, today);
  const overdueDays = Math.max(0, diff);
  const isOverdue = diff > 0;
  return {
    isOverdue,
    overdueDays,
    expectedReturn: exp!,
    label: isOverdue ? (lang === 'en' ? `Overdue ${overdueDays}d` : `逾期 ${overdueDays}日`) : '',
  };
}

export interface CheckoutComplianceResult {
  level: 'ok' | 'warn' | 'blocked';
  titleZh: string;
  titleEn: string;
  detailZh: string;
  detailEn: string;
  requiresOverride: boolean;
  returnExceedsCalDue: boolean;
}

export function evaluateCheckoutCompliance(
  eq: EquipmentItem,
  expectedReturn?: string,
  today = REF_TODAY
): CheckoutComplianceResult {
  const cal = getEquipmentCalStatus(eq, today, 'zh');
  const returnExceedsCalDue = !!(
    expectedReturn &&
    isValidIsoDate(expectedReturn) &&
    isValidIsoDate(eq.due) &&
    expectedReturn > eq.due
  );

  if (cal.disposed) {
    return {
      level: 'blocked',
      titleZh: '⛔ 此器材已標記 Disposed（棄置），嚴禁借出做 HOKLAS 測試',
      titleEn: '⛔ Equipment is Disposed — prohibited for HOKLAS testing',
      detailZh: '如需移倉或報廢處理，請勾選下方特殊豁免確認並註明原因。',
      detailEn: 'Tick the special override below and state reason if moving for disposal.',
      requiresOverride: true,
      returnExceedsCalDue,
    };
  }

  if (!cal.canUseInTest || cal.kind === 'bad') {
    return {
      level: 'blocked',
      titleZh: `🚨 HOKLAS 合規攔截：外校證書已過期（Due: ${eq.due}）`,
      titleEn: `🚨 HOKLAS Compliance Block: Calibration Overdue (Due: ${eq.due})`,
      detailZh: '按 HOKLAS 298 品質手冊，過期未校準之儀器不得用於認可現場測試。如僅借出作送檢外校或內部非認可核查，請勾選豁免並填寫原因。',
      detailEn: 'Overdue instruments cannot be used for HOKLAS accredited tests. Tick override below only if dispatching for external calibration or non-accredited check.',
      requiresOverride: true,
      returnExceedsCalDue,
    };
  }

  if (returnExceedsCalDue) {
    return {
      level: 'warn',
      titleZh: `⚠️ 預計歸還日（${expectedReturn}）晚於校準到期日（${eq.due}）`,
      titleEn: `⚠️ Expected Return (${expectedReturn}) exceeds Cal Due Date (${eq.due})`,
      detailZh: '借用期間儀器將會過期，請縮短借用日期或提醒現場同事於到期前交還送檢。',
      detailEn: 'Calibration will expire during the loan period. Shorten return date or return before due date.',
      requiresOverride: false,
      returnExceedsCalDue: true,
    };
  }

  if (cal.kind === 'warn' || cal.mismatch) {
    return {
      level: 'warn',
      titleZh: `⚠️ 校準即將到期提示：尚餘 ${cal.daysLeft ?? '?'} 日到期（${eq.due}）`,
      titleEn: `⚠️ Calibration Due Soon: ${cal.daysLeft ?? '?'} days left (${eq.due})`,
      detailZh: cal.mismatch
        ? `注意：清單到期日 (${eq.due}) 與最新證書 (${eq.certDue}) 月份不一致，建議先同步證書日期。`
        : '請確保於校準到期日前完成現場測試並交還實驗室安排 FQS38 外校。',
      detailEn: cal.mismatch
        ? `Registry due date (${eq.due}) differs from latest cert (${eq.certDue}).`
        : 'Ensure site testing finishes before calibration due date.',
      requiresOverride: false,
      returnExceedsCalDue: false,
    };
  }

  return {
    level: 'ok',
    titleZh: `✓ HOKLAS 校準有效（到期日：${eq.due || '免外校'}）`,
    titleEn: `✓ HOKLAS Calibration Valid (Due: ${eq.due || 'Internal Check'})`,
    detailZh: '符合 HOKLAS 298 現場測試儀器合規要求，可正常借出。',
    detailEn: 'Meets HOKLAS 298 equipment compliance for site deployment.',
    requiresOverride: false,
    returnExceedsCalDue: false,
  };
}

export type Fqs49RoleBadge = 'as' | 'op' | 'trainee' | 'none';

export interface StaffScheduleCheck {
  staffRoles: Record<string, Fqs49RoleBadge>;
  hasQualifiedLead: boolean;
  doubleBookedStaff: { name: string; conflictTitle: string; conflictTime?: string }[];
  equipmentSummary: { testCode: string; availableCalibrated: number; loanedCount: number }[];
}

function normalizePersonName(raw: string): string {
  return raw.replace(/\([^)]*\)/g, '').trim().toLowerCase();
}

export function getStaffFqs49Role(staffName: string, testCodes: string[]): Fqs49RoleBadge {
  const norm = normalizePersonName(staffName);
  if (!norm || testCodes.length === 0) return 'none';
  let best: Fqs49RoleBadge = 'none';
  for (const code of testCodes) {
    const row = FQS49_MATRIX.find((r) => r.code === code.toUpperCase());
    if (!row) continue;
    if (row.signatories.some((s) => normalizePersonName(s) === norm)) {
      return 'as';
    }
    if (row.qualifiedOperators.some((o) => normalizePersonName(o) === norm)) {
      best = 'op';
    } else if (best === 'none' && row.trainees.some((t) => normalizePersonName(t) === norm)) {
      best = 'trainee';
    }
  }
  return best;
}

export function checkFqs49AndConflicts(params: {
  testCodes: string[];
  date: string;
  timeSlot?: string;
  selectedOperators: string[];
  existingEventId?: string;
  allEvents: CalendarEvent[];
  allEquipment: EquipmentItem[];
  allStaffNames: string[];
  today?: string;
}): StaffScheduleCheck {
  const {
    testCodes,
    date,
    selectedOperators,
    existingEventId,
    allEvents,
    allEquipment,
    allStaffNames,
    today = REF_TODAY,
  } = params;

  const staffRoles: Record<string, Fqs49RoleBadge> = {};
  for (const name of allStaffNames) {
    staffRoles[name] = getStaffFqs49Role(name, testCodes);
  }

  const hasQualifiedLead = selectedOperators.some((op) => {
    const r = getStaffFqs49Role(op, testCodes);
    return r === 'as' || r === 'op';
  });

  const sameDayEvents = allEvents.filter(
    (ev) => ev.date === date && ev.id !== existingEventId && ev.status !== 'cancelled'
  );

  const doubleBookedStaff: { name: string; conflictTitle: string; conflictTime?: string }[] = [];
  for (const op of selectedOperators) {
    const normOp = normalizePersonName(op);
    const conflict = sameDayEvents.find((ev) =>
      ev.operators.some((existingOp) => normalizePersonName(existingOp) === normOp)
    );
    if (conflict) {
      doubleBookedStaff.push({
        name: op,
        conflictTitle: conflict.title || conflict.site,
        conflictTime: conflict.timeSlot,
      });
    }
  }

  const inUseEq = allEquipment.filter((e) => e.inUse !== 'N');
  const equipmentSummary = testCodes.map((tc) => {
    const code = tc.toUpperCase();
    const matching = inUseEq.filter((e) => {
      const tags = e.testTags || e.tests.split('+').map((s) => s.trim().toUpperCase()).filter(Boolean);
      return tags.includes(code);
    });
    const availableCalibrated = matching.filter(
      (e) => !e.currentLoan && getEquipmentCalStatus(e, today).canUseInTest
    ).length;
    const loanedCount = matching.filter((e) => !!e.currentLoan).length;
    return { testCode: code, availableCalibrated, loanedCount };
  });

  return {
    staffRoles,
    hasQualifiedLead,
    doubleBookedStaff,
    equipmentSummary,
  };
}

export function detectCalcPassStatus(copyText: string): boolean {
  const upper = copyText.toUpperCase();
  if (upper.includes('EXCEED') || upper.includes('RE-TEST') || upper.includes('RETEST') || upper.includes('HOLD LOAD')) {
    return false;
  }
  return true;
}
