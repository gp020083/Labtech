import { DriveVaultFile, EquipmentItem, TestMethodItem } from '../types';

export type BatchTargetKind = 'equipment' | 'stp' | 'vault';
export type CollisionResolution = 'overwrite' | 'keep_both' | 'skip';

export interface InferredBatchTarget {
  kind: BatchTargetKind;
  code: string;
  docType: string;
  targetFileName: string;
}

export interface ExistingDriveFileEntry {
  fileName: string;
  destFileName: string;
  sourceLabel: string;
  uploadedAt?: string;
  driveId?: string;
}

export interface StagedCollisionCandidate {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  dataUrl: string;
  targetKind: BatchTargetKind;
  targetCode: string;
  docType: string;
  dueDate?: string;
}

export interface DetectedFileCollision {
  stagedId: string;
  originalFileName: string;
  destinationFileName: string;
  keepBothFileName: string;
  keepBothDestinationFileName: string;
  existingEntry: ExistingDriveFileEntry;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '1 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function extractBase64Payload(dataUrl?: string): { mimeType: string; base64Data: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const mimeMatch = dataUrl.slice(0, comma).match(/data:([^;]+)/);
  const base64Data = dataUrl.slice(comma + 1);
  if (!base64Data) return null;
  return {
    mimeType: mimeMatch ? mimeMatch[1] : 'application/octet-stream',
    base64Data,
  };
}

export function buildDestinationFileName(
  fileName: string,
  targetKind: BatchTargetKind,
  targetCode: string
): string {
  const clean = (fileName || 'document.pdf').trim();
  if (
    targetKind !== 'vault' &&
    targetCode &&
    !clean.toUpperCase().startsWith(targetCode.toUpperCase())
  ) {
    return `${targetCode}_${clean}`;
  }
  return clean;
}

export function splitFileNameAndExt(fileName: string): { base: string; ext: string } {
  const clean = (fileName || 'document.pdf').trim();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: clean, ext: '' };
  }
  return {
    base: clean.slice(0, lastDot),
    ext: clean.slice(lastDot),
  };
}

export function generateKeepBothFileName(
  fileName: string,
  targetKind: BatchTargetKind,
  targetCode: string,
  existingNamesLower: Set<string>
): string {
  const { base, ext } = splitFileNameAndExt(fileName);
  // Strip any trailing " (N)" from base if already numbered
  const cleanBase = base.replace(/\s*\(\d+\)$/, '');
  let counter = 1;
  while (counter < 1000) {
    const candidateName = `${cleanBase} (${counter})${ext}`;
    const candidateDest = buildDestinationFileName(candidateName, targetKind, targetCode);
    if (
      !existingNamesLower.has(candidateName.toLowerCase()) &&
      !existingNamesLower.has(candidateDest.toLowerCase())
    ) {
      return candidateName;
    }
    counter += 1;
  }
  return `${cleanBase} (${Date.now()})${ext}`;
}

