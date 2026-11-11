import {
  EquipmentItem,
  EquipmentLoanRecord,
  JobItem,
  TestMethodItem,
  CalendarEvent,
  FieldCalcRecord,
  CalCertAttachment,
  SharedDocAttachment,
  DriveVaultFile,
} from './types';
import { isOfficialJobRefNo, normalizeCalcRecordsJobRef } from './utils/completedWorksheetGenerator';

export interface AppPersistedState {
  jobs: JobItem[];
  loans: EquipmentLoanRecord[];
  equipment: EquipmentItem[];
  tests: TestMethodItem[];
  events: CalendarEvent[];
  pinnedStps: string[];
  calcRecords?: FieldCalcRecord[];
  driveFiles?: DriveVaultFile[];
}

function isNewer(localTs?: string, remoteTs?: string): boolean {
  if (!localTs) return false;
  if (!remoteTs) return true;
  return localTs > remoteTs;
}

function mergeById<T extends { id: string }>(remoteArr?: T[], localArr?: T[]): { list: T[]; added: boolean } {
  const map = new Map<string, T>();
  let added = false;
  for (const r of remoteArr || []) map.set(r.id, r);
  for (const l of localArr || []) {
    if (!map.has(l.id)) {
      map.set(l.id, l);
      added = true;
    }
  }
  return { list: Array.from(map.values()), added };
}

function isLegacyOfficePath(val?: string): boolean {
  return !!val && /\.(doc|docx|xls|xlsx)$/i.test(val.trim());
}

function isStaleControlledValue(candidate?: string, reference?: string): boolean {
  if (!reference) return false;
  if (!candidate) return true;
  if (isLegacyOfficePath(candidate) && !isLegacyOfficePath(reference)) return true;
  if (/rev2_260417/i.test(candidate) && !/rev2_260417/i.test(reference)) return true;
  return false;
}

function pickControlledTestField(
  remoteVal: string | undefined,
  localVal: string | undefined,
  remoteHasUpdatedAt: boolean
): { value: string | undefined; upgradedFromLocal: boolean } {
  if (isStaleControlledValue(remoteVal, localVal)) {
    return { value: localVal, upgradedFromLocal: true };
  }
  if (isStaleControlledValue(localVal, remoteVal)) {
    return { value: remoteVal, upgradedFromLocal: false };
  }
  if (!remoteHasUpdatedAt && localVal && localVal !== remoteVal) {
    return { value: localVal, upgradedFromLocal: true };
  }
  return { value: remoteVal ?? localVal, upgradedFromLocal: false };
}

function parseEqTags(eq: EquipmentItem): string[] {
  return eq.testTags && eq.testTags.length > 0
    ? eq.testTags
    : (eq.tests || '')
        .split('+')
        .map((s) => s.trim())
        .filter(Boolean);
}

function mergeStpFilesList(
  remoteFiles?: SharedDocAttachment[],
  localFiles?: SharedDocAttachment[]
): { list: SharedDocAttachment[]; changed: boolean } {
  const map = new Map<string, SharedDocAttachment>();
  let changed = false;

  for (const r of remoteFiles || []) {
    if (r.id.startsWith('doc-') && isLegacyOfficePath(r.dataUrl)) {
      changed = true;
      continue;
    }
    map.set(r.id, r);
  }

  for (const l of localFiles || []) {
    if (l.id.startsWith('doc-') && isLegacyOfficePath(l.dataUrl)) {
      continue;
    }
    const existing = map.get(l.id);
    if (!existing) {
      map.set(l.id, l);
      changed = true;
    } else if (l.id.startsWith('doc-') && isStaleControlledValue(existing.dataUrl, l.dataUrl)) {
      map.set(l.id, l);
      changed = true;
    }
  }

  return { list: Array.from(map.values()), changed };
}

