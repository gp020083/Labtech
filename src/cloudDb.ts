export const GDRIVE_URL_STORAGE_KEY = 'labtech_gdrive_webapp_url';
export const BUILTIN_CLOUD_API_URL = '/api/db';
export const DEFAULT_GDRIVE_WEBAPP_URL =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GDRIVE_WEBAPP_URL) || '';
export const GDRIVE_API_SECRET = 'labtech-gdrive-2026';

export function getCustomDriveWebAppUrl(): string {
  try {
    const saved = localStorage.getItem(GDRIVE_URL_STORAGE_KEY);
    if (saved && saved.trim().startsWith('https://script.google.com/')) return saved.trim();
  } catch {}
  return DEFAULT_GDRIVE_WEBAPP_URL.trim();
}

export function getConfiguredDriveWebAppUrl(): string {
  return getCustomDriveWebAppUrl() || BUILTIN_CLOUD_API_URL;
}

export function setConfiguredDriveWebAppUrl(url: string): void {
  try {
    const clean = url.trim();
    if (clean && clean !== BUILTIN_CLOUD_API_URL) localStorage.setItem(GDRIVE_URL_STORAGE_KEY, clean);
    else localStorage.removeItem(GDRIVE_URL_STORAGE_KEY);
  } catch {}
}

export async function saveServerDriveWebAppUrl(url: string): Promise<{ ok: boolean; driveConnected?: boolean; driveSynced?: boolean }> {
  setConfiguredDriveWebAppUrl(url);
  try {
    const res = await fetch(BUILTIN_CLOUD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'setDriveUrl', driveUrl: url.trim() }),
    });
    if (res.ok) return (await res.json()) as { ok: boolean; driveConnected?: boolean; driveSynced?: boolean };
  } catch {}
  return { ok: false };
}

export interface CloudDbLoadResult<T> {
  ok: boolean;
  driveConnected?: boolean;
  driveUrl?: string;
  rev?: number;
  updatedAt?: string;
  state?: T;
}

function isBuiltinServerlessAvailable(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return true;
}

