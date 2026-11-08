import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { usePrefs } from '../prefs';
import { DRIVE_FOLDERS, DRIVE_FILE_MAP } from '../data/driveFileMap';
import { APPS_SCRIPT_CODE } from '../data/appsScriptTemplate';
import { getCustomDriveWebAppUrl, saveServerDriveWebAppUrl } from '../cloudDb';
import {
  inferFileTargetFromName,
  formatFileSize,
  BatchTargetKind,
  CollisionResolution,
  collectExistingDriveFiles,
  detectBatchCollisions,
  applyCollisionResolutions,
  buildDestinationFileName,
  PerFileUploadProgress,
  buildFileProgressEntry,
  createInitialFileProgressMap,
  markInFlightFilesCancelled,
  computeOverallBatchProgress,
  SessionBatchEvent,
  computeSessionBatchSummary,
  parseFileSizeToBytes,
  formatSessionDuration,
} from '../utils/batchUpload';
import { resolveDocLink } from '../driveDocs';
import {
  X,
  Cloud,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  Download,
  FolderUp,
  Settings2,
  AlertTriangle,
  RotateCcw,
  Ban,
  BarChart3,
  HardDrive,
  Clock,
} from 'lucide-react';

const SESSION_BATCHES_KEY = 'labtech_drive_session_batches_v1';
const SESSION_START_KEY = 'labtech_drive_session_start_v1';

interface StagedBatchFile {
  id: string;
  fileName: string;
  fileSize: string;
  sizeBytes?: number;
  mimeType: string;
  dataUrl: string;
  targetKind: BatchTargetKind;
  targetCode: string;
  docType: string;
  dueDate?: string;
}

