import { FieldCalcPhoto, FieldCalcRecord } from '../types';

export const MAX_SITE_PHOTOS_PER_RECORD = 2;
export const TARGET_DRIVE_UPLOADS_FOLDER_ID = '1rFJigHJ3hDf6xC4K1A07zeRRUbkVGCvI';
export const TARGET_DRIVE_UPLOADS_FOLDER_NAME = '05_User_Uploads';
export const DEFAULT_MAX_PHOTO_DIM = 960;
export const DEFAULT_MAX_COMPRESSED_BYTES = 140_000;

export function computeScaledDimensions(
  origWidth: number,
  origHeight: number,
  maxDim = DEFAULT_MAX_PHOTO_DIM
): { width: number; height: number; scale: number } {
  const safeW = Math.max(1, Math.round(origWidth || 1));
  const safeH = Math.max(1, Math.round(origHeight || 1));
  const safeMax = Math.max(64, maxDim);
  const largest = Math.max(safeW, safeH);
  const scale = largest > safeMax ? safeMax / largest : 1;
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
    scale: Number(scale.toFixed(4)),
  };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const cleanLen = base64.trim().length;
  if (cleanLen === 0) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleanLen * 3) / 4) - padding);
}

export function formatFileSizeLabel(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function computeCompressionSavedPct(originalBytes?: number, compressedBytes?: number): number {
  if (!originalBytes || !compressedBytes || originalBytes <= 0 || compressedBytes >= originalBytes) {
    return 0;
  }
  return Math.min(99, Math.max(1, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100)));
}

export function sanitizePhotoFileName(rawName: string, fallbackExt = 'jpg'): string {
  const trimmed = (rawName || '').trim() || `site_photo.${fallbackExt}`;
  const withoutExt = trimmed.replace(/\.[^/.]+$/, '');
  const cleanBase = withoutExt.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'site_photo';
  return `${cleanBase}.${fallbackExt}`;
}

export function buildSitePhotoDriveTarget(params: {
  jobNo: string;
  stpCode: string;
  recordId?: string;
  index: number;
  originalFileName: string;
  folderId?: string;
}): {
  targetFileName: string;
  serverPath: string;
  targetFolderId: string;
  targetFolderPath: string;
} {
  const cleanJob = (params.jobNo || 'LT0000').trim().toUpperCase();
  const cleanStp = (params.stpCode || 'FIELD').trim().toUpperCase();
  const cleanRec = (params.recordId || `${cleanStp}-DRAFT`).trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const slot = Math.max(1, (params.index ?? 0) + 1);
  const safeFile = sanitizePhotoFileName(params.originalFileName, 'jpg');
  const prefix = `${cleanJob}_${cleanRec}_P${slot}_`;
  const targetFileName = safeFile.toUpperCase().startsWith(cleanJob) ? safeFile : `${prefix}${safeFile}`;
  const targetFolderId = (params.folderId || TARGET_DRIVE_UPLOADS_FOLDER_ID).trim();
  const targetFolderPath = `GoogleDrive/${TARGET_DRIVE_UPLOADS_FOLDER_NAME}/${cleanJob}_${cleanStp}_Records`;
  const serverPath = `${targetFolderPath}/${targetFileName}`;
  return {
    targetFileName,
    serverPath,
    targetFolderId,
    targetFolderPath,
  };
}

export interface FieldCalcDriveUploadPayloadItem {
  photoId?: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
  serverPath: string;
  folderId: string;
  category: string;
  docType: string;
  targetCode: string;
}

