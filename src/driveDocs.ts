import { DRIVE_FILE_MAP } from './data/driveFileMap';

export interface ResolvedDocLink {
  driveId?: string;
  embedUrl?: string;
  openTabUrl?: string;
  downloadUrl?: string;
  pdfCompanionUrl?: string;
  officeCompanionUrl?: string;
  officeExt?: 'XLSX' | 'XLS' | 'DOC' | 'DOCX';
  kind: 'drive' | 'pdf' | 'image' | 'office_local' | 'other';
}

const PDF_TO_OFFICE_MAP: Record<string, string> = {
  '/server-docs/forms/Equipment_Inventory_List_261012.pdf': '/server-docs/forms/Equipment_Inventory_List_261012.xlsx',
  '/server-docs/forms/FC03-TM3-MU_Koden_Uncertainty_template.pdf': '/server-docs/forms/FC03-TM3-MU_Koden_Uncertainty_template.xlsx',
  '/server-docs/forms/FCC01_Monthly_Check_Template.pdf': '/server-docs/forms/FCC01_Monthly_Check_Template.xlsx',
  '/server-docs/forms/FQS08-FDT-PLT_Test_Order_Form_261028.pdf': '/server-docs/forms/FQS08-FDT-PLT_Test_Order_Form_261028.xlsx',
  '/server-docs/forms/FQS08-FDT-TM3_Test_Order_Form_260417.pdf': '/server-docs/forms/FQS08-FDT-TM3_Test_Order_Form_260417.doc',
  '/server-docs/forms/FQS08-GTT-C939_940_Test_Order_Form_260417.pdf': '/server-docs/forms/FQS08-GTT-C939_940_Test_Order_Form_260417.doc',
  '/server-docs/forms/FQS08_Order_Form_Test_Request.pdf': '/server-docs/forms/FQS08_Order_Form_Test_Request.doc',
  '/server-docs/forms/FQS09-FDT-TM3_Daily_Record_260417.pdf': '/server-docs/forms/FQS09-FDT-TM3_Daily_Record_260417.doc',
  '/server-docs/forms/FQS09-GTT-C939_Daily_Record_261001.pdf': '/server-docs/forms/FQS09-GTT-C939_Daily_Record_261001.doc',
  '/server-docs/forms/FQS09-GTT-C940_Daily_Record_261001.pdf': '/server-docs/forms/FQS09-GTT-C940_Daily_Record_261001.doc',
  '/server-docs/forms/FQS09-RKT-D5731_Daily_Record_260417.pdf': '/server-docs/forms/FQS09-RKT-D5731_Daily_Record_260417.doc',
  '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf': '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.xls',
  '/server-docs/forms/FQS39_Criteria_External_Calibration_template.pdf': '/server-docs/forms/FQS39_Criteria_External_Calibration_template.doc',
  '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf': '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.doc',
  '/server-docs/forms/FQS50_Loan_of_Equipment_template.pdf': '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc',
  '/server-docs/forms/MU-GTT-C939_FlowCone_Uncertainty_260421.pdf': '/server-docs/forms/MU-GTT-C939_FlowCone_Uncertainty_260421.xlsx',
  '/server-docs/forms/MU-GTT-C940_Bleeding_Uncertainty_260421.pdf': '/server-docs/forms/MU-GTT-C940_Bleeding_Uncertainty_260421.xlsx',
  '/server-docs/forms/MU-RKT-D5731_PointLoad_Uncertainty_260421.pdf': '/server-docs/forms/MU-RKT-D5731_PointLoad_Uncertainty_260421.xlsx',
  '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.pdf': '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.xlsx',
  '/server-docs/schedules/HOKLAS-4-Loading-20241104.pdf': '/server-docs/schedules/HOKLAS-4-Loading-20241104.docx',
  '/server-docs/schedules/HOKLAS-5-Verticalitycheck-20241104.pdf': '/server-docs/schedules/HOKLAS-5-Verticalitycheck-20241104.docx',
  '/server-docs/schedules/Job_Register.pdf': '/server-docs/schedules/Job_Register.xlsx',
  '/server-docs/schedules/LabTech_Job_Register.pdf': '/server-docs/schedules/LabTech_Job_Register.xlsx',
  '/server-docs/schedules/LT_Progress_20261021.pdf': '/server-docs/schedules/LT_Progress_20261021.xlsx',
  '/server-docs/schedules/LT_Report_Summary_202610.pdf': '/server-docs/schedules/LT_Report_Summary_202610.xlsx',
  '/server-docs/schedules/Meeting_20261021.pdf': '/server-docs/schedules/Meeting_20261021.docx',
  '/server-docs/schedules/Training_Schedule_20261012.pdf': '/server-docs/schedules/Training_Schedule_20261012.xlsx',
  '/server-docs/stp/STP03-FDT-D6760_rev3_260502.pdf': '/server-docs/stp/STP03-FDT-D6760_rev3_260502.docx',
  '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_blank.pdf': '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx',
  '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.pdf': '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx',
  '/server-docs/worksheets/FST03-FDT-D6760-2-260417_Worksheet_template.pdf': '/server-docs/worksheets/FST03-FDT-D6760-2-260417_Worksheet_template.xlsx',
  '/server-docs/worksheets/FST04-GTT-C940-3-261001_Worksheet_template.pdf': '/server-docs/worksheets/FST04-GTT-C940-3-261001_Worksheet_template.xlsx',
  '/server-docs/worksheets/FST05-GTT-C939-2-260417_Worksheet_template.pdf': '/server-docs/worksheets/FST05-GTT-C939-2-260417_Worksheet_template.xlsx',
  '/server-docs/worksheets/FST06-RKT-D5731-2-260421_Worksheet_template.pdf': '/server-docs/worksheets/FST06-RKT-D5731-2-260421_Worksheet_template.xls',
  '/server-docs/worksheets/FST07-FDT-PLT-1-261028_Worksheet_template.pdf': '/server-docs/worksheets/FST07-FDT-PLT-1-261028_Worksheet_template.xlsx',
  '/server-docs/worksheets/FSTxx-RKT-D5731-0-260720_Coaxial_check.pdf': '/server-docs/worksheets/FSTxx-RKT-D5731-0-260720_Coaxial_check.xls',
};