export function collectExistingDriveFiles(params: {
  driveFiles?: DriveVaultFile[];
  equipment?: EquipmentItem[];
  tests?: TestMethodItem[];
  driveFileMap?: Record<string, string>;
}): Map<string, ExistingDriveFileEntry> {
  const map = new Map<string, ExistingDriveFileEntry>();

  const register = (keyName: string, entry: ExistingDriveFileEntry) => {
    const k = keyName.trim().toLowerCase();
    if (!k) return;
    if (!map.has(k)) {
      map.set(k, entry);
    }
  };

  // 1. User-uploaded DriveVaultFiles (highest priority / most recent)
  for (const df of params.driveFiles || []) {
    if (!df?.fileName) continue;
    const destName = buildDestinationFileName(df.fileName, df.targetKind, df.targetCode);
    const entry: ExistingDriveFileEntry = {
      fileName: df.fileName,
      destFileName: destName,
      sourceLabel: `05_User_Uploads (${df.targetCode || 'Vault'})`,
      uploadedAt: df.uploadedAt,
      driveId: df.driveId,
    };
    register(df.fileName, entry);
    register(destName, entry);
  }

  // 2. Equipment Cal Certs
  for (const eq of params.equipment || []) {
    if (eq.certFile) {
      const destName = buildDestinationFileName(eq.certFile, 'equipment', eq.code);
      const entry: ExistingDriveFileEntry = {
        fileName: eq.certFile,
        destFileName: destName,
        sourceLabel: `Equipment ${eq.code} Cal Cert`,
        uploadedAt: eq.last,
      };
      register(eq.certFile, entry);
      register(destName, entry);
    }
    for (const c of eq.calCerts || []) {
      if (!c?.fileName) continue;
      const destName = buildDestinationFileName(c.fileName, 'equipment', eq.code);
      const entry: ExistingDriveFileEntry = {
        fileName: c.fileName,
        destFileName: destName,
        sourceLabel: `Equipment ${eq.code} Cal Cert`,
        uploadedAt: c.uploadedAt,
      };
      register(c.fileName, entry);
      register(destName, entry);
    }
  }

  // 3. Controlled STP Documents
  for (const t of params.tests || []) {
    for (const doc of t.stpFiles || []) {
      if (!doc?.fileName) continue;
      const destName = buildDestinationFileName(doc.fileName, 'stp', t.code);
      const entry: ExistingDriveFileEntry = {
        fileName: doc.fileName,
        destFileName: destName,
        sourceLabel: `STP ${t.code} (${t.stpDocCode})`,
        uploadedAt: doc.uploadedAt,
      };
      register(doc.fileName, entry);
      register(destName, entry);
      // Also register normalized underscore variant
      register(doc.fileName.replace(/\s+/g, '_'), entry);
    }
  }

  // 4. Pre-mapped Google Drive 05_User_Uploads catalog (DRIVE_FILE_MAP)
  for (const [pathKey, driveId] of Object.entries(params.driveFileMap || {})) {
    const baseName = pathKey.split('/').pop() || '';
    if (!baseName) continue;
    const entry: ExistingDriveFileEntry = {
      fileName: baseName,
      destFileName: baseName,
      sourceLabel: '05_User_Uploads (Google Drive)',
      driveId,
    };
    register(baseName, entry);
  }

  return map;
}

export function detectBatchCollisions<T extends StagedCollisionCandidate>(
  staged: T[],
  existingMap: Map<string, ExistingDriveFileEntry>
): DetectedFileCollision[] {
  const collisions: DetectedFileCollision[] = [];
  const reservedNamesLower = new Set<string>(existingMap.keys());
  const seenInBatch = new Map<string, ExistingDriveFileEntry>();

  for (const item of staged) {
    const rawKey = item.fileName.trim().toLowerCase();
    const destName = buildDestinationFileName(item.fileName, item.targetKind, item.targetCode);
    const destKey = destName.toLowerCase();

    const matchedExisting =
      existingMap.get(destKey) ||
      existingMap.get(rawKey) ||
      seenInBatch.get(destKey) ||
      seenInBatch.get(rawKey);

    if (matchedExisting) {
      const keepBothName = generateKeepBothFileName(
        item.fileName,
        item.targetKind,
        item.targetCode,
        reservedNamesLower
      );
      const keepBothDest = buildDestinationFileName(
        keepBothName,
        item.targetKind,
        item.targetCode
      );
      reservedNamesLower.add(keepBothName.toLowerCase());
      reservedNamesLower.add(keepBothDest.toLowerCase());

      collisions.push({
        stagedId: item.id,
        originalFileName: item.fileName,
        destinationFileName: destName,
        keepBothFileName: keepBothName,
        keepBothDestinationFileName: keepBothDest,
        existingEntry: matchedExisting,
      });
    } else {
      const batchEntry: ExistingDriveFileEntry = {
        fileName: item.fileName,
        destFileName: destName,
        sourceLabel: 'Current Batch Queue',
      };
      seenInBatch.set(rawKey, batchEntry);
      seenInBatch.set(destKey, batchEntry);
      reservedNamesLower.add(rawKey);
      reservedNamesLower.add(destKey);
    }
  }

  return collisions;
}

