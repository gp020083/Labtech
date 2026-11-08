import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { usePrefs } from './prefs';
import {
  localizeTest,
  localizeJob,
  localizeLoan,
  localizeEquipment,
  localizeEvent,
} from './data/enTranslations';
import {
  UserAccount,
  EquipmentItem,
  EquipmentLoanRecord,
  JobItem,
  TestMethodItem,
  CalendarEvent,
  SharedDocAttachment,
  CalCertAttachment,
  FieldCalcRecord,
  DriveVaultFile,
} from './types';
import { PreviewDocRequest } from './components/DocumentPreviewModal';
import {
  fetchDriveDbState,
  saveDriveDbState,
  uploadFileToDrive,
  uploadBatchFilesToDrive,
  getConfiguredDriveWebAppUrl,
} from './cloudDb';
import { mergeUnsyncedLocalIntoRemote } from './cloudMerge';
import {
  MS_ACCOUNTS,
  buildInitialJobs,
  buildInitialLoans,
  buildInitialEquipment,
  buildInitialTests,
  buildInitialEvents,
} from './data/initialState';
import { buildPinnedGoogleMapsUrl } from './components/SiteMapBox';
import { nowTimestamp, REF_TODAY } from './utils';
import { extractBase64Payload, BatchUndoSnapshot, applyBatchUndoRollback } from './utils/batchUpload';
import {
  MAX_SITE_PHOTOS_PER_RECORD,
  TARGET_DRIVE_UPLOADS_FOLDER_ID,
  buildSitePhotoDriveTarget,
  buildFieldCalcRecordDriveBundle,
  estimateDataUrlBytes,
} from './utils/sitePhotoUtils';

export interface ToastMsg {
  id: string;
  title: string;
  detail?: string;
  tone?: 'ok' | 'info' | 'warn';
}

export interface AppContextType {
  user: UserAccount | null;
  accounts: UserAccount[];
  loginWithPassword: (password: string, accountId?: string, remember?: boolean) => boolean;
  loginWithMs: (email?: string) => void;
  switchAccount: (accountId: string) => void;
  logout: () => void;

  jobs: JobItem[];
  addOrUpdateJob: (job: JobItem) => void;

  equipment: EquipmentItem[];
  loans: EquipmentLoanRecord[];
  addEquipment: (eq: EquipmentItem) => void;
  checkoutEquipment: (params: {
    code: string;
    borrowerStaffId: string;
    borrowerName: string;
    jobNo: string;
    siteLocation: string;
    checkoutAt?: string;
    expectedReturn: string;
    remark?: string;
  }) => void;
  returnEquipment: (params: {
    code: string;
    returnStore: string;
    returnedBy?: string;
    returnedAt?: string;
    condition: 'good' | 'needs_check' | 'damaged';
    remark?: string;
  }) => void;
  syncEquipmentCertToDue: (code: string) => void;
  toggleEquipmentTag: (code: string, tag: string) => void;
  uploadEquipmentCalCert: (params: {
    code: string;
    fileName: string;
    fileSize: string;
    dueDate?: string;
    certNo?: string;
    calLab?: string;
    dataUrl?: string;
  }) => void;
  uploadStpCalCert: (params: {
    stpCode: string;
    fileName: string;
    fileSize: string;
    eqCode?: string;
    dueDate?: string;
    certNo?: string;
    dataUrl?: string;
  }) => void;

  tests: TestMethodItem[];
  pinnedStps: string[];
  togglePinStp: (code: string) => void;
  addStpItem: (item: TestMethodItem) => void;
  uploadStpDocFile: (stpCode: string, doc: Omit<SharedDocAttachment, 'id' | 'uploadedBy' | 'uploadedAt' | 'serverPath'>) => void;

  events: CalendarEvent[];
  saveEvent: (ev: Omit<CalendarEvent, 'id'>, existingId?: string) => void;
  deleteEvent: (id: string) => void;
  uploadEventAttachment: (eventId: string, doc: Omit<SharedDocAttachment, 'id' | 'uploadedBy' | 'uploadedAt' | 'serverPath'>) => void;

  calcRecords: FieldCalcRecord[];
  saveCalcRecord: (rec: {
    jobNo: string;
    jobRefNo?: string;
    worksOrderNo?: string;
    projectTitle?: string;
    stpCode: string;
    title: string;
    locationNote?: string;
    summary: string;
    pass: boolean;
    signatureDataUrl?: string;
    signedBy?: string;
    signedRole?: string;
    signedAt?: string;
    sitePhotos?: FieldCalcRecord['sitePhotos'];
    structuredData?: FieldCalcRecord['structuredData'];
  }) => FieldCalcRecord;
  deleteCalcRecord: (id: string) => void;

  driveFiles: DriveVaultFile[];
  batchUploadToDrive: (
    items: {
      fileName: string;
      fileSize: string;
      mimeType: string;
      dataUrl: string;
      targetKind: 'equipment' | 'stp' | 'vault';
      targetCode: string;
      docType?: string;
      dueDate?: string;
      certNo?: string;
      collisionAction?: 'overwrite' | 'keep_both';
    }[],
    onProgress?: (completed: number, total: number) => void,
    onFileProgress?: (itemIndex: number, event: { percent: number; status: 'uploading' | 'done' | 'error'; driveSynced?: boolean }) => void,
    signal?: AbortSignal
  ) => Promise<{ uploadedCount: number; driveSyncedCount: number; cancelled?: boolean; results: DriveVaultFile[] }>;
  canUndoLastBatch: boolean;
  lastBatchSummary: { count: number; fileNames: string[] } | null;
  undoLastBatchUpload: () => boolean;

  stpPreviewCode: string | null;
  setStpPreviewCode: (code: string | null) => void;

  previewDoc: PreviewDocRequest | null;
  openPreviewDoc: (doc: PreviewDocRequest) => void;
  closePreviewDoc: () => void;

  driveSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncNowWithDrive: () => Promise<boolean>;

  toasts: ToastMsg[];
  pushToast: (title: string, detail?: string, tone?: ToastMsg['tone']) => void;
  resetAllDemoData: () => void;
}

const STORAGE_KEY = 'labtech_field_hub_v8';
const PREV_STORAGE_KEY = 'labtech_field_hub_v7';
const AUTH_KEY = 'labtech_field_hub_v7_auth';
const PLATFORM_PASS = 'labtech123';
const AppContext = createContext<AppContextType | null>(null);

