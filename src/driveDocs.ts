import { DRIVE_FILE_MAP } from './data/driveFileMap';

export interface ResolvedDocLink {
  driveId?: string;
  embedUrl?: string;
  openTabUrl?: string;
  downloadUrl?: string;
  kind: 'drive' | 'pdf' | 'image' | 'office_local' | 'other';
}

export function extractDriveId(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (DRIVE_FILE_MAP[raw]) return DRIVE_FILE_MAP[raw];
  const m1 = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m1) return m1[1];
  const m2 = raw.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (m2) return m2[1];
  if (/^gdrive:([a-zA-Z0-9_-]{15,})$/.test(raw)) return raw.slice(7);
  return undefined;
}

export function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return dataUrl;
    const header = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return dataUrl;
  }
}

export function resolveDocLink(rawUrl?: string, fileName = ''): ResolvedDocLink {
  const driveId = extractDriveId(rawUrl);
  if (driveId) {
    return {
      driveId,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      openTabUrl: `https://drive.google.com/file/d/${driveId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
      kind: 'drive',
    };
  }
  const lower = `${fileName} ${rawUrl || ''}`.toLowerCase();
  const isPdf = lower.includes('application/pdf') || /\.pdf(\?|$)/i.test(lower) || lower.endsWith('.pdf');
  const isImg = lower.includes('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lower);
  const isOffice = /\.(xlsx?|docx?|pptx?)(\?|$)/i.test(lower);
  return {
    embedUrl: isPdf || isImg ? rawUrl : undefined,
    openTabUrl: rawUrl,
    downloadUrl: rawUrl,
    kind: isPdf ? 'pdf' : isImg ? 'image' : isOffice ? 'office_local' : 'other',
  };
}