export function buildFieldCalcRecordDriveBundle(params: {
  record: FieldCalcRecord;
  targetFolderId?: string;
}): {
  folderId: string;
  folderPath: string;
  manifestFileName: string;
  manifestServerPath: string;
  photoPayloads: FieldCalcDriveUploadPayloadItem[];
  recordManifestPayload: FieldCalcDriveUploadPayloadItem;
  allUploadPayloads: FieldCalcDriveUploadPayloadItem[];
} {
  const { record } = params;
  const folderId = (params.targetFolderId || record.driveFolderId || TARGET_DRIVE_UPLOADS_FOLDER_ID).trim();
  const cleanJob = (record.jobNo || 'LT0000').trim().toUpperCase();
  const cleanStp = (record.stpCode || 'FIELD').trim().toUpperCase();
  const folderPath = `GoogleDrive/${TARGET_DRIVE_UPLOADS_FOLDER_NAME}/${cleanJob}_${cleanStp}_Records`;

  const photos = (record.sitePhotos || []).slice(0, MAX_SITE_PHOTOS_PER_RECORD);
  const photoPayloads: FieldCalcDriveUploadPayloadItem[] = [];

  photos.forEach((ph, idx) => {
    if (!ph.dataUrl || !ph.dataUrl.startsWith('data:')) return;
    const comma = ph.dataUrl.indexOf(',');
    if (comma < 0) return;
    const mimeMatch = ph.dataUrl.slice(0, comma).match(/data:([^;]+)/);
    const mimeType = ph.mimeType || (mimeMatch ? mimeMatch[1] : 'image/jpeg');
    const base64Data = ph.dataUrl.slice(comma + 1);
    const target = buildSitePhotoDriveTarget({
      jobNo: cleanJob,
      stpCode: cleanStp,
      recordId: record.id,
      index: idx,
      originalFileName: ph.fileName,
      folderId,
    });
    const bytes = ph.compressedSizeBytes || estimateDataUrlBytes(ph.dataUrl);
    photoPayloads.push({
      photoId: ph.id,
      fileName: target.targetFileName,
      fileSize: formatFileSizeLabel(bytes),
      mimeType,
      base64Data,
      dataUrl: ph.dataUrl,
      serverPath: ph.serverPath || target.serverPath,
      folderId,
      category: `FieldCalc_SitePhoto_${cleanJob}`,
      docType: `Field Site Photo (${cleanStp})`,
      targetCode: cleanJob,
    });
  });

  // Build companion JSON record manifest so the FieldCalcRecord and its site photo references are archived together in Drive
  const manifestObj = {
    schema: 'LabTech_HOKLAS_FieldCalcRecord_v1',
    recordId: record.id,
    jobNo: cleanJob,
    stpCode: cleanStp,
    title: record.title,
    locationNote: record.locationNote || null,
    pass: record.pass,
    testedAt: record.testedAt,
    operatorName: record.operatorName,
    signedBy: record.signedBy || null,
    signedRole: record.signedRole || null,
    signedAt: record.signedAt || null,
    summary: record.summary,
    targetDriveFolderId: folderId,
    targetDriveFolderPath: folderPath,
    attachedSitePhotos: photoPayloads.map((p, idx) => ({
      slot: idx + 1,
      photoId: p.photoId,
      fileName: p.fileName,
      serverPath: p.serverPath,
      fileSize: p.fileSize,
      mimeType: p.mimeType,
      caption: photos[idx]?.caption || `${cleanJob} · ${cleanStp} Site Photo #${idx + 1}`,
      source: photos[idx]?.source || 'picker',
    })),
  };

  const manifestJson = JSON.stringify(manifestObj, null, 2);
  const manifestBase64 = btoa(unescape(encodeURIComponent(manifestJson)));
  const manifestDataUrl = `data:application/json;base64,${manifestBase64}`;
  const manifestFileName = `${cleanJob}_${record.id}_FieldCalcRecord.json`;
  const manifestServerPath = `${folderPath}/${manifestFileName}`;

  const recordManifestPayload: FieldCalcDriveUploadPayloadItem = {
    fileName: manifestFileName,
    fileSize: formatFileSizeLabel(manifestJson.length),
    mimeType: 'application/json',
    base64Data: manifestBase64,
    dataUrl: manifestDataUrl,
    serverPath: manifestServerPath,
    folderId,
    category: `FieldCalc_Record_${cleanJob}`,
    docType: `Field Calc Record (${cleanStp})`,
    targetCode: cleanJob,
  };

  return {
    folderId,
    folderPath,
    manifestFileName,
    manifestServerPath,
    photoPayloads,
    recordManifestPayload,
    allUploadPayloads: [...photoPayloads, recordManifestPayload],
  };
}

export function mergeAttachedSitePhotos(
  existing: FieldCalcPhoto[],
  incoming: FieldCalcPhoto[],
  maxCount = MAX_SITE_PHOTOS_PER_RECORD
): FieldCalcPhoto[] {
  const combined = [...(existing || []), ...(incoming || [])];
  return combined.slice(0, Math.max(1, maxCount));
}