export const DriveSyncModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const {
    driveSyncStatus,
    syncNowWithDrive,
    equipment,
    tests,
    driveFiles,
    batchUploadToDrive,
    canUndoLastBatch,
    lastBatchSummary,
    undoLastBatchUpload,
    openPreviewDoc,
    pushToast,
  } = useApp();
  const { lang, tx } = usePrefs();
  const [activeTab, setActiveTab] = useState<'batch' | 'config'>('batch');
  const [url, setUrl] = useState(() => getCustomDriveWebAppUrl());
  const [busy, setBusy] = useState(false);

  // Batch upload state
  const [staged, setStaged] = useState<StagedBatchFile[]>([]);
  const [batchMode, setBatchMode] = useState<'auto' | 'equipment' | 'stp' | 'vault'>('auto');
  const [batchTargetCode, setBatchTargetCode] = useState<string>('');
  const [batchDueDate, setBatchDueDate] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [batchFinished, setBatchFinished] = useState(false);
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, PerFileUploadProgress>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Collision detection & resolution state
  const [collisionResolutions, setCollisionResolutions] = useState<Record<string, CollisionResolution>>({});
  const [collisionPromptOpen, setCollisionPromptOpen] = useState(false);

  // Session Batch Summary state
  const [sessionBatches, setSessionBatches] = useState<SessionBatchEvent[]>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_BATCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [sessionStartMs, setSessionStartMs] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_START_KEY);
      if (raw) {
        const num = Number(raw);
        if (Number.isFinite(num) && num > 0) return num;
      }
      const now = Date.now();
      sessionStorage.setItem(SESSION_START_KEY, String(now));
      return now;
    } catch {
      return Date.now();
    }
  });
  const [sessionNowMs, setSessionNowMs] = useState<number>(() => Date.now());
  const [activeUploadElapsedMs, setActiveUploadElapsedMs] = useState<number>(0);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_BATCHES_KEY, JSON.stringify(sessionBatches));
    } catch {}
  }, [sessionBatches]);

  useEffect(() => {
    if (!open) return;
    setSessionNowMs(Date.now());
    const id = window.setInterval(() => {
      setSessionNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const equipmentCodes = useMemo(() => equipment.map((e) => e.code), [equipment]);
  const stpCodes = useMemo(() => tests.map((t) => t.code), [tests]);
  const stpMatchItems = useMemo(
    () => tests.map((t) => ({ code: t.code, stpDocCode: t.stpDocCode })),
    [tests]
  );

  const existingDriveMap = useMemo(
    () =>
      collectExistingDriveFiles({
        driveFiles,
        equipment,
        tests,
        driveFileMap: DRIVE_FILE_MAP,
      }),
    [driveFiles, equipment, tests]
  );

  const detectedCollisions = useMemo(
    () => (batchFinished ? [] : detectBatchCollisions(staged, existingDriveMap)),
    [staged, existingDriveMap, batchFinished]
  );

  const collisionByStagedId = useMemo(
    () => new Map(detectedCollisions.map((c) => [c.stagedId, c])),
    [detectedCollisions]
  );

  const overallProgress = useMemo(
    () =>
      computeOverallBatchProgress(
        fileProgressMap,
        staged.map((s) => s.id)
      ),
    [fileProgressMap, staged]
  );

  const batchSummaryMetrics = useMemo(
    () =>
      computeSessionBatchSummary({
        sessionBatches,
        stagedFiles: staged,
        activeElapsedMs: activeUploadElapsedMs,
      }),
    [sessionBatches, staged, activeUploadElapsedMs]
  );

  const sessionElapsedMs = Math.max(1000, sessionNowMs - sessionStartMs);
  const sessionElapsedFormatted = formatSessionDuration(sessionElapsedMs);

  if (!open) return null;

  const readFilesIntoStaged = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const baseStaged = batchFinished ? [] : staged;
    if (batchFinished) {
      setBatchFinished(false);
      setFileProgressMap({});
      setCollisionResolutions({});
    }

    const readOne = (file: File, idx: number): Promise<StagedBatchFile> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const inferred = inferFileTargetFromName(file.name, equipmentCodes, stpMatchItems);
          const effectiveKind: BatchTargetKind =
            batchMode === 'auto' ? inferred.kind : batchMode;
          const effectiveCode =
            batchMode === 'auto'
              ? inferred.code
              : batchMode === 'equipment'
              ? batchTargetCode || equipmentCodes[0] || 'LT-KD-01'
              : batchMode === 'stp'
              ? batchTargetCode || stpCodes[0] || 'KD'
              : '05_User_Uploads';

          resolve({
            id: `stg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            sizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
            dataUrl: typeof reader.result === 'string' ? reader.result : '',
            targetKind: effectiveKind,
            targetCode: effectiveCode,
            docType:
              effectiveKind === 'equipment'
                ? 'Cal Cert PDF'
                : effectiveKind === 'stp'
                ? 'Controlled STP PDF'
                : 'Drive Vault File',
            dueDate: batchDueDate || undefined,
          });
        };
        reader.readAsDataURL(file);
      });

    const loaded = (await Promise.all(files.map((f, i) => readOne(f, i)))).filter((x) => !!x.dataUrl);
    const nextStaged = [...baseStaged, ...loaded];
    setStaged(nextStaged);

    setFileProgressMap((prev) => {
      const next = batchFinished ? {} : { ...prev };
      for (const item of loaded) {
        next[item.id] = buildFileProgressEntry(item.id, item.fileName, 'queued', 0);
      }
      return next;
    });

    const newCollisions = detectBatchCollisions(nextStaged, existingDriveMap);
    if (newCollisions.length > 0) {
      setCollisionResolutions((prev) => {
        const next = { ...prev };
        for (const col of newCollisions) {
          if (!next[col.stagedId]) {
            next[col.stagedId] = 'keep_both';
          }
        }
        return next;
      });
      setCollisionPromptOpen(true);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await readFilesIntoStaged(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await readFilesIntoStaged(e.dataTransfer.files);
    }
  };

  const applyBatchModeToStaged = (mode: 'auto' | 'equipment' | 'stp' | 'vault', codeOverride?: string) => {
    setBatchMode(mode);
    const nextCode =
      codeOverride !== undefined
        ? codeOverride
        : mode === 'equipment'
        ? batchTargetCode || equipmentCodes[0] || ''
        : mode === 'stp'
        ? batchTargetCode || stpCodes[0] || ''
        : '05_User_Uploads';
    setBatchTargetCode(nextCode);

    setStaged((prev) =>
      prev.map((item) => {
        if (mode === 'auto') {
          const inf = inferFileTargetFromName(item.fileName, equipmentCodes, stpMatchItems);
          return { ...item, targetKind: inf.kind, targetCode: inf.code, docType: inf.docType };
        }
        return {
          ...item,
          targetKind: mode,
          targetCode: nextCode || (mode === 'vault' ? '05_User_Uploads' : item.targetCode),
          docType:
            mode === 'equipment'
              ? 'Cal Cert PDF'
              : mode === 'stp'
              ? 'Controlled STP PDF'
              : 'Drive Vault File',
        };
      })
    );
  };

  const updateStagedItem = (id: string, patch: Partial<StagedBatchFile>) => {
    setStaged((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeStagedItem = (id: string) => {
    setStaged((prev) => prev.filter((it) => it.id !== id));
    setCollisionResolutions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFileProgressMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateSingleCollisionResolution = (stagedId: string, resolution: CollisionResolution) => {
    setCollisionResolutions((prev) => ({
      ...prev,
      [stagedId]: resolution,
    }));
    const targetItem = staged.find((s) => s.id === stagedId);
    if (targetItem) {
      setFileProgressMap((prev) => ({
        ...prev,
        [stagedId]: buildFileProgressEntry(
          stagedId,
          targetItem.fileName,
          resolution === 'skip' ? 'skipped' : 'queued',
          resolution === 'skip' ? 100 : 0
        ),
      }));
    }
  };

  const setAllCollisionResolutions = (resolution: CollisionResolution) => {
    const next: Record<string, CollisionResolution> = { ...collisionResolutions };
    const nextProg: Record<string, PerFileUploadProgress> = { ...fileProgressMap };
    for (const col of detectedCollisions) {
      next[col.stagedId] = resolution;
      nextProg[col.stagedId] = buildFileProgressEntry(
        col.stagedId,
        col.originalFileName,
        resolution === 'skip' ? 'skipped' : 'queued',
        resolution === 'skip' ? 100 : 0
      );
    }
    setCollisionResolutions(next);
    setFileProgressMap(nextProg);
  };

  const handleCancelBatchAndClearQueue = () => {
    const wasUploading = uploadingBatch;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const removedCount = staged.length;
    setFileProgressMap((prev) => markInFlightFilesCancelled(prev, staged));
    setUploadingBatch(false);
    setBatchFinished(false);
    setCollisionPromptOpen(false);
    setStaged([]);
    setFileProgressMap({});
    setCollisionResolutions({});

    pushToast(
      wasUploading
        ? tx('🛑 已取消正在進行的批次上傳並清空佇列', '🛑 Ongoing batch upload cancelled & queue cleared')
        : tx(`🗑️ 已取消並移除佇列中的 ${removedCount} 份待傳檔案`, `🗑️ Cancelled and removed ${removedCount} queued file(s)`),
      undefined,
      'warn'
    );
  };

  const handleUndoBatchAndClearQueue = () => {
    if (uploadingBatch && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploadingBatch(false);
    }
    const didUndo = undoLastBatchUpload();
    if (didUndo) {
      setSessionBatches((prev) => prev.slice(0, -1));
    }
    setStaged([]);
    setFileProgressMap({});
    setCollisionResolutions({});
    setCollisionPromptOpen(false);
    setBatchFinished(false);
  };

  const handleResetSessionSummary = () => {
    setSessionBatches([]);
    const now = Date.now();
    setSessionStartMs(now);
    setSessionNowMs(now);
    setActiveUploadElapsedMs(0);
    try {
      sessionStorage.removeItem(SESSION_BATCHES_KEY);
      sessionStorage.setItem(SESSION_START_KEY, String(now));
    } catch {}
    pushToast(
      tx('已重設本次工作階段批次統計', 'Session Batch Summary Reset'),
      undefined,
      'info'
    );
  };

  const executeBatchUploadWithResolutions = async (customResolutions?: Record<string, CollisionResolution>) => {
    if (staged.length === 0 || uploadingBatch) return;
    const effectiveMap = customResolutions || collisionResolutions;
    const { resolvedItems, skippedCount, overwrittenCount, keptBothCount } = applyCollisionResolutions(
      staged,
      detectedCollisions,
      effectiveMap,
      'keep_both'
    );

    setCollisionPromptOpen(false);

    // Initialize granular per-file progress map for every item in the queue
    const resolvedIdSet = new Set(resolvedItems.map((r) => r.id));
    const skippedIds = new Set(staged.filter((s) => !resolvedIdSet.has(s.id)).map((s) => s.id));
    const initialProg = createInitialFileProgressMap(staged, skippedIds);
    setFileProgressMap(initialProg);

    if (resolvedItems.length === 0) {
      setBatchFinished(true);
      pushToast(
        tx(`已略過全部 ${skippedCount} 份重複檔案`, `Skipped all ${skippedCount} duplicate files`),
        undefined,
        'info'
      );
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setUploadingBatch(true);
    const batchStartedAt = performance.now();
    setActiveUploadElapsedMs(100);
    const elapsedTimer = window.setInterval(() => {
      setActiveUploadElapsedMs(Math.round(performance.now() - batchStartedAt));
    }, 100);

    const waitAbortable = (ms: number) =>
      new Promise<boolean>((resolve) => {
        if (controller.signal.aborted) {
          resolve(false);
          return;
        }
        const timer = window.setTimeout(() => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve(true);
        }, ms);
        const onAbort = () => {
          window.clearTimeout(timer);
          resolve(false);
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });

    try {
      // Stepwise visual progress per file with abort checks so user can cancel mid-upload
      for (let i = 0; i < resolvedItems.length; i++) {
        if (controller.signal.aborted) return;
        const item = resolvedItems[i];
        setFileProgressMap((prev) => ({
          ...prev,
          [item.id]: buildFileProgressEntry(item.id, item.fileName, 'uploading', 35),
        }));
        const cont = await waitAbortable(120);
        if (!cont || controller.signal.aborted) return;
      }

      const uploadRes = await batchUploadToDrive(
        resolvedItems.map((s) => ({
          fileName: s.fileName,
          fileSize: s.fileName ? s.fileSize : '1 KB',
          mimeType: s.mimeType,
          dataUrl: s.dataUrl,
          targetKind: s.targetKind,
          targetCode: s.targetCode,
          docType: s.docType,
          dueDate: s.dueDate || batchDueDate || undefined,
          collisionAction: s.collisionAction,
        })),
        undefined,
        (itemIndex, ev) => {
          if (controller.signal.aborted) return;
          const item = resolvedItems[itemIndex];
          if (!item) return;
          const nextStatus =
            ev.status === 'error'
              ? 'error'
              : ev.status === 'done'
              ? ev.driveSynced
                ? 'synced'
                : 'saved_local'
              : 'uploading';
          setFileProgressMap((prev) => ({
            ...prev,
            [item.id]: buildFileProgressEntry(item.id, item.fileName, nextStatus, ev.percent),
          }));
        },
        controller.signal
      );

      if (controller.signal.aborted || uploadRes.cancelled) {
        return;
      }

      const elapsedMs = Math.max(150, Math.round(performance.now() - batchStartedAt));
      const batchBytes = resolvedItems.reduce(
        (sum, item) =>
          sum + (item.sizeBytes !== undefined ? item.sizeBytes : parseFileSizeToBytes(item.fileSize)),
        0
      );
      const eqCount = resolvedItems.filter((r) => r.targetKind === 'equipment').length;
      const stpCount = resolvedItems.filter((r) => r.targetKind === 'stp').length;
      const vaultCount = resolvedItems.filter((r) => r.targetKind === 'vault').length;

      setSessionBatches((prev) => [
        ...prev,
        {
          batchId: `sbatch-${Date.now()}`,
          filesSynced: resolvedItems.length,
          totalBytes: batchBytes,
          durationMs: elapsedMs,
          equipmentCount: eqCount,
          stpCount,
          vaultCount,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Update staged filenames if Keep Both renamed any file, and ensure all non-skipped items show 100%
      const renamedById = new Map(resolvedItems.map((r) => [r.id, r.fileName]));
      setStaged((prev) =>
        prev.map((it) => (renamedById.has(it.id) ? { ...it, fileName: renamedById.get(it.id)! } : it))
      );

      setFileProgressMap((prev) => {
        const next = { ...prev };
        for (const r of resolvedItems) {
          const existing = next[r.id];
          const finalStatus =
            existing?.status === 'synced' ? 'synced' : 'saved_local';
          next[r.id] = buildFileProgressEntry(r.id, r.fileName, finalStatus, 100);
        }
        return next;
      });
      setBatchFinished(true);

      if (overwrittenCount > 0 || keptBothCount > 0 || skippedCount > 0) {
        const notes: string[] = [];
        if (overwrittenCount > 0) notes.push(tx(`覆蓋 ${overwrittenCount} 份`, `Overwrote ${overwrittenCount}`));
        if (keptBothCount > 0) notes.push(tx(`保留兩者 ${keptBothCount} 份`, `Kept both ${keptBothCount}`));
        if (skippedCount > 0) notes.push(tx(`略過 ${skippedCount} 份`, `Skipped ${skippedCount}`));
        pushToast(
          tx('已完成重複檔案處理並上傳', 'Collision Resolution Applied'),
          notes.join(' · '),
          'info'
        );
      }
    } finally {
      window.clearInterval(elapsedTimer);
      setActiveUploadElapsedMs(0);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setUploadingBatch(false);
    }
  };

  const handlePrimaryUploadButtonClick = () => {
    if (staged.length === 0 || uploadingBatch) return;
    if (batchFinished) {
      setStaged([]);
      setFileProgressMap({});
      setCollisionResolutions({});
      setBatchFinished(false);
      return;
    }
    if (detectedCollisions.length > 0 && !collisionPromptOpen) {
      setCollisionPromptOpen(true);
      return;
    }
    executeBatchUploadWithResolutions();
  };

  const handleCopyScript = () => {
    navigator.clipboard?.writeText(APPS_SCRIPT_CODE);
    pushToast(
      tx('已複製 Apps Script 程式碼', 'Copied Apps Script Code'),
      tx('請貼上至 Google Sheet → 擴充功能 → Apps Script 並按部署', 'Paste in Extensions -> Apps Script -> Deploy Web App')
    );
  };

  const handleSaveAndSync = async () => {
    setBusy(true);
    const savedCfg = await saveServerDriveWebAppUrl(url);
    if (savedCfg.driveConnected) {
      pushToast(
        tx('已永久綁定 Google Drive 資料庫', 'Google Drive Permanently Linked'),
        tx('所有手機與電腦紀錄現已直接寫入你的 Google Drive 及試算表', 'All mobile & PC records now write directly to your Google Drive & Sheet')
      );
    }
    const ok = await syncNowWithDrive();
    setBusy(false);
    if (ok) onClose();
  };

  const driveFolderUrl = `https://drive.google.com/drive/folders/${DRIVE_FOLDERS.root}?authuser=bentktk2024@gmail.com`;
  const uploadsFolderUrl = `https://drive.google.com/drive/folders/${DRIVE_FOLDERS.uploads}?authuser=bentktk2024@gmail.com`;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${DRIVE_FOLDERS.spreadsheetId}/edit?authuser=bentktk2024@gmail.com`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 text-xs">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
              <Cloud className="h-3.5 w-3.5" /> GOOGLE DRIVE 30TB DATABASE &amp; BATCH UPLOAD VAULT
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold text-slate-900">
              {tx('Google Drive 批次檔案上傳及雲端資料庫中心', 'Google Drive Batch File Upload & Cloud Vault')}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Google Drive Modal"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <a
            href={uploadsFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand-wash/60 px-3.5 py-2.5 font-extrabold text-brand-deep hover:bg-brand-wash"
          >
            <span className="truncate">{tx('📂 05_User_Uploads (目標資料夾)', '📂 05_User_Uploads Folder')}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-bold text-slate-800 hover:border-brand hover:text-brand"
          >
            <span className="truncate">{tx('📁 LabTech_Platform_Database (總目錄)', '📁 LabTech_Platform_Database')}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 font-bold text-emerald-900 hover:bg-emerald-100/70"
          >
            <span className="truncate">📊 LabTech_LIMS_Database (Sheet)</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 font-extrabold transition cursor-pointer ${
              activeTab === 'batch' ? 'bg-brand text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FolderUp className="h-4 w-4" />
            {tx('📤 批次上傳多個檔案至 Google Drive', '📤 Batch Upload Multiple Files')}
            {staged.length > 0 && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 font-mono text-[10px]">{staged.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 font-extrabold transition cursor-pointer ${
              activeTab === 'config' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            {tx('⚙️ Drive 連線及 Apps Script 設定', '⚙️ Drive Connection & Apps Script')}
          </button>
        </div>

        {activeTab === 'batch' ? (
          <div className="space-y-4">
            {/* Batch Summary Dashboard */}
            <div
              role="region"
              aria-label="Batch Summary Dashboard"
              data-testid="batch-summary-dashboard"
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-3.5 text-white shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-brand/25 text-blue-300">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-xs font-extrabold tracking-wide text-white">
                      {tx('📊 本次工作階段批次同步總覽 (Batch Summary Dashboard)', '📊 Session Batch Summary Dashboard')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {tx(
                        '即時統計本次連線已同步之檔案數量、傳輸總容量及工作階段持續時間',
                        'Live metrics for files synced, total payload size, and current session duration'
                      )}
                    </div>
                  </div>
                </div>
                {batchSummaryMetrics.batchesCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetSessionSummary}
                    className="rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                  >
                    {tx('重設統計 Reset', 'Reset Stats')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Card 1: Total Files Synced */}
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/75 px-3 py-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{tx('已同步檔案總數 (Files Synced)', 'Total Files Synced')}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      data-testid="summary-files-synced"
                      className="font-mono text-xl font-extrabold text-white tabular-nums"
                    >
                      {batchSummaryMetrics.totalFilesSynced}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      {tx(`份檔案 (${batchSummaryMetrics.batchesCount} 批次)`, `files (${batchSummaryMetrics.batchesCount} batches)`)}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 truncate">
                    {staged.length > 0 && !batchFinished
                      ? tx(`佇列待傳：${staged.length} 份檔案`, `Staged in queue: ${staged.length} file(s)`)
                      : tx(`Google Drive 庫存累計：${driveFiles.length} 份`, `Drive Vault Total: ${driveFiles.length} file(s)`)}
                  </div>
                </div>

                {/* Card 2: Total Size Synced */}
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/75 px-3 py-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{tx('累計傳輸總容量 (Total Size)', 'Total Size Synced')}</span>
                    <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      data-testid="summary-total-size"
                      className="font-mono text-xl font-extrabold text-white tabular-nums"
                    >
                      {batchSummaryMetrics.totalSizeFormatted}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 truncate">
                    {staged.length > 0 && !batchFinished
                      ? tx(`待傳佇列容量：${batchSummaryMetrics.stagedSizeFormatted}`, `Staged payload: ${batchSummaryMetrics.stagedSizeFormatted}`)
                      : tx('目標儲存庫：05_User_Uploads (30TB)', 'Destination: 05_User_Uploads (30TB)')}
                  </div>
                </div>

                {/* Card 3: Duration of Current Session */}
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/75 px-3 py-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{tx('本次連線及傳輸耗時 (Duration)', 'Session & Sync Duration')}</span>
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      data-testid="summary-session-duration"
                      className="font-mono text-xl font-extrabold text-white tabular-nums"
                    >
                      {batchSummaryMetrics.totalDurationMs > 0
                        ? batchSummaryMetrics.durationFormatted
                        : sessionElapsedFormatted}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-300 tabular-nums">
                      {tx(`連線 ${sessionElapsedFormatted}`, `Session ${sessionElapsedFormatted}`)}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 truncate">
                    {lang === 'en' ? batchSummaryMetrics.avgThroughputLabelEn : batchSummaryMetrics.avgThroughputLabelZh}
                  </div>
                </div>
              </div>

              {/* Category Visual Distribution Bar */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
                  <span className="font-bold">
                    {batchSummaryMetrics.totalFilesSynced > 0
                      ? tx('已同步檔案類別分佈 (Synced Category Breakdown)', 'Synced Category Breakdown')
                      : tx('佇列檔案類別預覽 (Queue Category Breakdown)', 'Queue Category Breakdown')}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      🔧 Eq Cert: {batchSummaryMetrics.equipmentCount} ({batchSummaryMetrics.equipmentPct}%)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      📄 STP: {batchSummaryMetrics.stpCount} ({batchSummaryMetrics.stpPct}%)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      📂 Vault: {batchSummaryMetrics.vaultCount} ({batchSummaryMetrics.vaultPct}%)
                    </span>
                  </div>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                  <div
                    className="h-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${batchSummaryMetrics.equipmentPct}%` }}
                  />
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${batchSummaryMetrics.stpPct}%` }}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${batchSummaryMetrics.vaultPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-extrabold text-slate-800">
                  {tx('1. 設定批次歸檔規則（自動依檔名識別器材／STP，或統一指定）：', '1. Batch Routing Rule (Auto-detect from filename or assign to all):')}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {([
                    ['auto', tx('✨ 自動識別檔名', '✨ Auto-Detect')],
                    ['equipment', tx('🔧 綁定指定器材 Cal Cert', '🔧 Equipment Cert')],
                    ['stp', tx('📄 綁定指定 STP 文件', '📄 STP Document')],
                    ['vault', tx('📂 純存檔 (05_User_Uploads)', '📂 Drive Vault Only')],
                  ] as const).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyBatchModeToStaged(m)}
                      className={`rounded-xl px-2.5 py-1.5 font-bold transition cursor-pointer ${
                        batchMode === m
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {batchMode === 'equipment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="font-bold text-slate-600">{tx('選擇目標器材 Code', 'Target Equipment Code')}</label>
                    <select
                      value={batchTargetCode || equipmentCodes[0] || ''}
                      onChange={(e) => applyBatchModeToStaged('equipment', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800"
                    >
                      {equipment.map((eq) => (
                        <option key={eq.code} value={eq.code}>
                          {eq.code} — {eq.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600">{tx('統一設定 Cal Due 到期日（選填）', 'Batch Cal Due Date (Opt.)')}</label>
                    <input
                      type="date"
                      value={batchDueDate}
                      onChange={(e) => {
                        setBatchDueDate(e.target.value);
                        setStaged((prev) => prev.map((it) => ({ ...it, dueDate: e.target.value || undefined })));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono"
                    />
                  </div>
                </div>
              )}

              {batchMode === 'stp' && (
                <div>
                  <label className="font-bold text-slate-600">{tx('選擇目標受控 STP 項目', 'Target Controlled STP')}</label>
                  <select
                    value={batchTargetCode || stpCodes[0] || ''}
                    onChange={(e) => applyBatchModeToStaged('stp', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800"
                  >
                    {tests.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} — {t.stpDocCode} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed transition ${
                staged.length > 0
                  ? 'flex flex-wrap items-center justify-between gap-2 px-4 py-2.5'
                  : 'p-4 text-center'
              } ${
                isDragging ? 'border-brand bg-brand-wash/70' : 'border-slate-300 bg-slate-50/60 hover:border-brand/60'
              }`}
            >
              {staged.length > 0 ? (
                <div className="flex items-center gap-2 text-left">
                  <UploadCloud className="h-5 w-5 text-brand shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {tx('繼續加入更多本機檔案至佇列', 'Add more local files to batch queue')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx('可拖放或點擊右側按鈕追加 PDF、Excel、CSV 或相片', 'Drag & drop or click to append more files')}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-7 w-7 text-brand" />
                  <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                    {tx('拖放多個本機檔案至此，或點擊下方按鈕一次過選取多份檔案', 'Drag & drop multiple local files here, or click below to select files in batch')}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {tx(
                      '支援同時選取多份 PDF、Word、Excel、CSV 或現場相片（JPG/PNG），一鍵批次直傳至 Google Drive「05_User_Uploads」資料夾',
                      'Supports multiple PDF, Word, Excel, CSV, or site photos (JPG/PNG) uploaded in a single batch to Google Drive 05_User_Uploads'
                    )}
                  </p>
                </>
              )}
              <label
                className={`${
                  staged.length > 0 ? '' : 'mt-2.5'
                } inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-deep cursor-pointer shrink-0`}
              >
                <FolderUp className="h-4 w-4" />
                <span>{tx('選擇多個本機檔案 (Select Multiple Files)', 'Select Multiple Local Files')}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>

            {detectedCollisions.length > 0 && collisionPromptOpen && (
              <div
                role="region"
                aria-label="File Collision Detection Prompt"
                data-testid="collision-detection-prompt"
                className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 space-y-3 shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-extrabold text-amber-950">
                        {tx(
                          `⚠️ 偵測到 ${detectedCollisions.length} 份同名檔案已存在於 Google Drive！`,
                          `⚠️ Collision Detected: ${detectedCollisions.length} file(s) already exist in Google Drive!`
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-amber-900">
                        {tx(
                          '請選擇對重複檔案的處理方式：「覆蓋 (Overwrite)」、「保留兩者 (Keep Both)」或「略過 (Skip)」。',
                          'Choose how to handle existing files in the destination folder: Overwrite, Keep Both, or Skip.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllCollisionResolutions('overwrite')}
                      className="rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    >
                      {tx('🔄 全部覆蓋 (Overwrite All)', '🔄 Overwrite All')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCollisionResolutions('keep_both')}
                      className="rounded-xl border border-brand/40 bg-brand-wash px-2.5 py-1.5 text-[11px] font-extrabold text-brand-deep hover:bg-brand-wash/80 cursor-pointer"
                    >
                      {tx('📑 全部保留兩者 (Keep Both All)', '📑 Keep Both All')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCollisionResolutions('skip')}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {tx('⏭️ 全部略過 (Skip All)', '⏭️ Skip All')}
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-amber-200/70 rounded-xl border border-amber-300 bg-white">
                  {detectedCollisions.map((col) => {
                    const currentChoice: CollisionResolution = collisionResolutions[col.stagedId] || 'keep_both';
                    return (
                      <div key={col.stagedId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
                            <span className="truncate">{col.originalFileName}</span>
                            <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900 shrink-0">
                              {tx('已存在於', 'Exists in')}: {col.existingEntry.sourceLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-600 truncate">
                            {currentChoice === 'overwrite' &&
                              tx(
                                `→ 將覆蓋現有檔案：GoogleDrive/05_User_Uploads/${col.destinationFileName}`,
                                `→ Will overwrite: GoogleDrive/05_User_Uploads/${col.destinationFileName}`
                              )}
                            {currentChoice === 'keep_both' &&
                              tx(
                                `→ 將同時保留並改名為：GoogleDrive/05_User_Uploads/${col.keepBothDestinationFileName}`,
                                `→ Will keep both as: GoogleDrive/05_User_Uploads/${col.keepBothDestinationFileName}`
                              )}
                            {currentChoice === 'skip' &&
                              tx('→ 將略過此檔案（不上傳）', '→ Will skip this file')}
                          </div>
                        </div>

                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 shrink-0">
                          {([
                            ['overwrite', tx('Overwrite 覆蓋', 'Overwrite')],
                            ['keep_both', tx('Keep Both 保留兩者', 'Keep Both')],
                            ['skip', tx('Skip 略過', 'Skip')],
                          ] as [CollisionResolution, string][]).map(([opt, lbl]) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => updateSingleCollisionResolution(col.stagedId, opt)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                                currentChoice === opt
                                  ? opt === 'overwrite'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : opt === 'keep_both'
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'bg-slate-800 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCollisionPromptOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {tx('稍後決定 / 返回佇列', 'Review Queue')}
                  </button>
                  <button
                    type="button"
                    disabled={uploadingBatch}
                    onClick={() => executeBatchUploadWithResolutions()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {tx('確認選擇並立即上傳 (Confirm & Upload)', 'Confirm Resolution & Upload')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {staged.length > 0 && (
              <div
                data-testid="staged-batch-queue"
                className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-900">
                      {batchFinished
                        ? tx(`✅ 批次上傳佇列明細 (${overallProgress.completedCount}/${staged.length} 已完成)`, `✅ Batch Queue Status (${overallProgress.completedCount}/${staged.length} Completed)`)
                        : tx(`待上傳批次佇列 (${staged.length} 份檔案)`, `Staged Batch Queue (${staged.length} files)`)}
                    </span>
                    {detectedCollisions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCollisionPromptOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 hover:bg-amber-200 cursor-pointer"
                      >
                        <AlertTriangle className="h-3 w-3 text-amber-700" />
                        {tx(`${detectedCollisions.length} 份同名衝突 (點擊設定)`, `${detectedCollisions.length} Collision(s)`)}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canUndoLastBatch && (
                      <button
                        type="button"
                        onClick={handleUndoBatchAndClearQueue}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {tx('↩️ 復原上傳 (Undo)', '↩️ Undo Upload')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelBatchAndClearQueue}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      <Ban className="h-3 w-3" />
                      {uploadingBatch
                        ? tx('🛑 停止並清空 (Cancel Upload)', '🛑 Cancel Upload')
                        : tx('取消並清空 Clear All', 'Cancel & Clear All')}
                    </button>
                  </div>
                </div>

                {/* Overall Aggregate Progress Bar */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
                    <span>
                      {uploadingBatch
                        ? tx('🚀 總體批次上傳進度 (Overall Batch Progress)...', '🚀 Overall Batch Upload Progress...')
                        : batchFinished
                        ? tx('✅ 總體批次處理完成 (All Files Processed)', '✅ Batch Processing Complete')
                        : tx('📊 佇列總體準備狀態 (Overall Queue Progress)', '📊 Overall Queue Status')}
                    </span>
                    <span className="font-mono text-brand-deep">
                      {overallProgress.completedCount} / {overallProgress.totalCount} ({overallProgress.overallPercent}%)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Overall batch upload progress"
                    aria-valuenow={overallProgress.overallPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        batchFinished ? 'bg-emerald-600' : 'bg-brand'
                      }`}
                      style={{ width: `${overallProgress.overallPercent}%` }}
                    />
                  </div>
                </div>

                {/* Per-File Queue List with Individual Granular Progress Bars */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {staged.map((item) => {
                    const col = collisionByStagedId.get(item.id);
                    const choice: CollisionResolution = collisionResolutions[item.id] || 'keep_both';
                    const destFileName = col
                      ? choice === 'keep_both'
                        ? col.keepBothDestinationFileName
                        : col.destinationFileName
                      : buildDestinationFileName(item.fileName, item.targetKind, item.targetCode);

                    const fileProg =
                      fileProgressMap[item.id] ||
                      buildFileProgressEntry(
                        item.id,
                        item.fileName,
                        col && choice === 'skip' ? 'skipped' : 'queued',
                        col && choice === 'skip' ? 100 : 0
                      );

                    const barColor =
                      fileProg.status === 'synced' || fileProg.status === 'saved_local'
                        ? 'bg-emerald-600'
                        : fileProg.status === 'uploading'
                        ? 'bg-brand animate-pulse'
                        : fileProg.status === 'skipped'
                        ? 'bg-amber-400'
                        : fileProg.status === 'cancelled' || fileProg.status === 'error'
                        ? 'bg-rose-600'
                        : 'bg-slate-300';

                    const badgeColor =
                      fileProg.status === 'synced' || fileProg.status === 'saved_local'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : fileProg.status === 'uploading'
                        ? 'bg-brand-wash border-brand/30 text-brand-deep'
                        : fileProg.status === 'skipped'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : fileProg.status === 'cancelled' || fileProg.status === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600';

                    return (
                      <div key={item.id} className="px-3 py-2.5 bg-white hover:bg-slate-50/80 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 truncate">
                              <FileText className="h-3.5 w-3.5 text-brand shrink-0" />
                              <span className={`truncate ${fileProg.status === 'skipped' || fileProg.status === 'cancelled' ? 'line-through text-slate-400' : ''}`}>
                                {item.fileName}
                              </span>
                              <span className="font-mono text-[10px] font-semibold text-slate-400 shrink-0">({item.fileSize})</span>
                              {col && !batchFinished && (
                                <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-900 shrink-0">
                                  ⚠️ {choice === 'overwrite' ? 'Overwrite' : choice === 'keep_both' ? 'Keep Both' : 'Skip'}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500 font-mono truncate">
                              {fileProg.status === 'skipped'
                                ? tx('→ 已設定略過此重複檔案', '→ Marked to skip duplicate file')
                                : `→ GoogleDrive/05_User_Uploads/${destFileName}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {col && !batchFinished && (
                              <select
                                aria-label="Collision resolution"
                                value={choice}
                                disabled={uploadingBatch}
                                onChange={(e) => updateSingleCollisionResolution(item.id, e.target.value as CollisionResolution)}
                                className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-900"
                              >
                                <option value="overwrite">🔄 Overwrite (覆蓋)</option>
                                <option value="keep_both">📑 Keep Both (保留兩者)</option>
                                <option value="skip">⏭️ Skip (略過)</option>
                              </select>
                            )}

                            <select
                              aria-label="Target category"
                              value={item.targetKind}
                              disabled={uploadingBatch || batchFinished}
                              onChange={(e) => {
                                const kind = e.target.value as BatchTargetKind;
                                const defaultCode =
                                  kind === 'equipment'
                                    ? equipmentCodes[0] || 'LT-KD-01'
                                    : kind === 'stp'
                                    ? stpCodes[0] || 'KD'
                                    : '05_User_Uploads';
                                updateStagedItem(item.id, {
                                  targetKind: kind,
                                  targetCode: defaultCode,
                                  docType: kind === 'equipment' ? 'Cal Cert PDF' : kind === 'stp' ? 'Controlled STP PDF' : 'Drive Vault File',
                                });
                              }}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700"
                            >
                              <option value="vault">📂 Vault</option>
                              <option value="equipment">🔧 Eq Cert</option>
                              <option value="stp">📄 STP</option>
                            </select>

                            {item.targetKind === 'equipment' && (
                              <select
                                aria-label="Target equipment code"
                                value={item.targetCode}
                                disabled={uploadingBatch || batchFinished}
                                onChange={(e) => updateStagedItem(item.id, { targetCode: e.target.value })}
                                className="rounded-lg border border-brand/30 bg-brand-wash px-2 py-1 font-mono text-[11px] font-extrabold text-brand-deep"
                              >
                                {equipmentCodes.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            )}

                            {item.targetKind === 'stp' && (
                              <select
                                aria-label="Target STP code"
                                value={item.targetCode}
                                disabled={uploadingBatch || batchFinished}
                                onChange={(e) => updateStagedItem(item.id, { targetCode: e.target.value })}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-[11px] font-extrabold text-emerald-800"
                              >
                                {stpCodes.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => removeStagedItem(item.id)}
                              disabled={uploadingBatch}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title={tx('移除', 'Remove')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Individual Per-File Granular Progress Bar & Status Pill */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 font-extrabold ${badgeColor}`}
                            >
                              {lang === 'en' ? fileProg.statusLabelEn : fileProg.statusLabelZh}
                            </span>
                            <span className="font-mono font-extrabold text-slate-600 tabular-nums">
                              {fileProg.percent}%
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`Upload progress for ${item.fileName}`}
                            aria-valuenow={fileProg.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                          >
                            <div
                              className={`h-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${fileProg.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="cancel-batch-upload-btn"
                      onClick={handleCancelBatchAndClearQueue}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition cursor-pointer ${
                        uploadingBatch
                          ? 'border-rose-600 bg-rose-600 text-white shadow-xs hover:bg-rose-700'
                          : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>
                        {uploadingBatch
                          ? tx('🛑 停止上傳並清空 (Cancel Upload)', '🛑 Cancel Upload & Clear')
                          : tx('🗑️ 取消並清空佇列 (Cancel)', '🗑️ Cancel & Clear Queue')}
                      </span>
                    </button>

                    {canUndoLastBatch && (
                      <button
                        type="button"
                        data-testid="undo-batch-upload-btn"
                        onClick={handleUndoBatchAndClearQueue}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>
                          {tx(
                            `↩️ 復原上傳 (${lastBatchSummary?.count || 0} 份) 並清空`,
                            `↩️ Undo Batch (${lastBatchSummary?.count || 0}) & Clear`
                          )}
                        </span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={uploadingBatch}
                    onClick={handlePrimaryUploadButtonClick}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm disabled:opacity-50 cursor-pointer ${
                      batchFinished
                        ? 'bg-slate-800 hover:bg-slate-900'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <UploadCloud className={`h-4 w-4 ${uploadingBatch ? 'animate-bounce' : ''}`} />
                    <span>
                      {uploadingBatch
                        ? tx(`正在批次上傳 (${overallProgress.completedCount}/${staged.length})...`, `Uploading Batch (${overallProgress.completedCount}/${staged.length})...`)
                        : batchFinished
                        ? tx('✨ 完成並繼續上傳', '✨ Done — Clear Queue')
                        : tx(`🚀 一鍵批次上傳 ${staged.length} 份檔案至 Google Drive`, `🚀 Batch Upload ${staged.length} Files to Google Drive`)}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {driveFiles.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-800">
                    {tx(`☁️ 近期批次上傳至 Google Drive 紀錄 (${driveFiles.length})`, `☁️ Recent Batch Uploaded Files (${driveFiles.length})`)}
                  </span>
                  <div className="flex items-center gap-2">
                    {canUndoLastBatch && (
                      <button
                        type="button"
                        onClick={handleUndoBatchAndClearQueue}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {tx(
                          `↩️ 復原上次批次上傳 (${lastBatchSummary?.count || 0} 份)`,
                          `↩️ Undo Last Batch (${lastBatchSummary?.count || 0})`
                        )}
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">05_User_Uploads</span>
                  </div>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {driveFiles.slice(0, 15).map((df) => (
                    <div key={df.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                          <FileText className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="truncate">{df.fileName}</span>
                          <span className="rounded bg-brand-wash px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-brand-deep shrink-0">
                            {df.targetCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {df.fileSize} · {df.uploadedAt} · {df.uploadedBy}
                        </div>
                      </div>
                      {df.dataUrl && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              openPreviewDoc({
                                title: df.fileName,
                                url: df.dataUrl!,
                                fileName: df.fileName,
                                subtitle: `${df.docType} · ${df.serverPath}`,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-wash px-2.5 py-1 font-bold text-brand-deep hover:bg-brand hover:text-white cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> {tx('預覽', 'Preview')}
                          </button>
                          <a
                            href={resolveDocLink(df.dataUrl, df.fileName).downloadUrl || df.dataUrl}
                            download={df.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                          >
                            <Download className="h-3 w-3" /> {tx('下載', 'Download')}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-slate-900">
                  {tx('一次性啟用雙向即時讀寫及批次檔案直傳 (Apps Script Web App)：', 'One-time Live Write & Batch File Upload Setup (Apps Script):')}
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 font-extrabold text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" /> {tx('1. 複製 Apps Script 程式碼', '1. Copy Apps Script')}
                </button>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600 leading-relaxed">
                <li>{tx('開啟上方「LabTech_LIMS_Database (Google Sheet)」，點選頂部選單「擴充功能 (Extensions) → Apps Script」。', 'Open LabTech_LIMS_Database Google Sheet → Extensions → Apps Script.')}</li>
                <li>{tx('貼上剛複製的程式碼並儲存，點選右上角「部署 (Deploy) → 新增部署 (New deployment) → 網頁應用程式 (Web app)」。', 'Paste code, click Deploy → New deployment → Web app.')}</li>
                <li>{tx('「執行身分」選「我 (Me)」，「誰可以存取」選「所有人 (Anyone)」，按部署後複製 Web App 網址貼入下方。', 'Set Execute as: Me, Access: Anyone, deploy, and paste the /exec URL below.')}</li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800">
                {tx('Apps Script Web App 網址 (https://script.google.com/macros/s/.../exec)：', 'Apps Script Web App URL:')}
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
                <CheckCircle2 className={`h-4 w-4 ${driveSyncStatus === 'synced' ? 'text-emerald-600' : 'text-slate-400'}`} />
                {url.trim().startsWith('https://script.google.com/')
                  ? tx('已永久綁定：手機與電腦所有紀錄即時寫入 Google Drive 試算表', 'Linked: All mobile & PC updates write directly to Google Drive & Sheet')
                  : tx('跨裝置同步運作中；貼上一次上方網址即可將所有紀錄自動寫入你的 Google Drive', 'Cross-device sync active; paste Web App URL once to write all records to Google Drive')}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveAndSync}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-brand px-4 py-2.5 font-extrabold text-white hover:bg-brand-deep disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                {tx('儲存並立即同步 Google Drive', 'Save & Sync Now')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