function buildInitialCalcRecords(): FieldCalcRecord[] {
  return [
    {
      id: 'FC-260018',
      jobNo: 'LT0002',
      stpCode: 'FC',
      title: 'Flow Cone Efflux Time (ASTM C939)',
      locationNote: 'DGP0104 Trial Batch #18',
      summary: '[Labtech Calc — Flow Cone Efflux Time (ASTM C939)]\nWater Check (1725 mL) = 8.0 s (OK 8.0±0.2s) ｜ Grout Temp = 26.2 °C\nEfflux T1 = 16.4 s, T2 = 16.8 s → Mean Efflux Time = 16.6 s (Diff 0.4s Repeatability OK)',
      pass: true,
      testedAt: '2026-10-30 14:20',
      operatorName: 'Shih Chak Lung, Ben',
      structuredData: {
        kind: 'FC',
        waterCheckSec: 8.0,
        waterOk: true,
        groutTempC: 26.2,
        t1Sec: 16.4,
        t2Sec: 16.8,
        meanSec: 16.6,
        diffSec: 0.4,
        repeatOk: true,
      },
    },
    {
      id: 'BL-260018',
      jobNo: 'LT0002',
      stpCode: 'BL',
      title: 'Grout Bleeding & Expansion (ASTM C940)',
      locationNote: 'DGP0104 Trial Batch #18',
      summary: '[BL Grout Bleeding & Expansion — Unit: mL]\nInitial (V1): 800 mL\nFinal Bleed (Vw): 11 mL\nFinal Bleeding: 1.38% (Spec <= 2.0% -> PASS)\nFree Expansion: +0.75%',
      pass: true,
      testedAt: '2026-10-30 17:25',
      operatorName: 'Shih Chak Lung, Ben',
      structuredData: {
        kind: 'BL',
        unit: 'mL',
        v1: 800,
        decantedVw: 11,
        specLimitPct: 2.0,
        finalBleedAmt: 11,
        finalBleedPct: 1.38,
        finalExpPct: 0.75,
        isPass: true,
        intervals: [
          { timeLabel: '15 min', v2: 802, vg: 800, bleedAmt: 2, bleedPct: 0.25, expPct: 0.25 },
          { timeLabel: '30 min', v2: 804, vg: 799, bleedAmt: 5, bleedPct: 0.63, expPct: 0.50 },
          { timeLabel: '60 min', v2: 805, vg: 797, bleedAmt: 8, bleedPct: 1.00, expPct: 0.63 },
          { timeLabel: '120 min', v2: 806, vg: 796, bleedAmt: 10, bleedPct: 1.25, expPct: 0.75 },
          { timeLabel: '180 min (3hr)', v2: 806, vg: 795, bleedAmt: 11, bleedPct: 1.38, expPct: 0.75 },
        ],
      },
    },
    {
      id: 'PO-260004',
      jobNo: 'LT0004',
      stpCode: 'PO',
      title: 'Point Load Strength Index Is(50) (ASTM D5731)',
      locationNote: 'BH12 Core Run 4 (18.50m)',
      summary: '[Labtech Calc — Point Load Test (ASTM D5731)]\nMode = Diametral ｜ D = 52 mm\nDe = 52.00 mm ｜ Failure Load P = 12.4 kN (26s)\nUncorrected Is = 4.59 MPa ｜ F = 1.018 → Is(50) = 4.67 MPa (Est. UCS ≈ 103 MPa)',
      pass: true,
      testedAt: '2026-11-05 11:40',
      operatorName: 'Chu Kar Wai, Peter',
      structuredData: {
        kind: 'PO',
        mode: 'diametral',
        dMm: 52,
        wMm: 52,
        loadKn: 12.4,
        failSec: 26,
        deMm: 52,
        isUncorrMpa: 4.59,
        fFactor: 1.018,
        is50Mpa: 4.67,
        estUcsMpa: 103,
        timeOk: true,
      },
    },
  ];
}