const LOCAL_COMPANION_PDF_OVERRIDES: Record<string, string> = {
  '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx':
    '/server-docs/worksheets/FST02-FDT-TM3-6-260612_Worksheet_template.pdf',
  '/templates/STP07-PLT_Worksheet_template.xlsx':
    '/server-docs/worksheets/FST07-FDT-PLT-1-261028_Worksheet_template.pdf',
};

function getOfficeExt(url?: string): 'XLSX' | 'XLS' | 'DOC' | 'DOCX' | undefined {
  if (!url) return undefined;
  const m = url.split('?')[0].match(/\.(xlsx|xls|docx|doc)$/i);
  return m ? (m[1].toUpperCase() as 'XLSX' | 'XLS' | 'DOC' | 'DOCX') : undefined;
}

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

export function getCompanionOfficeUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const clean = rawUrl.split('?')[0];
  if (/\.(xlsx?|docx?)$/i.test(clean)) return clean;
  return PDF_TO_OFFICE_MAP[clean];
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
  const officeUrl = getCompanionOfficeUrl(rawUrl);
  const officeExt = getOfficeExt(officeUrl);
  const driveId = extractDriveId(rawUrl);

  if (companionPdf) {
    return {
      driveId,
      embedUrl: companionPdf,
      openTabUrl: companionPdf,
      downloadUrl: officeUrl || rawUrl,
      pdfCompanionUrl: companionPdf,
      officeCompanionUrl: officeUrl,
      officeExt,
      kind: 'pdf',
    };
  }
  if (/^\/server-docs\/(stp|worksheets|forms|reports|schedules)\/.+\.pdf$/i.test(clean)) {
    return {
      driveId,
      embedUrl: clean,
      openTabUrl: clean,
      downloadUrl: officeUrl || clean,
      pdfCompanionUrl: clean,
      officeCompanionUrl: officeUrl,
      officeExt,
      kind: 'pdf',
    };
  }
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
    pdfCompanionUrl: isPdf ? rawUrl : undefined,
    kind: isPdf ? 'pdf' : isImg ? 'image' : isOffice ? 'office_local' : 'other',
  };
}