export async function compressSitePhotoFile(
  file: File,
  options?: {
    maxDim?: number;
    quality?: number;
    maxBytes?: number;
    source?: 'camera' | 'picker' | 'sketch';
    jobNo?: string;
    stpCode?: string;
    index?: number;
    folderId?: string;
  }
): Promise<FieldCalcPhoto | null> {
  const maxDim = options?.maxDim ?? DEFAULT_MAX_PHOTO_DIM;
  const initialQuality = options?.quality ?? 0.76;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_COMPRESSED_BYTES;
  const source = options?.source ?? 'picker';
  const jobNo = (options?.jobNo || 'LT0002').trim().toUpperCase();
  const stpCode = (options?.stpCode || 'FIELD').trim().toUpperCase();
  const index = options?.index ?? 0;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      if (!resultStr) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let currentMaxDim = maxDim;
        let scaled = computeScaledDimensions(img.width || 800, img.height || 600, currentMaxDim);
        const canvas = document.createElement('canvas');
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackBytes = estimateDataUrlBytes(resultStr);
          const target = buildSitePhotoDriveTarget({
            jobNo,
            stpCode,
            index,
            originalFileName: file.name,
            folderId: options?.folderId,
          });
          resolve({
            id: `ph-${Date.now()}-${index}`,
            fileName: sanitizePhotoFileName(file.name, 'jpg'),
            dataUrl: resultStr,
            caption: `${jobNo} · ${stpCode} Site Photo #${index + 1}`,
            mimeType: file.type || 'image/jpeg',
            originalSizeBytes: file.size || fallbackBytes,
            compressedSizeBytes: fallbackBytes,
            width: scaled.width,
            height: scaled.height,
            source,
            targetFolderId: target.targetFolderId,
            serverPath: target.serverPath,
            syncStatus: 'pending',
          });
          return;
        }

        const renderAt = (w: number, h: number, q: number): string => {
          canvas.width = w;
          canvas.height = h;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', q);
        };

        let quality = initialQuality;
        let compressedDataUrl = renderAt(scaled.width, scaled.height, quality);
        let compressedBytes = estimateDataUrlBytes(compressedDataUrl);

        // Step down JPEG quality and dimensions if still above maxBytes threshold
        const qualitySteps = [0.64, 0.52, 0.42];
        for (const nextQ of qualitySteps) {
          if (compressedBytes <= maxBytes) break;
          quality = nextQ;
          compressedDataUrl = renderAt(scaled.width, scaled.height, quality);
          compressedBytes = estimateDataUrlBytes(compressedDataUrl);
        }

        if (compressedBytes > maxBytes) {
          currentMaxDim = Math.min(currentMaxDim, 680);
          scaled = computeScaledDimensions(img.width || 800, img.height || 600, currentMaxDim);
          compressedDataUrl = renderAt(scaled.width, scaled.height, 0.5);
          compressedBytes = estimateDataUrlBytes(compressedDataUrl);
        }

        const target = buildSitePhotoDriveTarget({
          jobNo,
          stpCode,
          index,
          originalFileName: file.name,
          folderId: options?.folderId,
        });

        resolve({
          id: `ph-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
          fileName: sanitizePhotoFileName(file.name, 'jpg'),
          dataUrl: compressedDataUrl,
          caption: `${jobNo} · ${stpCode} Site Photo #${index + 1} (${source === 'camera' ? 'Camera' : 'Site'})`,
          mimeType: 'image/jpeg',
          originalSizeBytes: file.size || compressedBytes,
          compressedSizeBytes: compressedBytes,
          width: scaled.width,
          height: scaled.height,
          source,
          targetFolderId: target.targetFolderId,
          serverPath: target.serverPath,
          syncStatus: 'pending',
        });
      };
      img.onerror = () => {
        const fallbackBytes = estimateDataUrlBytes(resultStr);
        const target = buildSitePhotoDriveTarget({
          jobNo,
          stpCode,
          index,
          originalFileName: file.name,
          folderId: options?.folderId,
        });
        resolve({
          id: `ph-${Date.now()}-${index}`,
          fileName: sanitizePhotoFileName(file.name, 'jpg'),
          dataUrl: resultStr,
          caption: `${jobNo} · ${stpCode} Site Photo #${index + 1}`,
          mimeType: file.type || 'image/jpeg',
          originalSizeBytes: file.size || fallbackBytes,
          compressedSizeBytes: fallbackBytes,
          source,
          targetFolderId: target.targetFolderId,
          serverPath: target.serverPath,
          syncStatus: 'pending',
        });
      };
      img.src = resultStr;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