export async function fetchDriveDbState<T>(): Promise<CloudDbLoadResult<T> | null> {
  if (isBuiltinServerlessAvailable()) {
    try {
      const res = await fetch(
        `${BUILTIN_CLOUD_API_URL}?action=loadDb&secret=${encodeURIComponent(GDRIVE_API_SECRET)}&_t=${Date.now()}`,
        { method: 'GET', cache: 'no-store' }
      );
      if (res.ok) {
        const data = (await res.json()) as CloudDbLoadResult<T>;
        if (data?.driveUrl) setConfiguredDriveWebAppUrl(data.driveUrl);
        if (data?.ok) return data;
      }
    } catch {}
  }

  const customUrl = getCustomDriveWebAppUrl();
  if (!customUrl) return null;
  const sep = customUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${customUrl}${sep}action=loadDb&secret=${encodeURIComponent(GDRIVE_API_SECRET)}&_t=${Date.now()}`, {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as CloudDbLoadResult<T>;
}

export async function saveDriveDbState(state: unknown): Promise<{ ok: boolean; rev?: number; updatedAt?: string }> {
  const clean = stripInlineBase64FromState(state);
  const bodyStr = JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'saveDb', state: clean });
  const canKeepAlive = bodyStr.length < 58000;

  let primaryOk = false;
  let rev: number | undefined;
  let updatedAt: string | undefined;

  if (isBuiltinServerlessAvailable()) {
    try {
      const res = await fetch(BUILTIN_CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: bodyStr,
        keepalive: canKeepAlive,
      });
      if (res.ok) {
        const out = (await res.json()) as { ok: boolean; rev?: number; updatedAt?: string };
        primaryOk = !!out?.ok;
        rev = out?.rev;
        updatedAt = out?.updatedAt;
      }
    } catch {}
  }

  const customUrl = getCustomDriveWebAppUrl();
  if (customUrl && !primaryOk) {
    fetch(customUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyStr,
    }).catch(() => {});
    primaryOk = true;
  } else if (!isBuiltinServerlessAvailable() && !customUrl) {
    primaryOk = true;
  }

  return { ok: primaryOk, rev, updatedAt };
}

export async function uploadFileToDrive(params: {
  fileName: string;
  mimeType: string;
  base64Data: string;
  category?: string;
  folderId?: string;
  serverPath?: string;
  overwrite?: boolean;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; driveId?: string; viewUrl?: string } | null> {
  const { signal, ...restParams } = params;
  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }
  if (isBuiltinServerlessAvailable()) {
    try {
      const res = await fetch(BUILTIN_CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'uploadFile', ...restParams }),
        signal,
      });
      if (res.ok) {
        const out = (await res.json()) as { ok: boolean; driveId?: string; viewUrl?: string };
        if (out?.ok && (out.driveId || out.viewUrl)) return out;
      }
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw err;
      }
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }
  const customUrl = getCustomDriveWebAppUrl();
  if (!customUrl) {
    return {
      ok: true,
      driveId: `local-drv-${Date.now().toString(36)}`,
      viewUrl: restParams.serverPath || `GoogleDrive/05_User_Uploads/${restParams.fileName}`,
    };
  }
  const res = await fetch(customUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'uploadFile', ...restParams }),
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as { ok: boolean; driveId?: string; viewUrl?: string };
}

export interface BatchDriveUploadResultItem {
  fileName: string;
  ok: boolean;
  driveId?: string;
  viewUrl?: string;
}

export interface FileGranularProgressEvent {
  index: number;
  percent: number;
  status: 'uploading' | 'done' | 'error';
  driveSynced?: boolean;
}

export async function uploadBatchFilesToDrive(
  files: {
    fileName: string;
    mimeType: string;
    base64Data: string;
    category?: string;
    folderId?: string;
    serverPath?: string;
    overwrite?: boolean;
  }[],
  onProgress?: (completed: number, total: number) => void,
  onFileProgress?: (event: FileGranularProgressEvent) => void,
  signal?: AbortSignal
): Promise<BatchDriveUploadResultItem[]> {
  if (files.length === 0) return [];
  if (signal?.aborted) {
    throw new DOMException('Batch upload cancelled', 'AbortError');
  }
  const totalBytes = files.reduce((sum, f) => sum + (f.base64Data?.length || 0), 0);

  // Mark all files as starting upload (25%)
  for (let i = 0; i < files.length; i++) {
    onFileProgress?.({ index: i, percent: 25, status: 'uploading' });
  }

  // Try single-batch endpoint first if total payload is under 3.2MB
  if (totalBytes <= 3_200_000) {
    if (isBuiltinServerlessAvailable()) {
      try {
        for (let i = 0; i < files.length; i++) {
          onFileProgress?.({ index: i, percent: 65, status: 'uploading' });
        }
        const res = await fetch(BUILTIN_CLOUD_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=utf-8' },
          body: JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'uploadBatch', files }),
          signal,
        });
        if (res.ok) {
          const out = (await res.json()) as { ok?: boolean; results?: BatchDriveUploadResultItem[] };
          if (out?.ok && Array.isArray(out.results) && out.results.length === files.length) {
            out.results.forEach((r, idx) => {
              onFileProgress?.({
                index: idx,
                percent: 100,
                status: r.ok ? 'done' : 'error',
                driveSynced: Boolean(r.driveId || r.viewUrl),
              });
            });
            onProgress?.(files.length, files.length);
            return out.results;
          }
        }
      } catch (err) {
        if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw err;
        }
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Batch upload cancelled', 'AbortError');
    }

    const customUrl = getCustomDriveWebAppUrl();
    if (customUrl) {
      try {
        const res = await fetch(customUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ secret: GDRIVE_API_SECRET, action: 'uploadBatch', files }),
          signal,
        });
        if (res.ok) {
          const out = (await res.json()) as { ok?: boolean; results?: BatchDriveUploadResultItem[] };
          if (out?.ok && Array.isArray(out.results) && out.results.length === files.length) {
            out.results.forEach((r, idx) => {
              onFileProgress?.({
                index: idx,
                percent: 100,
                status: r.ok ? 'done' : 'error',
                driveSynced: Boolean(r.driveId || r.viewUrl),
              });
            });
            onProgress?.(files.length, files.length);
            return out.results;
          }
        }
      } catch (err) {
        if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw err;
        }
      }
    }
  }

  // Fallback to per-file upload in the batch with live per-file progress callback
  const results: BatchDriveUploadResultItem[] = [];
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Batch upload cancelled', 'AbortError');
    }
    const f = files[i];
    onFileProgress?.({ index: i, percent: 55, status: 'uploading' });
    const single = await uploadFileToDrive({ ...f, signal }).catch((err) => {
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw err;
      }
      return null;
    });
    const ok = Boolean(single?.ok);
    results.push({
      fileName: f.fileName,
      ok,
      driveId: single?.driveId,
      viewUrl: single?.viewUrl,
    });
    onFileProgress?.({
      index: i,
      percent: 100,
      status: 'done',
      driveSynced: Boolean(single?.driveId || single?.viewUrl),
    });
    onProgress?.(i + 1, files.length);
  }
  return results;
}

function stripInlineBase64FromState<T>(obj: T): T {
  const json = JSON.stringify(obj, (key, val) => {
    if ((key === 'dataUrl' || key === 'certUrl') && typeof val === 'string' && val.startsWith('data:') && val.length > 200000) {
      return undefined;
    }
    return val;
  });
  return JSON.parse(json) as T;
}