export function applyCollisionResolutions<T extends StagedCollisionCandidate>(
  staged: T[],
  collisions: DetectedFileCollision[],
  resolutions: Record<string, CollisionResolution>,
  defaultResolution: CollisionResolution = 'keep_both'
): {
  resolvedItems: Array<T & { collisionAction?: 'overwrite' | 'keep_both' }>;
  skippedCount: number;
  overwrittenCount: number;
  keptBothCount: number;
} {
  const collisionByStagedId = new Map<string, DetectedFileCollision>(
    collisions.map((c) => [c.stagedId, c])
  );

  const resolvedItems: Array<T & { collisionAction?: 'overwrite' | 'keep_both' }> = [];
  let skippedCount = 0;
  let overwrittenCount = 0;
  let keptBothCount = 0;

  for (const item of staged) {
    const col = collisionByStagedId.get(item.id);
    if (!col) {
      resolvedItems.push({ ...item });
      continue;
    }

    const action = resolutions[item.id] || defaultResolution;
    if (action === 'skip') {
      skippedCount += 1;
      continue;
    }

    if (action === 'keep_both') {
      keptBothCount += 1;
      resolvedItems.push({
        ...item,
        fileName: col.keepBothFileName,
        collisionAction: 'keep_both',
      });
      continue;
    }

    // 'overwrite'
    overwrittenCount += 1;
    resolvedItems.push({
      ...item,
      collisionAction: 'overwrite',
    });
  }

  return {
    resolvedItems,
    skippedCount,
    overwrittenCount,
    keptBothCount,
  };
}

export function inferFileTargetFromName(
  fileName: string,
  equipmentCodes: string[],
  stpCodes: Array<string | { code: string; stpDocCode?: string }>
): InferredBatchTarget {
  const cleanName = (fileName || 'document.pdf').trim();
  const upperName = cleanName.toUpperCase();

  // Sort equipment codes longest first so e.g. 'LT-KM-04' or 'SO-12' matches before shorter prefixes
  const sortedEq = [...equipmentCodes]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const eqCode of sortedEq) {
    const upperCode = eqCode.toUpperCase();
    const escaped = upperCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`);
    if (regex.test(upperName)) {
      const targetFileName = upperName.startsWith(upperCode)
        ? cleanName
        : `${eqCode}_${cleanName}`;
      return {
        kind: 'equipment',
        code: eqCode,
        docType: 'Cal Cert PDF',
        targetFileName,
      };
    }
  }

  // Normalize STP entries into { code, token } pairs (matching stpDocCode first since it's longer & more specific)
  const stpMatchers: Array<{ code: string; token: string }> = [];
  for (const item of stpCodes) {
    if (!item) continue;
    if (typeof item === 'string') {
      stpMatchers.push({ code: item, token: item });
    } else {
      if (item.stpDocCode) {
        stpMatchers.push({ code: item.code, token: item.stpDocCode });
      }
      if (item.code) {
        stpMatchers.push({ code: item.code, token: item.code });
      }
    }
  }
  stpMatchers.sort((a, b) => b.token.length - a.token.length);

  for (const { code: stpCode, token } of stpMatchers) {
    const upperToken = token.toUpperCase();
    const escaped = upperToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`);
    if (regex.test(upperName)) {
      const upperStpCode = stpCode.toUpperCase();
      const targetFileName =
        upperName.startsWith(upperStpCode) || upperName.startsWith(upperToken)
          ? cleanName
          : `${stpCode}_${cleanName}`;
      return {
        kind: 'stp',
        code: stpCode,
        docType: 'Controlled STP PDF',
        targetFileName,
      };
    }
  }

  return {
    kind: 'vault',
    code: '05_User_Uploads',
    docType: 'Drive Vault File',
    targetFileName: cleanName,
  };
}

