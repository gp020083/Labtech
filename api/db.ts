import { put, get } from '@vercel/blob';

const DB_PATH = 'db/labtech_state_v2.json';
const CFG_PATH = 'db/gdrive_config.json';
const API_SECRET = 'labtech-gdrive-2026';

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: NO_STORE_HEADERS });
}

async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream as ReadableStream).text();
  return JSON.parse(text) as T;
}

async function getActiveDriveUrl(): Promise<string> {
  const envUrl = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.GDRIVE_WEBAPP_URL;
  if (envUrl && envUrl.trim().startsWith('https://script.google.com/')) return envUrl.trim();
  const cfg = await readPrivateJson<{ driveUrl?: string }>(CFG_PATH).catch(() => null);
  if (cfg?.driveUrl && cfg.driveUrl.trim().startsWith('https://script.google.com/')) return cfg.driveUrl.trim();
  return '';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'loadDb';

    if (action === 'file') {
      const pathname = url.searchParams.get('path') || '';
      if (!pathname || !pathname.startsWith('uploads/')) return jsonRes({ ok: false, error: 'Invalid path' }, 400);
      const fileRes = await get(pathname, { access: 'private' });
      if (!fileRes || fileRes.statusCode !== 200 || !fileRes.stream) return jsonRes({ ok: false, error: 'Not found' }, 404);
      const rawName = pathname.split('/').pop() || 'document.pdf';
      return new Response(fileRes.stream as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': fileRes.blob.contentType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${encodeURIComponent(rawName)}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (url.searchParams.get('secret') !== API_SECRET) return jsonRes({ ok: false, error: 'Unauthorized' }, 401);

    const driveUrl = await getActiveDriveUrl();
    const forceDrive = url.searchParams.get('source') === 'drive';
    let parsed = !forceDrive ? await readPrivateJson<{ rev?: number; updatedAt?: string; state?: unknown }>(DB_PATH) : null;

    if ((!parsed || !parsed.state) && driveUrl) {
      const sep = driveUrl.includes('?') ? '&' : '?';
      const dRes = await fetch(`${driveUrl}${sep}action=loadDb&secret=${encodeURIComponent(API_SECRET)}`, { redirect: 'follow' });
      if (dRes.ok) {
        const dJson = (await dRes.json()) as { ok?: boolean; rev?: number; updatedAt?: string; state?: unknown };
        if (dJson?.ok && dJson.state) {
          parsed = { rev: dJson.rev || Date.now(), updatedAt: dJson.updatedAt || new Date().toISOString(), state: dJson.state };
          await put(DB_PATH, JSON.stringify(parsed), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
        }
      }
    }

    return jsonRes({
      ok: true,
      driveConnected: Boolean(driveUrl),
      driveUrl: driveUrl || '',
      rev: parsed?.rev || 0,
      updatedAt: parsed?.updatedAt || null,
      state: parsed?.state ?? null,
    });
  } catch (err) {
    console.error('[api/db GET error]', err);
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    if (!body || body.secret !== API_SECRET) return jsonRes({ ok: false, error: 'Unauthorized' }, 401);

    if (body.action === 'setDriveUrl') {
      const cleanUrl = String(body.driveUrl || '').trim();
      await put(CFG_PATH, JSON.stringify({ driveUrl: cleanUrl, updatedAt: new Date().toISOString() }), {
        access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
      });
      let driveSynced = false;
      if (cleanUrl.startsWith('https://script.google.com/')) {
        const current = await readPrivateJson<{ rev?: number; state?: unknown }>(DB_PATH).catch(() => null);
        if (current?.state) {
          const gRes = await fetch(cleanUrl, {
            method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ secret: API_SECRET, action: 'saveDb', rev: current.rev || Date.now(), state: current.state }),
          }).catch(() => null);
          if (gRes?.ok) {
            const gOut = (await gRes.json().catch(() => null)) as { ok?: boolean } | null;
            driveSynced = !!gOut?.ok;
          }
        }
      }
      return jsonRes({ ok: true, driveConnected: cleanUrl.startsWith('https://script.google.com/'), driveSynced });
    }

    const driveUrl = await getActiveDriveUrl();

    if (body.action === 'uploadBatch' && Array.isArray(body.files)) {
      const files = body.files as {
        fileName: string;
        mimeType?: string;
        base64Data: string;
        folderId?: string;
        category?: string;
        serverPath?: string;
      }[];
      if (driveUrl) {
        const gRes = await fetch(driveUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ secret: API_SECRET, action: 'uploadBatch', files }),
        }).catch(() => null);
        if (gRes?.ok) {
          const gOut = (await gRes.json().catch(() => null)) as {
            ok?: boolean;
            results?: { fileName: string; ok: boolean; driveId?: string; viewUrl?: string }[];
          } | null;
          if (gOut?.ok && Array.isArray(gOut.results)) {
            return jsonRes(gOut);
          }
        }
      }
      const results: { fileName: string; ok: boolean; driveId?: string; viewUrl?: string; pathname?: string; folderId?: string }[] = [];
      for (const f of files) {
        if (!f || !f.base64Data) continue;
        if (driveUrl) {
          const singleRes = await fetch(driveUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              secret: API_SECRET,
              action: 'uploadFile',
              fileName: f.fileName,
              mimeType: f.mimeType,
              base64Data: f.base64Data,
              folderId: f.folderId,
              category: f.category,
              serverPath: f.serverPath,
            }),
          }).catch(() => null);
          if (singleRes?.ok) {
            const sOut = (await singleRes.json().catch(() => null)) as { ok?: boolean; driveId?: string; viewUrl?: string } | null;
            if (sOut?.ok && sOut.driveId) {
              results.push({ fileName: f.fileName, ok: true, driveId: sOut.driveId, viewUrl: sOut.viewUrl, folderId: f.folderId });
              continue;
            }
          }
        }
        const safeName = String(f.fileName || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const pathname = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safeName}`;
        const binStr = atob(String(f.base64Data));
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        const stored = await put(pathname, new Blob([bytes]), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: String(f.mimeType || 'application/octet-stream'),
        });
        results.push({
          fileName: f.fileName,
          ok: true,
          pathname: stored.pathname,
          folderId: f.folderId,
          viewUrl: `/api/db?action=file&path=${encodeURIComponent(stored.pathname)}`,
        });
      }
      return jsonRes({ ok: true, results });
    }

    if (body.action === 'uploadFile' && body.base64Data) {
      if (driveUrl) {
        const gRes = await fetch(driveUrl, {
          method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            secret: API_SECRET,
            action: 'uploadFile',
            fileName: body.fileName,
            mimeType: body.mimeType,
            base64Data: body.base64Data,
            folderId: body.folderId,
            category: body.category,
            serverPath: body.serverPath,
          }),
        }).catch(() => null);
        if (gRes?.ok) {
          const gOut = (await gRes.json().catch(() => null)) as { ok?: boolean; driveId?: string; viewUrl?: string } | null;
          if (gOut?.ok && gOut.driveId) return jsonRes(gOut);
        }
      }
      const safeName = String(body.fileName || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const pathname = `uploads/${Date.now()}_${safeName}`;
      const binStr = atob(String(body.base64Data));
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const stored = await put(pathname, new Blob([bytes]), {
        access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: String(body.mimeType || 'application/octet-stream'),
      });
      return jsonRes({ ok: true, pathname: stored.pathname, folderId: body.folderId, viewUrl: `/api/db?action=file&path=${encodeURIComponent(stored.pathname)}` });
    }

    if (body.action === 'saveDb' && body.state) {
      const rev = Date.now();
      const updatedAt = new Date().toISOString();
      await put(DB_PATH, JSON.stringify({ rev, updatedAt, state: body.state }), {
        access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
      });
      let driveSynced = false;
      if (driveUrl) {
        const gRes = await fetch(driveUrl, {
          method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ secret: API_SECRET, action: 'saveDb', rev, state: body.state }),
        }).catch(() => null);
        driveSynced = !!gRes?.ok;
      }
      return jsonRes({ ok: true, rev, updatedAt, driveSynced });
    }

    return jsonRes({ ok: false, error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('[api/db POST error]', err);
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
}
