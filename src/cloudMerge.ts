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

  // 2. Merge Equipment by Code, unioning calCerts and respecting updatedAt
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
      const base = isNewer(lEq.updatedAt, rEq.updatedAt) ? { ...rEq, ...lEq } : rEq;
      if (isNewer(lEq.updatedAt, rEq.updatedAt)) hasLocalAdditions = true;
      eqMap.set(lEq.code, {
        ...base,
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

  // 4. Merge Events by ID, respecting updatedAt and unioning attachments
  const evMap = new Map<string, CalendarEvent>();
  for (const rEv of remote.events || []) evMap.set(rEv.id, rEv);
  for (const lEv of local.events || []) {
    const rEv = evMap.get(lEv.id);
    if (!rEv) {
      evMap.set(lEv.id, lEv);
      hasLocalAdditions = true;
    } else {
      const attMerge = mergeById<SharedDocAttachment>(rEv.attachments, lEv.attachments);
      if (attMerge.added) hasLocalAdditions = true;
      const base = isNewer(lEv.updatedAt, rEv.updatedAt) ? { ...rEv, ...lEv } : rEv;
      if (isNewer(lEv.updatedAt, rEv.updatedAt)) hasLocalAdditions = true;
      evMap.set(lEv.id, {
        ...base,
        attachments: attMerge.list.length > 0 ? attMerge.list : base.attachments,
      });
    }
  }
  const events = Array.from(evMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 5. Merge Tests (STPs) by Code, unioning stpFiles and calCerts
  const testMap = new Map<string, TestMethodItem>();
  for (const rT of remote.tests || []) testMap.set(rT.code, rT);
  for (const lT of local.tests || []) {
    const rT = testMap.get(lT.code);
    if (!rT) {
      testMap.set(lT.code, lT);
      hasLocalAdditions = true;
    } else {
      const filesMerge = mergeById<SharedDocAttachment>(rT.stpFiles, lT.stpFiles);
      const certsMerge = mergeById<CalCertAttachment>(rT.calCerts, lT.calCerts);
      if (filesMerge.added || certsMerge.added) hasLocalAdditions = true;
      const base = isNewer(lT.updatedAt, rT.updatedAt) ? { ...rT, ...lT } : rT;
      if (isNewer(lT.updatedAt, rT.updatedAt)) hasLocalAdditions = true;
      testMap.set(lT.code, {
        ...base,
        stpFiles: filesMerge.list.length > 0 ? filesMerge.list : base.stpFiles,
        calCerts: certsMerge.list.length > 0 ? certsMerge.list : base.calCerts,
      });
    }
  }
  const tests = Array.from(testMap.values());

  // 6. Merge FieldCalcRecords by ID
  const calcMerge = mergeById<FieldCalcRecord>(remote.calcRecords, local.calcRecords);
  if (calcMerge.added) hasLocalAdditions = true;
  const calcRecords = calcMerge.list.sort((a, b) => b.testedAt.localeCompare(a.testedAt));

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