export type FileUploadStageStatus =
  | 'queued'
  | 'uploading'
  | 'synced'
  | 'saved_local'
  | 'skipped'
  | 'cancelled'
  | 'error';

export interface PerFileUploadProgress {
  stagedId: string;
  fileName: string;
  percent: number;
  status: FileUploadStageStatus;
  statusLabelZh: string;
  statusLabelEn: string;
}

export function buildFileProgressEntry(
  stagedId: string,
  fileName: string,
  status: FileUploadStageStatus,
  percent?: number
): PerFileUploadProgress {
  const clamped = Math.max(
    0,
    Math.min(
      100,
      percent !== undefined
        ? Math.round(percent)
        : status === 'queued' || status === 'cancelled'
        ? 0
        : status === 'uploading'
        ? 45
        : 100
    )
  );

  const labels: Record<FileUploadStageStatus, { zh: string; en: string }> = {
    queued: { zh: '⏳ 排隊待傳', en: '⏳ Queued' },
    uploading: { zh: `📤 上傳中 ${clamped}%`, en: `📤 Uploading ${clamped}%` },
    synced: { zh: '✅ 已同步至 Drive (100%)', en: '✅ Synced to Drive (100%)' },
    saved_local: { zh: '✅ 已完成並快取 (100%)', en: '✅ Saved & Cached (100%)' },
    skipped: { zh: '⏭️ 已略過 (Skipped)', en: '⏭️ Skipped' },
    cancelled: { zh: '🛑 已取消 (Cancelled)', en: '🛑 Cancelled' },
    error: { zh: '❌ 上傳失敗', en: '❌ Upload Error' },
  };

  return {
    stagedId,
    fileName,
    percent: clamped,
    status,
    statusLabelZh: labels[status].zh,
    statusLabelEn: labels[status].en,
  };
}

export function createInitialFileProgressMap<T extends { id: string; fileName: string }>(
  staged: T[],
  skippedIds: Set<string> = new Set()
): Record<string, PerFileUploadProgress> {
  const map: Record<string, PerFileUploadProgress> = {};
  for (const item of staged) {
    const isSkipped = skippedIds.has(item.id);
    map[item.id] = buildFileProgressEntry(
      item.id,
      item.fileName,
      isSkipped ? 'skipped' : 'queued',
      isSkipped ? 100 : 0
    );
  }
  return map;
}

export function markInFlightFilesCancelled(
  progressMap: Record<string, PerFileUploadProgress>,
  staged: Array<{ id: string; fileName: string }>
): Record<string, PerFileUploadProgress> {
  const next: Record<string, PerFileUploadProgress> = { ...progressMap };
  for (const item of staged) {
    const existing = next[item.id];
    if (!existing || existing.status === 'queued' || existing.status === 'uploading') {
      next[item.id] = buildFileProgressEntry(item.id, item.fileName, 'cancelled', 0);
    }
  }
  return next;
}

export interface BatchUndoSnapshot {
  batchId: string;
  uploadedFileIds: string[];
  uploadedFileNames: string[];
  previousDriveFiles: DriveVaultFile[];
  previousEquipment: EquipmentItem[];
  previousTests: TestMethodItem[];
  createdAt: string;
}