export function mergeUnsyncedLocalIntoRemote(
  local: AppPersistedState,
  remote: AppPersistedState
): { merged: AppPersistedState; hasLocalAdditions: boolean } {
  let hasLocalAdditions = false;

  // 1. Merge Loans by ID & return state / updatedAt
  const loanMap = new Map<string, EquipmentLoanRecord>();
  for (const rLn of remote.loans || []) loanMap.set(rLn.id, rLn);
  for (const lLn of local.loans || []) {
    const existing = loanMap.get(lLn.id);
    if (!existing) {
      loanMap.set(lLn.id, lLn);
      hasLocalAdditions = true;
    } else if (lLn.returnedAt && !existing.returnedAt) {
      loanMap.set(lLn.id, lLn);
      hasLocalAdditions = true;
    } else if (isNewer(lLn.updatedAt, existing.updatedAt)) {
      loanMap.set(lLn.id, { ...existing, ...lLn });
      hasLocalAdditions = true;
    }
  }
  const loans = Array.from(loanMap.values()).sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt));

  // 2. Merge Equipment by Code, unioning calCerts, propagating LT-TD-01 / seed testTags, and respecting updatedAt
  const eqMap = new Map<string, EquipmentItem>();
  for (const rEq of remote.equipment || []) eqMap.set(rEq.code, rEq);
  for (const lEq of local.equipment || []) {
    const rEq = eqMap.get(lEq.code);
    if (!rEq) {
      eqMap.set(lEq.code, lEq);
      hasLocalAdditions = true;
    } else {
      const certsMerge = mergeById<CalCertAttachment>(rEq.calCerts, lEq.calCerts);
      if (certsMerge.added) hasLocalAdditions = true;
      const localNewer = isNewer(lEq.updatedAt, rEq.updatedAt);
      const base = localNewer ? { ...rEq, ...lEq } : rEq;
      if (localNewer) hasLocalAdditions = true;

      const rTags = parseEqTags(rEq);
      const lTags = parseEqTags(lEq);
      let resolvedTags = parseEqTags(base);
      let resolvedTests = base.tests;

      if (lEq.code === 'LT-TD-01') {
        const remoteMissingStopwatchTags =
          (lTags.includes('SO') && !rTags.includes('SO')) ||
          (lTags.includes('BL') && !rTags.includes('BL'));
        const localMissingStopwatchTags =
          (rTags.includes('SO') && !lTags.includes('SO')) ||
          (rTags.includes('BL') && !lTags.includes('BL'));
        if (remoteMissingStopwatchTags || localMissingStopwatchTags) {
          resolvedTags = Array.from(
            new Set(remoteMissingStopwatchTags ? [...lTags, ...rTags] : [...rTags, ...lTags])
          );
          resolvedTests = resolvedTags.join(' + ');
          if (remoteMissingStopwatchTags) hasLocalAdditions = true;
        }
      } else if (!localNewer && !rEq.updatedAt && lTags.some((t) => !rTags.includes(t))) {
        resolvedTags = Array.from(new Set([...lTags, ...rTags]));
        resolvedTests = resolvedTags.join(' + ');
        hasLocalAdditions = true;
      }

      eqMap.set(lEq.code, {
        ...base,
        tests: resolvedTests,
        testTags: resolvedTags.length > 0 ? resolvedTags : base.testTags,
        calCerts: certsMerge.list.length > 0 ? certsMerge.list : base.calCerts,
      });
    }
  }

  const equipment = Array.from(eqMap.values()).map((eq) => {
    const active = loans.find((l) => l.equipmentCode === eq.code && !l.returnedAt);
    if (active && eq.currentLoan?.loanId !== active.id) {
      hasLocalAdditions = true;
      return {
        ...eq,
        loc: active.siteLocation,
        currentLoan: {
          loanId: active.id,
          borrowerName: active.borrowerName,
          borrowerStaffId: active.borrowerStaffId,
          jobNo: active.jobNo,
          siteLocation: active.siteLocation,
          checkoutAt: active.checkoutAt,
          expectedReturn: active.expectedReturn,
          remark: active.remark,
        },
      };
    }
    if (!active && eq.currentLoan) {
      hasLocalAdditions = true;
      return { ...eq, loc: eq.store || 'Office', currentLoan: null };
    }
    return eq;
  });

  // 3. Merge Jobs by No, respecting updatedAt for local edits
  const jobMap = new Map<string, JobItem>();
  for (const rJob of remote.jobs || []) jobMap.set(rJob.no, rJob);
  const extraJobs: JobItem[] = [];
  for (const lJob of local.jobs || []) {
    const rJob = jobMap.get(lJob.no);
    if (!rJob) {
      extraJobs.push(lJob);
      hasLocalAdditions = true;
    } else if (isNewer(lJob.updatedAt, rJob.updatedAt)) {
      jobMap.set(lJob.no, { ...rJob, ...lJob });
      hasLocalAdditions = true;
    }
  }
  const jobs = [...extraJobs, ...Array.from(jobMap.values())];

  // 4. Merge Events by ID, respecting updatedAt, pruning removed server seed events, and unioning attachments
  const localSeedIds = new Set((local.events || []).filter((e) => e.id.startsWith('ev-')).map((e) => e.id));
  const evMap = new Map<string, CalendarEvent>();
  for (const rEv of remote.events || []) {
    if (rEv.id.startsWith('ev-') && !rEv.updatedAt && !localSeedIds.has(rEv.id)) {
      hasLocalAdditions = true;
      continue;
    }
    evMap.set(rEv.id, rEv);
  }
  for (const lEv of local.events || []) {
    const rEv = evMap.get(lEv.id);
    if (!rEv) {
      evMap.set(lEv.id, lEv);
      hasLocalAdditions = true;
    } else {
      const attMerge = mergeById<SharedDocAttachment>(rEv.attachments, lEv.attachments);
      if (attMerge.added) hasLocalAdditions = true;
      const preferLocalSeed =
        lEv.id.startsWith('ev-') &&
        !rEv.updatedAt &&
        (lEv.status !== rEv.status ||
          lEv.title !== rEv.title ||
          lEv.notes !== rEv.notes ||
          lEv.site !== rEv.site ||
          lEv.type !== rEv.type ||
          lEv.dateTentative !== rEv.dateTentative ||
          JSON.stringify(lEv.operators) !== JSON.stringify(rEv.operators) ||
          JSON.stringify(lEv.helpers) !== JSON.stringify(rEv.helpers));
      const base = isNewer(lEv.updatedAt, rEv.updatedAt) || preferLocalSeed ? { ...rEv, ...lEv } : rEv;
      if (isNewer(lEv.updatedAt, rEv.updatedAt) || preferLocalSeed) hasLocalAdditions = true;
      evMap.set(lEv.id, {
        ...base,
        attachments: attMerge.list.length > 0 ? attMerge.list : base.attachments,
      });
    }
  }
  const events = Array.from(evMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 5. Merge Tests (STPs) by Code, unioning stpFiles and calCerts and refreshing stale controlled metadata
  const testMap = new Map<string, TestMethodItem>();
  for (const rT of remote.tests || []) testMap.set(rT.code, rT);
  for (const lT of local.tests || []) {
    const rT = testMap.get(lT.code);
    if (!rT) {
      testMap.set(lT.code, lT);
      hasLocalAdditions = true;
    } else {
      const filesMerge = mergeStpFilesList(rT.stpFiles, lT.stpFiles);
      const certsMerge = mergeById<CalCertAttachment>(rT.calCerts, lT.calCerts);
      const remoteHasUpdatedAt = !!rT.updatedAt;

      const preferLocalTestMeta =
        !remoteHasUpdatedAt &&
        (lT.stpPdfUrl !== rT.stpPdfUrl ||
          lT.stpRev !== rT.stpRev ||
          lT.stpEffectiveDate !== rT.stpEffectiveDate ||
          lT.worksheetCode !== rT.worksheetCode ||
          lT.worksheetPdfUrl !== rT.worksheetPdfUrl ||
          lT.worksheetUrl !== rT.worksheetUrl ||
          lT.orderFormUrl !== rT.orderFormUrl ||
          lT.dailyRecordUrl !== rT.dailyRecordUrl ||
          lT.muTemplateUrl !== rT.muTemplateUrl ||
          JSON.stringify(lT.keyParams) !== JSON.stringify(rT.keyParams) ||
          JSON.stringify(lT.versions) !== JSON.stringify(rT.versions));

      const stpPdfPick = pickControlledTestField(rT.stpPdfUrl, lT.stpPdfUrl, remoteHasUpdatedAt);
      const wsCodePick = pickControlledTestField(rT.worksheetCode, lT.worksheetCode, remoteHasUpdatedAt);
      const wsPdfPick = pickControlledTestField(rT.worksheetPdfUrl, lT.worksheetPdfUrl, remoteHasUpdatedAt);
      const wsUrlPick = pickControlledTestField(rT.worksheetUrl, lT.worksheetUrl, remoteHasUpdatedAt);
      const orderPick = pickControlledTestField(rT.orderFormUrl, lT.orderFormUrl, remoteHasUpdatedAt);
      const dailyPick = pickControlledTestField(rT.dailyRecordUrl, lT.dailyRecordUrl, remoteHasUpdatedAt);
      const muPick = pickControlledTestField(rT.muTemplateUrl, lT.muTemplateUrl, remoteHasUpdatedAt);

      const staleRevOnRemote =
        (!rT.stpRev && !!lT.stpRev) ||
        (/^rev\.?\s*2$/i.test((rT.stpRev || '').trim()) && /^rev\.?\s*3$/i.test((lT.stpRev || '').trim()));
      const staleDateOnRemote =
        (!rT.stpEffectiveDate && !!lT.stpEffectiveDate) ||
        (staleRevOnRemote && !!lT.stpEffectiveDate && lT.stpEffectiveDate !== rT.stpEffectiveDate);

      const anyControlledUpgraded =
        stpPdfPick.upgradedFromLocal ||
        wsCodePick.upgradedFromLocal ||
        wsPdfPick.upgradedFromLocal ||
        wsUrlPick.upgradedFromLocal ||
        orderPick.upgradedFromLocal ||
        dailyPick.upgradedFromLocal ||
        muPick.upgradedFromLocal ||
        staleRevOnRemote ||
        staleDateOnRemote;

      const localNewer = isNewer(lT.updatedAt, rT.updatedAt);
      if (filesMerge.changed || certsMerge.added || preferLocalTestMeta || anyControlledUpgraded || localNewer) {
        hasLocalAdditions = true;
      }

      const base = localNewer || preferLocalTestMeta ? { ...rT, ...lT } : rT;
      const preferLocalArrays =
        localNewer ||
        preferLocalTestMeta ||
        anyControlledUpgraded ||
        (!rT.keyParams?.length && !!lT.keyParams?.length) ||
        (!rT.versions?.length && !!lT.versions?.length);

      testMap.set(lT.code, {
        ...base,
        stpPdfUrl: stpPdfPick.value,
        stpRev: staleRevOnRemote || localNewer || preferLocalTestMeta ? lT.stpRev || rT.stpRev : base.stpRev,
        stpEffectiveDate:
          staleDateOnRemote || localNewer || preferLocalTestMeta
            ? lT.stpEffectiveDate || rT.stpEffectiveDate
            : base.stpEffectiveDate,
        worksheetCode: wsCodePick.value || base.worksheetCode,
        worksheetPdfUrl: wsPdfPick.value,
        worksheetUrl: wsUrlPick.value,
        orderFormUrl: orderPick.value,
        dailyRecordUrl: dailyPick.value,
        muTemplateUrl: muPick.value,
        keyParams: preferLocalArrays && lT.keyParams?.length ? lT.keyParams : base.keyParams,
        versions: preferLocalArrays && lT.versions?.length ? lT.versions : base.versions,
        equipmentTypes:
          preferLocalArrays && lT.equipmentTypes?.length ? lT.equipmentTypes : base.equipmentTypes,
        stpFiles: filesMerge.list.length > 0 ? filesMerge.list : base.stpFiles,
        calCerts: certsMerge.list.length > 0 ? certsMerge.list : base.calCerts,
      });
    }
  }
  const tests = Array.from(testMap.values());

  // 6. Merge FieldCalcRecords by ID & normalize legacy project-prefixed jobRefNo values
  const calcMap = new Map<string, FieldCalcRecord>();
  for (const rC of remote.calcRecords || []) calcMap.set(rC.id, rC);
  for (const lC of local.calcRecords || []) {
    const rC = calcMap.get(lC.id);
    if (!rC) {
      calcMap.set(lC.id, lC);
      hasLocalAdditions = true;
    } else if (!isOfficialJobRefNo(rC.jobRefNo) && isOfficialJobRefNo(lC.jobRefNo)) {
      calcMap.set(lC.id, { ...rC, jobRefNo: lC.jobRefNo });
      hasLocalAdditions = true;
    }
  }
  const sortedCalcs = Array.from(calcMap.values()).sort((a, b) => (b.testedAt || '').localeCompare(a.testedAt || ''));
  const calcRecords = normalizeCalcRecordsJobRef(sortedCalcs);
  if (calcRecords.some((r, idx) => r.jobRefNo !== sortedCalcs[idx]?.jobRefNo)) {
    hasLocalAdditions = true;
  }

  // 7. Merge DriveVaultFiles by ID
  const driveFilesMerge = mergeById<DriveVaultFile>(remote.driveFiles, local.driveFiles);
  if (driveFilesMerge.added) hasLocalAdditions = true;
  const driveFiles = driveFilesMerge.list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return {
    hasLocalAdditions,
    merged: {
      jobs,
      loans,
      equipment,
      tests,
      events,
      pinnedStps: remote.pinnedStps || local.pinnedStps || ['KD', 'SO', 'FC'],
      calcRecords,
      driveFiles,
    },
  };
}

