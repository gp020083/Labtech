import { DRIVE_FILE_MAP } from './data/driveFileMap';

export interface ResolvedDocLink {
  driveId?: string;
  previewUrl?: string;
  embedUrl?: string;
  openTabUrl?: string;
  downloadUrl?: string;
  pdfCompanionUrl?: string;
  officeCompanionUrl?: string;
  officeExt?: 'XLSX' | 'XLS' | 'DOC' | 'DOCX';
  kind: 'drive' | 'pdf' | 'image' | 'office_local' | 'other';
}

const LOCAL_COMPANION_PDF_OVERRIDES: Record<string, string> = {
  '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx':
    '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_blank.pdf',
  '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.pdf':
    '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_blank.pdf',
  '/templates/STP07-PLT_Worksheet_template.xlsx':
    '/server-docs/worksheets/FST07-FDT-PLT-1-261028_Worksheet_template.pdf',
  '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.xlsx':
    '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.pdf',
};

export function getCompanionPdfUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const clean = rawUrl.split('?')[0];
  if (LOCAL_COMPANION_PDF_OVERRIDES[clean]) {
    return LOCAL_COMPANION_PDF_OVERRIDES[clean];
  }
  if (/^\/templates\/.+\.xlsx?$/i.test(clean)) {
    return clean.replace(/^\/templates\//i, '/server-docs/worksheets/').replace(/\.xlsx?$/i, '.pdf');
  }
  if (/^\/server-docs\/.+\.(xlsx?|docx?)$/i.test(clean)) {
    return clean.replace(/\.(xlsx?|docx?)$/i, '.pdf');
  }
  return undefined;
}

export function getCompanionOfficeUrl(_rawUrl?: string): string | undefined {
  return undefined;
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
  const clean = rawUrl ? rawUrl.split('?')[0] : '';
  const companionPdf = getCompanionPdfUrl(rawUrl);
  const driveId = extractDriveId(rawUrl);

  if (companionPdf) {
    return {
      driveId,
      previewUrl: companionPdf,
      embedUrl: companionPdf,
      openTabUrl: companionPdf,
      downloadUrl: companionPdf,
      pdfCompanionUrl: companionPdf,
      officeCompanionUrl: undefined,
      officeExt: undefined,
      kind: 'pdf',
    };
  }
  if (/^\/server-docs\/(stp|worksheets|forms|reports|schedules)\/.+\.pdf$/i.test(clean)) {
    return {
      driveId,
      previewUrl: clean,
      embedUrl: clean,
      openTabUrl: clean,
      downloadUrl: clean,
      pdfCompanionUrl: clean,
      officeCompanionUrl: undefined,
      officeExt: undefined,
      kind: 'pdf',
    };
  }
  if (driveId) {
    const drivePreview = `https://drive.google.com/file/d/${driveId}/preview`;
    return {
      driveId,
      previewUrl: drivePreview,
      embedUrl: drivePreview,
      openTabUrl: `https://drive.google.com/file/d/${driveId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
      officeCompanionUrl: undefined,
      officeExt: undefined,
      kind: 'drive',
    };
  }
  const lower = `${fileName} ${rawUrl || ''}`.toLowerCase();
  const isPdf = lower.includes('application/pdf') || /\.pdf(\?|$)/i.test(lower) || lower.endsWith('.pdf');
  const isImg = lower.includes('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lower);
  const isOffice = /\.(xlsx?|docx?|pptx?)(\?|$)/i.test(lower);
  return {
    previewUrl: isPdf || isImg ? rawUrl : undefined,
    embedUrl: isPdf || isImg ? rawUrl : undefined,
    openTabUrl: rawUrl,
    downloadUrl: rawUrl,
    pdfCompanionUrl: isPdf ? rawUrl : undefined,
    officeCompanionUrl: undefined,
    officeExt: undefined,
    kind: isPdf ? 'pdf' : isImg ? 'image' : isOffice ? 'office_local' : 'other',
  };
}