export function applyBatchUndoRollback(params: {
  currentDriveFiles: DriveVaultFile[];
  currentEquipment: EquipmentItem[];
  currentTests: TestMethodItem[];
  snapshot: BatchUndoSnapshot;
}): {
  driveFiles: DriveVaultFile[];
  equipment: EquipmentItem[];
  tests: TestMethodItem[];
  revertedCount: number;
} {
  const { currentDriveFiles, snapshot } = params;
  const uploadedIdSet = new Set(snapshot.uploadedFileIds);
  const currentWithoutBatch = currentDriveFiles.filter((df) => !uploadedIdSet.has(df.id));

  // Restore any previousDriveFiles that were overwritten by this batch
  const remainingIds = new Set(currentWithoutBatch.map((df) => df.id));
  const restoredOverwritten = (snapshot.previousDriveFiles || []).filter(
    (oldDf) => !remainingIds.has(oldDf.id) && !uploadedIdSet.has(oldDf.id)
  );

  return {
    driveFiles: [...currentWithoutBatch, ...restoredOverwritten],
    equipment: snapshot.previousEquipment,
    tests: snapshot.previousTests,
    revertedCount: snapshot.uploadedFileIds.length,
  };
}

export function computeOverallBatchProgress(
  progressMap: Record<string, PerFileUploadProgress>,
  stagedIds: string[]
): {
  overallPercent: number;
  completedCount: number;
  uploadingCount: number;
  queuedCount: number;
  skippedCount: number;
  cancelledCount: number;
  errorCount: number;
  totalCount: number;
} {
  const ids = stagedIds.length > 0 ? stagedIds : Object.keys(progressMap);
  const totalCount = ids.length;
  if (totalCount === 0) {
    return {
      overallPercent: 0,
      completedCount: 0,
      uploadingCount: 0,
      queuedCount: 0,
      skippedCount: 0,
      cancelledCount: 0,
      errorCount: 0,
      totalCount: 0,
    };
  }

  let sumPercent = 0;
  let completedCount = 0;
  let uploadingCount = 0;
  let queuedCount = 0;
  let skippedCount = 0;
  let cancelledCount = 0;
  let errorCount = 0;

  for (const id of ids) {
    const entry = progressMap[id];
    if (!entry) {
      queuedCount += 1;
      continue;
    }
    sumPercent += entry.percent;
    if (entry.status === 'synced' || entry.status === 'saved_local') {
      completedCount += 1;
    } else if (entry.status === 'uploading') {
      uploadingCount += 1;
    } else if (entry.status === 'skipped') {
      skippedCount += 1;
      completedCount += 1;
    } else if (entry.status === 'cancelled') {
      cancelledCount += 1;
    } else if (entry.status === 'error') {
      errorCount += 1;
    } else {
      queuedCount += 1;
    }
  }

  return {
    overallPercent: Math.round(sumPercent / totalCount),
    completedCount,
    uploadingCount,
    queuedCount,
    skippedCount,
    cancelledCount,
    errorCount,
    totalCount,
  };
}