function createFreshState() {
  const jobs = buildInitialJobs();
  let loans = buildInitialLoans();
  try {
    const prevRaw = localStorage.getItem(PREV_STORAGE_KEY);
    if (prevRaw) {
      const prev = JSON.parse(prevRaw);
      if (Array.isArray(prev?.loans)) {
        const customLoans = prev.loans.filter((l: EquipmentLoanRecord) => l.id && !l.id.startsWith('LN-261'));
        if (customLoans.length > 0) loans = [...customLoans, ...loans];
      }
    }
  } catch {}
  const equipment = buildInitialEquipment(loans);
  const tests = buildInitialTests();
  const events = buildInitialEvents();
  const pinnedStps = ['KD', 'SO', 'FC'];
  const calcRecords = buildInitialCalcRecords();
  const driveFiles: DriveVaultFile[] = [];
  return { jobs, loans, equipment, tests, events, pinnedStps, calcRecords, driveFiles };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = usePrefs();
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        localStorage.setItem(AUTH_KEY, 'unlocked');
        return MS_ACCOUNTS[0];
      }
      const unlocked = localStorage.getItem(AUTH_KEY) === 'unlocked' || sessionStorage.getItem(AUTH_KEY) === 'unlocked';
      if (!unlocked) return null;
      const saved = localStorage.getItem(STORAGE_KEY + '_user');
      if (saved) return JSON.parse(saved);
      return MS_ACCOUNTS[0];
    } catch {}
    return null;
  });

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.jobs) && Array.isArray(parsed.equipment)) {
          const seedLoans = buildInitialLoans();
          const existingLoans: EquipmentLoanRecord[] = Array.isArray(parsed.loans) ? parsed.loans : [];
          const existingIds = new Set(existingLoans.map((l) => l.id));
          const mergedLoans = [
            ...existingLoans.map((l) => {
              const seedMatch = seedLoans.find((s) => s.id === l.id);
              return seedMatch ? { ...seedMatch, ...l, returnStore: l.returnStore || seedMatch.returnStore, returnedBy: l.returnedBy || seedMatch.returnedBy, returnRemark: l.returnRemark || seedMatch.returnRemark } : l;
            }),
            ...seedLoans.filter((s) => !existingIds.has(s.id)),
          ];
          const seedCalcs = buildInitialCalcRecords();
          const existingCalcs: FieldCalcRecord[] = Array.isArray(parsed.calcRecords) ? parsed.calcRecords : [];
          const calcIds = new Set(existingCalcs.map((c) => c.id));
          const mergedCalcs = [...existingCalcs, ...seedCalcs.filter((s) => !calcIds.has(s.id))];
          return { ...parsed, loans: mergedLoans, calcRecords: mergedCalcs } as ReturnType<typeof createFreshState>;
        }
      }
    } catch {}
    return createFreshState();
  });

  const [stpPreviewCode, setStpPreviewCode] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewDocRequest | null>(null);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('syncing');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [lastBatchSnapshot, setLastBatchSnapshot] = useState<BatchUndoSnapshot | null>(null);
  const hydratedRef = useRef(false);
  const skipNextCloudSaveRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const savingCountRef = useRef(0);
  const hasUnsyncedLocalChangesRef = useRef(false);
  const lastRevRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const openPreviewDoc = (doc: PreviewDocRequest) => setPreviewDoc(doc);
  const closePreviewDoc = () => setPreviewDoc(null);

  const pullFromCloud = async (opts?: { manual?: boolean; initial?: boolean }): Promise<boolean> => {
    if (!opts?.manual && typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    if (!opts?.manual && !opts?.initial && (pendingSaveRef.current || savingCountRef.current > 0)) return false;
    if (opts?.manual || opts?.initial) setDriveSyncStatus('syncing');
    try {
      const remote = await fetchDriveDbState<ReturnType<typeof createFreshState>>();
      const syncFlagKey = 'labtech_cloud_synced_once_v2';
      if (remote?.ok && remote.state && Array.isArray(remote.state.jobs) && Array.isArray(remote.state.equipment)) {
        const syncedOnce = localStorage.getItem(syncFlagKey) === '1';
        const shouldIncrementalMerge = !syncedOnce || hasUnsyncedLocalChangesRef.current || opts?.manual || opts?.initial;
        if (shouldIncrementalMerge) {
          try { localStorage.setItem(syncFlagKey, '1'); } catch {}
          const { merged, hasLocalAdditions } = mergeUnsyncedLocalIntoRemote(stateRef.current, remote.state);
          const mergedWithCalcs = {
            ...merged,
            calcRecords: merged.calcRecords || stateRef.current.calcRecords || buildInitialCalcRecords(),
            driveFiles: merged.driveFiles || stateRef.current.driveFiles || [],
          };
          if (hasLocalAdditions || hasUnsyncedLocalChangesRef.current) {
            skipNextCloudSaveRef.current = true;
            setState(mergedWithCalcs);
            const saved = await saveDriveDbState(mergedWithCalcs);
            if (saved.ok) {
              hasUnsyncedLocalChangesRef.current = false;
              if (saved.rev) lastRevRef.current = saved.rev;
            }
            setDriveSyncStatus(saved.ok ? 'synced' : 'error');
            if (opts?.manual) pushToast('已雙向合併並同步最新雲端資料', remote.updatedAt ? `更新時間：${remote.updatedAt.slice(0, 19)}` : undefined);
            return saved.ok;
          }
        }
        const remoteRev = remote.rev || 1;
        if (opts?.manual || opts?.initial || remoteRev > lastRevRef.current) {
          lastRevRef.current = remoteRev;
          skipNextCloudSaveRef.current = true;
          const { merged } = mergeUnsyncedLocalIntoRemote(stateRef.current, remote.state);
          setState({
            ...merged,
            calcRecords: merged.calcRecords || stateRef.current.calcRecords || buildInitialCalcRecords(),
            driveFiles: merged.driveFiles || stateRef.current.driveFiles || [],
          });
        }
        setDriveSyncStatus('synced');
        if (opts?.manual) pushToast('已同步最新雲端資料', remote.updatedAt ? `更新時間：${remote.updatedAt.slice(0, 19)}` : undefined);
        return true;
      }
      if (remote?.ok && !remote.state) {
        const saved = await saveDriveDbState(stateRef.current);
        try { localStorage.setItem(syncFlagKey, '1'); } catch {}
        if (saved.ok) hasUnsyncedLocalChangesRef.current = false;
        if (saved.rev) lastRevRef.current = saved.rev;
        setDriveSyncStatus(saved.ok ? 'synced' : 'error');
        return saved.ok;
      }
      if (opts?.manual) setDriveSyncStatus('error');
      return false;
    } catch {
      if (opts?.manual) {
        setDriveSyncStatus('error');
        pushToast('雲端同步連線失敗，已先安全儲存於本機（重連後自動合併）', undefined, 'warn');
      }
      return false;
    }
  };

  const syncNowWithDrive = () => pullFromCloud({ manual: true });

  useEffect(() => {
    pullFromCloud({ initial: true }).finally(() => {
      hydratedRef.current = true;
    });
    const handleWake = () => {
      if (document.visibilityState === 'visible') pullFromCloud();
    };
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullFromCloud();
    }, 8000);
    return () => {
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    try {
      const safeJson = JSON.stringify(state, (k, v) =>
        (k === 'dataUrl' || k === 'certUrl') && typeof v === 'string' && v.startsWith('data:') && v.length > 250000 ? undefined : v
      );
      localStorage.setItem(STORAGE_KEY, safeJson);
    } catch {}
    if (!hydratedRef.current || !getConfiguredDriveWebAppUrl()) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    hasUnsyncedLocalChangesRef.current = true;
    pendingSaveRef.current = true;
    const timer = setTimeout(() => {
      pendingSaveRef.current = false;
      savingCountRef.current += 1;
      setDriveSyncStatus('syncing');
      saveDriveDbState(state)
        .then((res) => {
          if (res.ok) hasUnsyncedLocalChangesRef.current = false;
          if (res.rev) lastRevRef.current = Math.max(lastRevRef.current, res.rev);
          setDriveSyncStatus(res.ok ? 'synced' : 'error');
        })
        .catch(() => setDriveSyncStatus('error'))
        .finally(() => {
          savingCountRef.current = Math.max(0, savingCountRef.current - 1);
        });
    }, 80);
    return () => {
      pendingSaveRef.current = false;
      clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY + '_user', JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY + '_user');
    } catch {}
  }, [user]);

  const pushToast = (title: string, detail?: string, tone: ToastMsg['tone'] = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, title, detail, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  };

  const loginWithMs = (email?: string) => {
    const clean = (email || 'benshih@lab-tech.com.hk').trim().toLowerCase();
    const matched =
      MS_ACCOUNTS.find((a) => a.email.toLowerCase() === clean) ||
      ({
        id: 'usr-custom',
        staffId: 'BS',
        email: clean.includes('@') ? clean : `${clean}@lab-tech.com.hk`,
        name: clean.split('@')[0],
        zh: '同事',
        title: 'Operator / Staff',
        role: 'operator',
        msTenant: 'Labtech Testing Ltd',
      } satisfies UserAccount);
    setUser(matched);
    pushToast('已登入系統', `${matched.zh || matched.name} (${matched.email})`);
  };

  const switchAccount = (accountId: string) => {
    const found = MS_ACCOUNTS.find((a) => a.id === accountId);
    if (found) {
      setUser(found);
      pushToast(`已切換身份：${found.zh || found.name}`, found.title);
    }
  };

  const loginWithPassword = (password: string, accountId?: string, remember = true): boolean => {
    if (password.trim() !== PLATFORM_PASS) return false;
    const matched = MS_ACCOUNTS.find((a) => a.id === accountId) || MS_ACCOUNTS[0];
    try {
      if (remember) {
        localStorage.setItem(AUTH_KEY, 'unlocked');
      } else {
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.setItem(AUTH_KEY, 'unlocked');
      }
    } catch {}
    setUser(matched);
    pushToast('歡迎登入 Labtech Field Hub', `${matched.zh || matched.name} · ${matched.title}`);
    return true;
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
    } catch {}
    setUser(null);
  };

  const addOrUpdateJob = (job: JobItem) => {
    const ts = nowTimestamp();
    const addr = (job.mapAddress || job.shortName || job.project || '香港').trim();
    const draftJob: JobItem = { ...job, mapAddress: addr, updatedAt: ts };
    const enrichedJob: JobItem = { ...draftJob, googleMapsUrl: buildPinnedGoogleMapsUrl(draftJob) };
    setState((prev) => {
      const exists = prev.jobs.some((j) => j.no === enrichedJob.no);
      const jobs = exists
        ? prev.jobs.map((j) => (j.no === enrichedJob.no ? enrichedJob : j))
        : [enrichedJob, ...prev.jobs];
      return { ...prev, jobs };
    });
    pushToast(`已儲存地盤 ${enrichedJob.no}（${enrichedJob.shortName}）`, `地圖已插 Pin：${addr}`);
  };

  const addEquipment = (eq: EquipmentItem) => {
    const ts = nowTimestamp();
    setState((prev) => ({ ...prev, equipment: [{ ...eq, updatedAt: ts }, ...prev.equipment] }));
    pushToast(`已新增器材 ${eq.code}`, eq.name);
  };

  const checkoutEquipment: AppContextType['checkoutEquipment'] = ({
    code, borrowerStaffId, borrowerName, jobNo, siteLocation, checkoutAt: customCheckoutAt, expectedReturn, remark,
  }) => {
    const ts = nowTimestamp();
    const loanId = `LN-${Date.now().toString().slice(-6)}`;
    const checkoutAt = customCheckoutAt || ts;
    const newLoan: EquipmentLoanRecord = {
      id: loanId, equipmentCode: code, borrowerName, borrowerStaffId, jobNo, siteLocation, checkoutAt, expectedReturn, remark, updatedAt: ts,
    };
    setState((prev) => ({
      ...prev,
      loans: [newLoan, ...prev.loans],
      equipment: prev.equipment.map((eq) =>
        eq.code === code
          ? { ...eq, loc: siteLocation, updatedAt: ts, currentLoan: { loanId, borrowerName, borrowerStaffId, jobNo, siteLocation, checkoutAt, expectedReturn, remark } }
          : eq
      ),
    }));
    pushToast(`器材借出完成：${code}`, `${borrowerName} → ${siteLocation}`);
  };

  const returnEquipment: AppContextType['returnEquipment'] = ({
    code, returnStore, returnedBy, returnedAt: customReturnedAt, condition, remark,
  }) => {
    const ts = nowTimestamp();
    const returnedAt = customReturnedAt || ts;
    const actor = returnedBy || user?.name || 'Operator';
    setState((prev) => {
      const targetEq = prev.equipment.find((e) => e.code === code);
      const activeLoanId = targetEq?.currentLoan?.loanId;
      const finalStore = returnStore || targetEq?.store || 'Office';
      return {
        ...prev,
        loans: prev.loans.map((l) =>
          l.id === activeLoanId || (l.equipmentCode === code && !l.returnedAt)
            ? { ...l, returnedAt, returnedBy: actor, returnStore: finalStore, returnCondition: condition, returnRemark: remark || l.returnRemark, updatedAt: ts }
            : l
        ),
        equipment: prev.equipment.map((eq) =>
          eq.code === code
            ? { ...eq, loc: condition === 'damaged' ? '維修中 / 待檢查' : finalStore, currentLoan: null, updatedAt: ts }
            : eq
        ),
      };
    });
    pushToast(`器材已交還：${code}`, condition === 'good' ? `已歸還至 ${returnStore}` : '已標記需檢查／維修', condition === 'good' ? 'ok' : 'warn');
  };

  const syncEquipmentCertToDue = (code: string) => {
    const ts = nowTimestamp();
    setState((prev) => ({
      ...prev,
      equipment: prev.equipment.map((eq) => (eq.code === code && eq.certDue ? { ...eq, due: eq.certDue, updatedAt: ts } : eq)),
    }));
    pushToast(`已同步 ${code} 證書到期日`, '清單與最新證書已一致');
  };

  const toggleEquipmentTag = (code: string, rawTag: string) => {
    const tag = rawTag.trim().toUpperCase();
    if (!tag) return;
    const ts = nowTimestamp();
    setState((prev) => ({
      ...prev,
      equipment: prev.equipment.map((eq) => {
        if (eq.code !== code) return eq;
        const curr = eq.testTags || eq.tests.split('+').map((s) => s.trim()).filter(Boolean);
        const next = curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag];
        return { ...eq, testTags: next, tests: next.join(' + ') || '—', updatedAt: ts };
      }),
    }));
    pushToast(`已更新 ${code} 共用測試 Tag`, `標籤：${tag}`);
  };

  const trySyncBinaryToDrive = async (fileName: string, dataUrl?: string): Promise<string | undefined> => {
    if (!dataUrl || !dataUrl.startsWith('data:') || !getConfiguredDriveWebAppUrl()) return undefined;
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return undefined;
    const mimeMatch = dataUrl.slice(0, comma).match(/data:([^;]+)/);
    const res = await uploadFileToDrive({
      fileName,
      mimeType: mimeMatch ? mimeMatch[1] : 'application/octet-stream',
      base64Data: dataUrl.slice(comma + 1),
    }).catch(() => null);
    return res?.ok ? (res.driveId ? `gdrive:${res.driveId}` : res.viewUrl) : undefined;
  };

  const uploadEquipmentCalCert: AppContextType['uploadEquipmentCalCert'] = ({
    code, fileName, fileSize, dueDate, certNo, calLab, dataUrl,
  }) => {
    const ts = nowTimestamp();
    const actor = user ? user.name : 'Operator';
    const certId = `ecert-${Date.now()}`;
    const serverPath = `GoogleDrive/05_User_Uploads/${code}_${fileName}`;
    const certObj: CalCertAttachment = {
      id: certId, fileName, fileSize, dueDate, certNo, calLab: calLab || 'HOKLAS Cal Lab',
      eqCode: code, uploadedBy: actor, uploadedAt: ts, serverPath, dataUrl,
    };
    setState((prev) => ({
      ...prev,
      equipment: prev.equipment.map((eq) =>
        eq.code === code
          ? { ...eq, certFile: fileName, certUrl: dataUrl || eq.certUrl, certDue: dueDate || eq.certDue, due: dueDate || eq.due, last: dueDate ? REF_TODAY : eq.last, updatedAt: ts, calCerts: [certObj, ...(eq.calCerts || [])] }
          : eq
      ),
    }));
    pushToast(`已上傳 ${code} Cal Cert`, fileName);
    trySyncBinaryToDrive(`${code}_${fileName}`, dataUrl).then((gUrl) => {
      if (!gUrl) return;
      setState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((eq) =>
          eq.code === code
            ? { ...eq, certUrl: gUrl, calCerts: (eq.calCerts || []).map((c) => (c.id === certId ? { ...c, dataUrl: gUrl } : c)) }
            : eq
        ),
      }));
    });
  };

  const uploadStpCalCert: AppContextType['uploadStpCalCert'] = ({
    stpCode, fileName, fileSize, eqCode, dueDate, certNo, dataUrl,
  }) => {
    const ts = nowTimestamp();
    const actor = user ? user.name : 'Operator';
    const serverPath = `STP/${stpCode}/CalCert/${fileName}`;
    const certObj: CalCertAttachment = {
      id: `scert-${Date.now()}`, fileName, fileSize, eqCode, dueDate, certNo, uploadedBy: actor, uploadedAt: ts, serverPath, dataUrl,
    };
    setState((prev) => ({
      ...prev,
      tests: prev.tests.map((t) => (t.code === stpCode ? { ...t, updatedAt: ts, calCerts: [certObj, ...(t.calCerts || [])] } : t)),
      equipment: eqCode
        ? prev.equipment.map((eq) =>
            eq.code === eqCode ? { ...eq, certFile: fileName, certDue: dueDate || eq.certDue, due: dueDate || eq.due, updatedAt: ts, calCerts: [certObj, ...(eq.calCerts || [])] } : eq
          )
        : prev.equipment,
    }));
    pushToast(`已上傳 ${stpCode} 關聯 Cal Cert`, fileName);
  };

  const togglePinStp = (code: string) => {
    setState((prev) => {
      const curr = prev.pinnedStps || [];
      const pinnedStps = curr.includes(code) ? curr.filter((c) => c !== code) : [code, ...curr];
      return { ...prev, pinnedStps };
    });
  };

  const addStpItem = (item: TestMethodItem) => {
    const ts = nowTimestamp();
    setState((prev) => ({ ...prev, tests: [{ ...item, updatedAt: ts }, ...prev.tests] }));
    pushToast(`已新增受控 STP：${item.code}`, `${item.stpDocCode} ${item.stpRev}`);
  };

  const uploadStpDocFile: AppContextType['uploadStpDocFile'] = (stpCode, doc) => {
    const ts = nowTimestamp();
    const actor = user ? user.name : 'Operator';
    const docId = `stpdoc-${Date.now()}`;
    const fullDoc: SharedDocAttachment = {
      ...doc,
      id: docId,
      uploadedBy: actor,
      uploadedAt: ts,
      serverPath: `GoogleDrive/05_User_Uploads/${stpCode}_${doc.fileName}`,
    };
    setState((prev) => ({
      ...prev,
      tests: prev.tests.map((t) =>
        t.code === stpCode ? { ...t, updatedAt: ts, stpFiles: [fullDoc, ...(t.stpFiles || [])] } : t
      ),
    }));
    pushToast(`已上載 ${stpCode} STP 文件`, doc.fileName);
    trySyncBinaryToDrive(`${stpCode}_${doc.fileName}`, doc.dataUrl).then((gUrl) => {
      if (!gUrl) return;
      setState((prev) => ({
        ...prev,
        tests: prev.tests.map((t) =>
          t.code === stpCode ? { ...t, stpFiles: (t.stpFiles || []).map((d) => (d.id === docId ? { ...d, dataUrl: gUrl } : d)) } : t
        ),
      }));
    });
  };

  const saveEvent: AppContextType['saveEvent'] = (ev, existingId) => {
    const ts = nowTimestamp();
    setState((prev) => {
      if (existingId) {
        return { ...prev, events: prev.events.map((e) => (e.id === existingId ? { ...ev, id: existingId, updatedAt: ts } : e)) };
      }
      return {
        ...prev,
        events: [...prev.events, { ...ev, id: `ev-${Date.now()}`, updatedAt: ts }].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
    pushToast(existingId ? '已更新排程' : '已新增排程', `${ev.date} · ${ev.title || ev.site}`);
  };

  const deleteEvent = (id: string) => {
    setState((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
    pushToast('已刪除排程項目', undefined, 'info');
  };

  const uploadEventAttachment: AppContextType['uploadEventAttachment'] = (eventId, doc) => {
    const ts = nowTimestamp();
    const actor = user ? user.name : 'Staff';
    const fullDoc: SharedDocAttachment = {
      ...doc, id: `evdoc-${Date.now()}`, uploadedBy: actor, uploadedAt: ts, serverPath: `Training/${eventId}/${doc.fileName}`,
    };
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, updatedAt: ts, attachments: [fullDoc, ...(e.attachments || [])] } : e)),
    }));
    pushToast('已上載培訓講義／附件', doc.fileName);
  };

  const saveCalcRecord: AppContextType['saveCalcRecord'] = ({
    jobNo, jobRefNo, worksOrderNo, projectTitle, stpCode, title, locationNote, summary, pass,
    signatureDataUrl, signedBy, signedRole, signedAt, sitePhotos, structuredData,
  }) => {
    const ts = nowTimestamp();
    const actor = user?.name || 'Operator';
    const matchedJob = state.jobs.find((j) => j.no === jobNo);
    const resolvedProjTitle = projectTitle?.trim() || matchedJob?.project || matchedJob?.shortName || jobNo;
    const existingByRef = jobRefNo
      ? (state.calcRecords || []).find((r) => r.jobRefNo === jobRefNo.trim())
      : undefined;
    const recId = existingByRef?.id || `${stpCode}-${Date.now().toString().slice(-5)}`;
    const resolvedRefNo = jobRefNo?.trim() || `HKL-${jobNo}-${recId}`;
    const normalizedPhotos =
      sitePhotos && sitePhotos.length > 0
        ? sitePhotos.slice(0, MAX_SITE_PHOTOS_PER_RECORD).map((ph, idx) => {
            const target = buildSitePhotoDriveTarget({
              jobNo,
              stpCode,
              recordId: recId,
              index: idx,
              originalFileName: ph.fileName,
              folderId: ph.targetFolderId || TARGET_DRIVE_UPLOADS_FOLDER_ID,
            });
            return {
              ...ph,
              fileName: target.targetFileName,
              targetFolderId: target.targetFolderId,
              serverPath: target.serverPath,
              compressedSizeBytes: ph.compressedSizeBytes || estimateDataUrlBytes(ph.dataUrl),
              syncStatus: 'uploading' as const,
            };
          })
        : undefined;

    const draftRec: FieldCalcRecord = {
      id: recId,
      jobNo,
      jobRefNo: resolvedRefNo,
      worksOrderNo: worksOrderNo?.trim() || undefined,
      projectTitle: resolvedProjTitle,
      stpCode,
      title,
      locationNote: locationNote?.trim() || undefined,
      summary,
      pass,
      testedAt: ts,
      operatorName: actor,
      signatureDataUrl: signatureDataUrl || undefined,
      signedBy: signedBy?.trim() || undefined,
      signedRole: signedRole?.trim() || undefined,
      signedAt: signatureDataUrl ? (signedAt || ts) : undefined,
      sitePhotos: normalizedPhotos,
      structuredData: structuredData || undefined,
      driveFolderId: TARGET_DRIVE_UPLOADS_FOLDER_ID,
      driveSyncStatus: 'uploading',
      updatedAt: ts,
    };

    const bundle = buildFieldCalcRecordDriveBundle({
      record: draftRec,
      targetFolderId: TARGET_DRIVE_UPLOADS_FOLDER_ID,
    });

    const rec: FieldCalcRecord = {
      ...draftRec,
      driveManifestPath: bundle.manifestServerPath,
    };

    const vaultEntries: DriveVaultFile[] = bundle.allUploadPayloads.map((item, idx) => ({
      id: `drv-calc-${recId}-${idx}`,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      targetKind: 'vault',
      targetCode: jobNo,
      docType: item.docType,
      uploadedBy: actor,
      uploadedAt: ts,
      serverPath: item.serverPath,
      dataUrl: item.dataUrl,
      updatedAt: ts,
    }));

    setState((prev) => ({
      ...prev,
      calcRecords: [
        rec,
        ...(prev.calcRecords || []).filter((r) => r.id !== rec.id && r.jobRefNo !== resolvedRefNo),
      ],
      driveFiles: [...vaultEntries, ...(prev.driveFiles || [])],
    }));

    if (bundle.allUploadPayloads.length > 0 && getConfiguredDriveWebAppUrl()) {
      uploadBatchFilesToDrive(
        bundle.allUploadPayloads.map((p) => ({
          fileName: p.fileName,
          mimeType: p.mimeType,
          base64Data: p.base64Data,
          category: p.category,
          folderId: p.folderId,
          serverPath: p.serverPath,
          overwrite: true,
        }))
      )
        .then((results) => {
          setState((prev) => ({
            ...prev,
            calcRecords: (prev.calcRecords || []).map((c) => {
              if (c.id !== recId) return c;
              const updatedPhotos = c.sitePhotos?.map((ph, idx) => {
                const r = results[idx];
                return {
                  ...ph,
                  driveId: r?.driveId || ph.driveId,
                  driveViewUrl: r?.viewUrl || ph.driveViewUrl,
                  syncStatus: r?.ok ? ('synced' as const) : ('local_saved' as const),
                };
              });
              return {
                ...c,
                sitePhotos: updatedPhotos,
                driveSyncStatus: results.some((r) => r.ok) ? 'synced' : 'local_saved',
              };
            }),
            driveFiles: (prev.driveFiles || []).map((df) => {
              if (!df.id.startsWith(`drv-calc-${recId}-`)) return df;
              const matchedIdx = bundle.allUploadPayloads.findIndex((p) => p.fileName === df.fileName);
              const r = matchedIdx >= 0 ? results[matchedIdx] : undefined;
              return r?.driveId ? { ...df, driveId: r.driveId } : df;
            }),
          }));
        })
        .catch(() => {
          setState((prev) => ({
            ...prev,
            calcRecords: (prev.calcRecords || []).map((c) =>
              c.id === recId
                ? {
                    ...c,
                    driveSyncStatus: 'local_saved',
                    sitePhotos: c.sitePhotos?.map((ph) => ({ ...ph, syncStatus: 'local_saved' as const })),
                  }
                : c
            ),
          }));
        });
    }

    if (signatureDataUrl) {
      trySyncBinaryToDrive(`${jobNo}_${recId}_signature.png`, signatureDataUrl);
    }
    pushToast(
      `已儲存 ${stpCode} 計算紀錄至 ${jobNo}`,
      `${rec.id}${rec.locationNote ? ` · ${rec.locationNote}` : ''} (${pass ? 'PASS' : 'REVIEW'})${signatureDataUrl ? ' · ✍️已簽署' : ''}${normalizedPhotos?.length ? ` · 📷${normalizedPhotos.length}張壓縮相片已同步至 Google Drive (05_User_Uploads)` : ''}`,
      pass ? 'ok' : 'warn'
    );
    return rec;
  };

  const deleteCalcRecord = (id: string) => {
    setState((prev) => ({
      ...prev,
      calcRecords: (prev.calcRecords || []).filter((c) => c.id !== id),
    }));
    pushToast('已刪除現場計算紀錄', id, 'info');
  };

  const batchUploadToDrive: AppContextType['batchUploadToDrive'] = async (items, onProgress, onFileProgress, signal) => {
    if (!items || items.length === 0) {
      return { uploadedCount: 0, driveSyncedCount: 0, results: [] };
    }
    if (signal?.aborted) {
      return { uploadedCount: 0, driveSyncedCount: 0, cancelled: true, results: [] };
    }
    const ts = nowTimestamp();
    const actor = user ? user.name : 'Operator';

    const payloadFiles: { idx: number; fileName: string; mimeType: string; base64Data: string; overwrite?: boolean }[] = [];
    items.forEach((it, idx) => {
      onFileProgress?.(idx, { percent: 15, status: 'uploading' });
      const parsed = extractBase64Payload(it.dataUrl);
      if (parsed) {
        const prefix =
          it.targetKind !== 'vault' && it.targetCode && !it.fileName.toUpperCase().startsWith(it.targetCode.toUpperCase())
            ? `${it.targetCode}_`
            : '';
        payloadFiles.push({
          idx,
          fileName: `${prefix}${it.fileName}`,
          mimeType: it.mimeType || parsed.mimeType,
          base64Data: parsed.base64Data,
          overwrite: it.collisionAction === 'overwrite',
        });
      }
    });

    let remoteResults: Awaited<ReturnType<typeof uploadBatchFilesToDrive>> = [];
    if (payloadFiles.length > 0 && getConfiguredDriveWebAppUrl()) {
      try {
        remoteResults = await uploadBatchFilesToDrive(
          payloadFiles.map((p) => ({
            fileName: p.fileName,
            mimeType: p.mimeType,
            base64Data: p.base64Data,
            overwrite: p.overwrite,
          })),
          onProgress,
          (ev) => {
            if (signal?.aborted) return;
            const originalItemIdx = payloadFiles[ev.index]?.idx;
            if (originalItemIdx !== undefined) {
              onFileProgress?.(originalItemIdx, {
                percent: ev.percent,
                status: ev.status,
                driveSynced: ev.driveSynced,
              });
            }
          },
          signal
        );
      } catch (err) {
        if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return { uploadedCount: 0, driveSyncedCount: 0, cancelled: true, results: [] };
        }
        remoteResults = [];
      }
    }

    if (signal?.aborted) {
      return { uploadedCount: 0, driveSyncedCount: 0, cancelled: true, results: [] };
    }

    let driveSyncedCount = 0;
    const newDriveFiles: DriveVaultFile[] = [];
    const overwriteNamesLower = new Set<string>();
    const overwritePathsLower = new Set<string>();
    const newCertsByEq = new Map<string, CalCertAttachment[]>();
    const newDocsByStp = new Map<string, SharedDocAttachment[]>();

    items.forEach((it, idx) => {
      const pIdx = payloadFiles.findIndex((p) => p.idx === idx);
      const rRes = pIdx >= 0 ? remoteResults[pIdx] : undefined;
      const gUrl = rRes?.ok ? (rRes.driveId ? `gdrive:${rRes.driveId}` : rRes.viewUrl) : undefined;
      if (gUrl) driveSyncedCount += 1;
      onFileProgress?.(idx, { percent: 100, status: 'done', driveSynced: Boolean(gUrl) });

      const finalUrl = gUrl || it.dataUrl;
      const prefix =
        it.targetKind !== 'vault' && it.targetCode && !it.fileName.toUpperCase().startsWith(it.targetCode.toUpperCase())
          ? `${it.targetCode}_`
          : '';
      const serverPath = `GoogleDrive/05_User_Uploads/${prefix}${it.fileName}`;
      const id = `drv-${Date.now()}-${idx}`;

      if (it.collisionAction === 'overwrite') {
        overwriteNamesLower.add(it.fileName.trim().toLowerCase());
        overwriteNamesLower.add(`${prefix}${it.fileName}`.trim().toLowerCase());
        overwritePathsLower.add(serverPath.toLowerCase());
      }

      const vaultItem: DriveVaultFile = {
        id,
        fileName: it.fileName,
        fileSize: it.fileSize,
        mimeType: it.mimeType,
        targetKind: it.targetKind,
        targetCode: it.targetCode || '05_User_Uploads',
        docType: it.docType || (it.targetKind === 'equipment' ? 'Cal Cert PDF' : it.targetKind === 'stp' ? 'Controlled STP PDF' : 'Drive Vault File'),
        uploadedBy: actor,
        uploadedAt: ts,
        serverPath,
        dataUrl: finalUrl,
        driveId: rRes?.driveId,
        updatedAt: ts,
      };
      newDriveFiles.push(vaultItem);

      if (it.targetKind === 'equipment' && it.targetCode) {
        const certObj: CalCertAttachment = {
          id: `ecert-${Date.now()}-${idx}`,
          fileName: it.fileName,
          fileSize: it.fileSize,
          dueDate: it.dueDate,
          certNo: it.certNo,
          calLab: 'HOKLAS Cal Lab',
          eqCode: it.targetCode,
          uploadedBy: actor,
          uploadedAt: ts,
          serverPath,
          dataUrl: finalUrl,
        };
        newCertsByEq.set(it.targetCode, [...(newCertsByEq.get(it.targetCode) || []), certObj]);
      } else if (it.targetKind === 'stp' && it.targetCode) {
        const docObj: SharedDocAttachment = {
          id: `stpdoc-${Date.now()}-${idx}`,
          fileName: it.fileName,
          fileSize: it.fileSize,
          docType: it.docType || 'Controlled STP PDF',
          uploadedBy: actor,
          uploadedAt: ts,
          serverPath,
          dataUrl: finalUrl,
        };
        newDocsByStp.set(it.targetCode, [...(newDocsByStp.get(it.targetCode) || []), docObj]);
      }
    });

    // Save Undo Snapshot before committing the batch
    const currentSnap = stateRef.current;
    setLastBatchSnapshot({
      batchId: `batch-${Date.now()}`,
      uploadedFileIds: newDriveFiles.map((df) => df.id),
      uploadedFileNames: newDriveFiles.map((df) => df.fileName),
      previousDriveFiles: [...(currentSnap.driveFiles || [])],
      previousEquipment: [...(currentSnap.equipment || [])],
      previousTests: [...(currentSnap.tests || [])],
      createdAt: ts,
    });

    setState((prev) => ({
      ...prev,
      driveFiles: [
        ...newDriveFiles,
        ...(prev.driveFiles || []).filter(
          (df) =>
            !overwriteNamesLower.has(df.fileName.trim().toLowerCase()) &&
            !overwritePathsLower.has((df.serverPath || '').toLowerCase())
        ),
      ],
      equipment: prev.equipment.map((eq) => {
        const addedCerts = newCertsByEq.get(eq.code);
        if (!addedCerts || addedCerts.length === 0) return eq;
        const latest = addedCerts[0];
        const filteredOldCerts = (eq.calCerts || []).filter(
          (c) => !overwriteNamesLower.has(c.fileName.trim().toLowerCase())
        );
        return {
          ...eq,
          certFile: latest.fileName,
          certUrl: latest.dataUrl || eq.certUrl,
          certDue: latest.dueDate || eq.certDue,
          due: latest.dueDate || eq.due,
          last: latest.dueDate ? REF_TODAY : eq.last,
          updatedAt: ts,
          calCerts: [...addedCerts, ...filteredOldCerts],
        };
      }),
      tests: prev.tests.map((t) => {
        const addedDocs = newDocsByStp.get(t.code);
        if (!addedDocs || addedDocs.length === 0) return t;
        const filteredOldDocs = (t.stpFiles || []).filter(
          (d) => !overwriteNamesLower.has(d.fileName.trim().toLowerCase())
        );
        return {
          ...t,
          updatedAt: ts,
          stpFiles: [...addedDocs, ...filteredOldDocs],
        };
      }),
    }));

    pushToast(
      `已批次上傳 ${items.length} 份檔案至 Google Drive`,
      items.map((i) => i.fileName).slice(0, 3).join(', ') + (items.length > 3 ? ` 等 ${items.length} 份` : ''),
      'ok'
    );

    return {
      uploadedCount: items.length,
      driveSyncedCount,
      results: newDriveFiles,
    };
  };

  const undoLastBatchUpload = (): boolean => {
    if (!lastBatchSnapshot) return false;
    const snap = lastBatchSnapshot;
    setState((prev) => {
      const rolledBack = applyBatchUndoRollback({
        currentDriveFiles: prev.driveFiles || [],
        currentEquipment: prev.equipment || [],
        currentTests: prev.tests || [],
        snapshot: snap,
      });
      return {
        ...prev,
        driveFiles: rolledBack.driveFiles,
        equipment: rolledBack.equipment,
        tests: rolledBack.tests,
      };
    });
    setLastBatchSnapshot(null);
    pushToast(
      `↩️ 已復原上次批次上傳（已移除 ${snap.uploadedFileIds.length} 份檔案）`,
      snap.uploadedFileNames.slice(0, 3).join(', '),
      'info'
    );
    return true;
  };

  const resetAllDemoData = () => {
    const fresh = createFreshState();
    setState(fresh);
    setLastBatchSnapshot(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    pushToast('已重設示範資料', undefined, 'info');
  };

  const localizedJobs = useMemo(() => (state.jobs || []).map((j) => localizeJob(j, lang)), [state.jobs, lang]);
  const localizedLoans = useMemo(() => (state.loans || []).map((l) => localizeLoan(l, lang)), [state.loans, lang]);
  const localizedEquipment = useMemo(() => (state.equipment || []).map((e) => localizeEquipment(e, lang)), [state.equipment, lang]);
  const localizedTests = useMemo(() => (state.tests || []).map((t) => localizeTest(t, lang)), [state.tests, lang]);
  const localizedEvents = useMemo(() => (state.events || []).map((ev) => localizeEvent(ev, lang)), [state.events, lang]);
  const calcRecords = useMemo(() => state.calcRecords || [], [state.calcRecords]);
  const driveFiles = useMemo(() => state.driveFiles || [], [state.driveFiles]);
  const lastBatchSummary = useMemo(
    () =>
      lastBatchSnapshot
        ? { count: lastBatchSnapshot.uploadedFileIds.length, fileNames: lastBatchSnapshot.uploadedFileNames }
        : null,
    [lastBatchSnapshot]
  );

  return (
    <AppContext.Provider
      value={{
        user, accounts: MS_ACCOUNTS, loginWithPassword, loginWithMs, switchAccount, logout,
        jobs: localizedJobs, addOrUpdateJob,
        equipment: localizedEquipment, loans: localizedLoans, addEquipment, checkoutEquipment, returnEquipment,
        syncEquipmentCertToDue, toggleEquipmentTag, uploadEquipmentCalCert, uploadStpCalCert,
        tests: localizedTests, pinnedStps: state.pinnedStps || ['KD', 'SO', 'FC'], togglePinStp, addStpItem, uploadStpDocFile,
        events: localizedEvents, saveEvent, deleteEvent, uploadEventAttachment,
        calcRecords, saveCalcRecord, deleteCalcRecord,
        driveFiles, batchUploadToDrive,
        canUndoLastBatch: Boolean(lastBatchSnapshot),
        lastBatchSummary,
        undoLastBatchUpload,
        stpPreviewCode, setStpPreviewCode, previewDoc, openPreviewDoc, closePreviewDoc,
        driveSyncStatus, syncNowWithDrive, toasts, pushToast, resetAllDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