export function parseFileSizeToBytes(sizeLabel?: string | number): number {
  if (typeof sizeLabel === 'number' && Number.isFinite(sizeLabel)) {
    return Math.max(0, Math.round(sizeLabel));
  }
  if (!sizeLabel || typeof sizeLabel !== 'string') return 0;
  const clean = sizeLabel.trim().toUpperCase();
  const match = clean.match(/^([\d.]+)\s*(GB|MB|KB|B)?$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const unit = match[2] || 'B';
  if (unit === 'GB') return Math.round(val * 1024 * 1024 * 1024);
  if (unit === 'MB') return Math.round(val * 1024 * 1024);
  if (unit === 'KB') return Math.round(val * 1024);
  return Math.round(val);
}

export function formatSessionBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatSessionDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.0s';
  const totalSec = ms / 1000;
  if (totalSec < 60) {
    return `${Math.max(0.1, totalSec).toFixed(1)}s`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  return `${mins}m ${secs}s`;
}

export interface SessionBatchEvent {
  batchId: string;
  filesSynced: number;
  totalBytes: number;
  durationMs: number;
  equipmentCount: number;
  stpCount: number;
  vaultCount: number;
  timestamp: string;
}

export interface SessionBatchSummaryMetrics {
  totalFilesSynced: number;
  totalBytesSynced: number;
  totalSizeFormatted: string;
  totalDurationMs: number;
  durationFormatted: string;
  batchesCount: number;
  equipmentCount: number;
  stpCount: number;
  vaultCount: number;
  equipmentPct: number;
  stpPct: number;
  vaultPct: number;
  stagedCount: number;
  stagedBytes: number;
  stagedSizeFormatted: string;
  avgThroughputLabelZh: string;
  avgThroughputLabelEn: string;
}

export function computeSessionBatchSummary(params: {
  sessionBatches: SessionBatchEvent[];
  stagedFiles?: Array<{ fileSize: string; sizeBytes?: number; targetKind: BatchTargetKind }>;
  activeElapsedMs?: number;
}): SessionBatchSummaryMetrics {
  const { sessionBatches = [], stagedFiles = [], activeElapsedMs = 0 } = params;

  let totalFilesSynced = 0;
  let totalBytesSynced = 0;
  let sumDurationMs = 0;
  let equipmentCount = 0;
  let stpCount = 0;
  let vaultCount = 0;

  for (const b of sessionBatches) {
    totalFilesSynced += Math.max(0, b.filesSynced || 0);
    totalBytesSynced += Math.max(0, b.totalBytes || 0);
    sumDurationMs += Math.max(0, b.durationMs || 0);
    equipmentCount += Math.max(0, b.equipmentCount || 0);
    stpCount += Math.max(0, b.stpCount || 0);
    vaultCount += Math.max(0, b.vaultCount || 0);
  }

  const totalDurationMs = sumDurationMs + Math.max(0, activeElapsedMs);

  let stagedBytes = 0;
  let stagedEq = 0;
  let stagedStp = 0;
  let stagedVault = 0;
  for (const s of stagedFiles) {
    const b = s.sizeBytes !== undefined ? s.sizeBytes : parseFileSizeToBytes(s.fileSize);
    stagedBytes += b;
    if (s.targetKind === 'equipment') stagedEq += 1;
    else if (s.targetKind === 'stp') stagedStp += 1;
    else stagedVault += 1;
  }

  // Use synced breakdown if > 0, otherwise preview staged breakdown
  const catEq = totalFilesSynced > 0 ? equipmentCount : stagedEq;
  const catStp = totalFilesSynced > 0 ? stpCount : stagedStp;
  const catVault = totalFilesSynced > 0 ? vaultCount : stagedVault;
  const catTotal = catEq + catStp + catVault;

  const equipmentPct = catTotal > 0 ? Math.round((catEq / catTotal) * 100) : 0;
  const stpPct = catTotal > 0 ? Math.round((catStp / catTotal) * 100) : 0;
  const vaultPct = catTotal > 0 ? Math.max(0, 100 - equipmentPct - stpPct) : 0;

  let avgThroughputLabelZh = '尚無上傳紀錄';
  let avgThroughputLabelEn = 'No batch synced yet';
  if (totalFilesSynced > 0 && totalDurationMs > 0) {
    const sec = Math.max(0.1, totalDurationMs / 1000);
    const filesPerSec = (totalFilesSynced / sec).toFixed(1);
    avgThroughputLabelZh = `平均速率 ${filesPerSec} 份/秒 (${sessionBatches.length} 批次)`;
    avgThroughputLabelEn = `Avg ${filesPerSec} files/s (${sessionBatches.length} batch${sessionBatches.length === 1 ? '' : 'es'})`;
  }

  return {
    totalFilesSynced,
    totalBytesSynced,
    totalSizeFormatted: formatSessionBytes(totalBytesSynced),
    totalDurationMs,
    durationFormatted: formatSessionDuration(totalDurationMs),
    batchesCount: sessionBatches.length,
    equipmentCount: catEq,
    stpCount: catStp,
    vaultCount: catVault,
    equipmentPct,
    stpPct,
    vaultPct,
    stagedCount: stagedFiles.length,
    stagedBytes,
    stagedSizeFormatted: formatSessionBytes(stagedBytes),
    avgThroughputLabelZh,
    avgThroughputLabelEn,
  };
}



