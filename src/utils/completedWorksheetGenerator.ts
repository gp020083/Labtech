import { EquipmentItem, FieldCalcRecord, JobItem, TestMethodItem } from '../types';
import { HoklasWorksheetEquipmentRow, HoklasWorksheetRow } from './limsProcessTools';
import {
  buildOfficialTemplateSheetCellMaps,
  fillXlsxTemplateBuffer,
  getTemplatePublicPath,
} from './xlsxTemplateFiller';

export const LABTECH_COMPANY_HEADER = {
  nameEn: 'LabTech Testing Limited',
  nameZh: '力達檢測有限公司',
  addressLine1:
    'BLK A & B, 8/F., HONG KONG SPINNERS INDUSTRIAL BUILDING, PHASE VI, 481-483 CASTLE PEAK ROAD, KOWLOON, HONG KONG',
  addressZh: '香港九龍長沙灣青山道 481-483 號香港紗廠工業大厦六期八樓 A 及 B 室',
  contactLine: 'TEL: 2371 0008        FAX: 2744 1037        E-Mail: info@lab-tech.com.hk',
  hoklasRegNo: 'HOKLAS 298',
};

export interface FlowConeStructuredPayload {
  kind: 'FC';
  waterCheckSec: number;
  waterCheck2Sec?: number;
  waterOk: boolean;
  groutTempC: number;
  ambientTempC?: number;
  t1Sec: number;
  t2Sec: number;
  meanSec: number;
  diffSec: number;
  repeatOk: boolean;
  specRangeText?: string;
  cementBrand?: string;
  cementQty?: string;
  admixtureBrand?: string;
  admixtureQty?: string;
  waterSource?: string;
  waterQty?: string;
  wcRatio?: string;
  ambientTempText?: string;
  waterTempText?: string;
  testDateIso?: string;
  batchNo?: string;
  sampleId?: string;
  timeWaterAdded?: string;
  timeDrawingGrout?: string;
}

export interface BleedingIntervalItem {
  timeLabel: string;
  v2: number;
  vg: number;
  bleedAmt: number;
  bleedPct: number;
  expPct: number;
}

export interface BleedingStructuredPayload {
  kind: 'BL';
  unit: 'mL' | 'mm';
  v1: number;
  decantedVw: number | null;
  specLimitPct: number;
  finalBleedAmt: number;
  finalBleedPct: number;
  finalExpPct: number;
  isPass: boolean;
  intervals: BleedingIntervalItem[];
  cementBrand?: string;
  cementQty?: string;
  admixtureBrand?: string;
  admixtureQty?: string;
  waterSource?: string;
  waterQty?: string;
  wcRatio?: string;
  ambientTempText?: string;
  waterTempText?: string;
  testDateIso?: string;
  batchNo?: string;
  sampleId?: string;
}

export interface PltStepItem {
  stepName: string;
  loadKn: number;
  pressureKpa: number;
  g1: number;
  g2: number;
  g3: number;
  g4: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  meanMm: number;
  spreadMm: number;
  ks: number | null;
  tiltWarn: boolean;
}

export interface PltStructuredPayload {
  kind: 'PLT';
  plateShape: 'circular' | 'square';
  plateSizeMm: number;
  areaM2: number;
  gaugeCount: 3 | 4;
  workingKpa: number;
  poissonNu: number;
  zeroG: { g1: number; g2: number; g3: number; g4: number };
  prev15mAvg: number;
  curr15mAvg: number;
  rate15m: number;
  rateStable: boolean;
  peakLoadKn: number;
  peakPressureKpa: number;
  peakSettlementMm: number;
  limit015BMm: number;
  ksPeak: number | null;
  esMpa: number | null;
  pass015B: boolean;
  steps: PltStepItem[];
}

export interface PointLoadStructuredPayload {
  kind: 'PO';
  mode: 'diametral' | 'axial';
  dMm: number;
  wMm: number;
  loadKn: number;
  failSec: number;
  deMm: number;
  isUncorrMpa: number;
  fFactor: number;
  is50Mpa: number;
  estUcsMpa: number;
  timeOk: boolean;
}

export interface KodenStructuredPayload {
  kind: 'KD';
  pileDiaMm: number;
  depthM: number;
  dxMm: number;
  dyMm: number;
  offsetMm: number;
  ratioDenom: number;
  vertPct: number;
  limitDenom: number;
  isPass: boolean;
}

export interface InclinometerRowItem {
  depthM: number;
  a0: number;
  a180: number;
  b0: number;
  b180: number;
  chkA: number;
  chkB: number;
  resMm: number;
  ratioN: number;
}

export interface InclinometerStructuredPayload {
  kind: 'VC';
  limitN: number;
  maxDepthM: number;
  maxDriftMm: number;
  overallN: number;
  isPass: boolean;
  rows: InclinometerRowItem[];
}

export type StructuredCalcPayload =
  | FlowConeStructuredPayload
  | BleedingStructuredPayload
  | PltStructuredPayload
  | PointLoadStructuredPayload
  | KodenStructuredPayload
  | InclinometerStructuredPayload;

export interface OfficialTemplateMeta {
  stpCode: string;
  worksheetFormCode: string;
  formalReportFormCode: string;
  formalReportFileUrl?: string;
  templateFileCode: string;
  templateTitleEn: string;
  templateTitleZh: string;
  formalReportTitleEn: string;
  formalReportTitleZh: string;
  testStandard: string;
  stpDocRef: string;
  muRefCode: string;
  uncertaintyStatement: string;
  accredited: boolean;
}

export function getOfficialTemplateMeta(stpCode: string, tests?: TestMethodItem[]): OfficialTemplateMeta {
  const clean = (stpCode || 'KD').trim().toUpperCase();
  const matched = tests?.find((t) => t.code.toUpperCase() === clean);

  switch (clean) {
    case 'FC':
      return {
        stpCode: 'FC',
        worksheetFormCode: 'FST05-GTT-C939-2-260417',
        formalReportFormCode: 'GTT-C939-RT',
        templateFileCode: 'FST05-GTT-C939-2-260417_Worksheet_template.xlsx',
        templateTitleEn: 'Flow of Grout for Preplaced-Aggregate Concrete (Flow Cone Method)',
        templateTitleZh: '水泥漿流動度（流錐法）現場完成工作紙 (FST05-GTT-C939-2-260417)',
        formalReportTitleEn: 'TEST REPORT — FLOW OF GROUT FOR PREPLACED-AGGREGATE CONCRETE BY FLOW CONE METHOD',
        formalReportTitleZh: 'HOKLAS 認可水泥漿流錐流動度測試正式報告 (GTT-C939-RT)',
        testStandard: matched?.std || 'ASTM C939M - 22',
        stpDocRef: `${matched?.stpDocCode || 'STP05-GTT-C939'} (${matched?.stpRev || 'rev 2'})`,
        muRefCode: 'MU-GTT-C939-1 (260421)',
        uncertaintyStatement: 'Expanded Measurement Uncertainty U95 = ± 0.4 s (Coverage factor k = 2, ~95% confidence level)',
        accredited: true,
      };
    case 'BL':
      return {
        stpCode: 'BL',
        worksheetFormCode: 'FST04-GTT-C940-3-261001',
        formalReportFormCode: 'GTT-C940-RT',
        templateFileCode: 'FST04-GTT-C940-3-261001_Worksheet_template.xlsx',
        templateTitleEn: 'Bleeding and free expansion of grout',
        templateTitleZh: '新拌水泥漿自由膨脹率及泌水率完成工作紙 (FST04-GTT-C940-3-261001)',
        formalReportTitleEn: 'TEST REPORT — BLEEDING AND FREE EXPANSION OF GROUT',
        formalReportTitleZh: 'HOKLAS 認可水泥漿泌水率及自由膨脹率正式報告 (GTT-C940-RT)',
        testStandard: matched?.std || 'ASTM C940 - 22',
        stpDocRef: `${matched?.stpDocCode || 'STP04-GTT-C940'} (${matched?.stpRev || 'rev 2'})`,
        muRefCode: 'MU-GTT-C940-1 (260421)',
        uncertaintyStatement: 'Expanded Measurement Uncertainty U95 = ± 0.2% bleeding / ± 0.2% expansion (k = 2, ~95% confidence)',
        accredited: true,
      };
    case 'PLT':
      return {
        stpCode: 'PLT',
        worksheetFormCode: 'FST07-FDT-PLT-1-261028',
        formalReportFormCode: 'FDT-PLT-RT-1-261028',
        formalReportFileUrl: '/server-docs/reports/FDT-PLT-RT-1-261028_Report_template.xlsx',
        templateFileCode: 'FST07-FDT-PLT-1-261028_Worksheet_template.xlsx',
        templateTitleEn:
          'WORKSHEET FOR DETERMINATION OF VERTICAL DEFORMATION AND STRENGTH CHARACTERISTICS OF SOIL BY PLATE LOADING TEST (INCREMENTAL LOADING METHOD)',
        templateTitleZh: '平板載荷試驗現場工作紙 (FST07-FDT-PLT-1-261028)',
        formalReportTitleEn:
          'TEST REPORT — DETERMINATION OF VERTICAL DEFORMATION AND STRENGTH CHARACTERISTICS OF SOIL BY PLATE LOADING TEST (INCREMENTAL LOADING METHOD)',
        formalReportTitleZh: '平板載荷試驗 23 頁主控正式報告範本 (FDT-PLT-RT-1-261028 Report_template.xlsx)',
        testStandard: matched?.std || 'BS 1377: Part 9: 1990 Cl. 4.1 / Geoguide 7 / CoP Foundations',
        stpDocRef: `${matched?.stpDocCode || 'STP07-PLT'} (${matched?.stpRev || 'Issue 0'})`,
        muRefCode: 'PLT_Setup_Checking_750kPa (v20261021)',
        uncertaintyStatement: 'Expanded Uncertainty U95: Applied Load ± 1.0%; Dial Gauge Settlement ± 0.01 mm per division (k = 2)',
        accredited: false,
      };
    case 'PO':
      return {
        stpCode: 'PO',
        worksheetFormCode: 'FST06-RKT-D5731-2-260421',
        formalReportFormCode: 'RKT-D5731-RT',
        templateFileCode: 'FST06-RKT-D5731-2-260421_Worksheet_template.xlsx',
        templateTitleEn: 'On Determination of Point Load Strength Index of Rock',
        templateTitleZh: '岩石點荷載強度指數 Is(50) 完成工作紙 (FST06-RKT-D5731-2-260421)',
        formalReportTitleEn: 'TEST REPORT — POINT LOAD STRENGTH INDEX OF ROCK BY DIAMETRAL AND AXIAL TESTS',
        formalReportTitleZh: 'HOKLAS 認可岩石點荷載強度指數 Is(50) 正式測試報告 (RKT-D5731-RT)',
        testStandard: matched?.std || 'ASTM D5731-16',
        stpDocRef: `${matched?.stpDocCode || 'STP06-RKT-D5731'} (${matched?.stpRev || 'rev 2'})`,
        muRefCode: 'MU-RKT-D5731-1 (260421)',
        uncertaintyStatement: 'Expanded Measurement Uncertainty U95 = ± 0.18 MPa on Is(50) (Coverage factor k = 2, ~95% confidence)',
        accredited: true,
      };
    case 'SO':
      return {
        stpCode: 'SO',
        worksheetFormCode: 'FST03-FDT-D6760-2-260417',
        formalReportFormCode: 'FDT-D6760-RT',
        templateFileCode: 'FST03-FDT-D6760-2-260417_Worksheet_template.xlsx',
        templateTitleEn: 'ULTRASONIC LOGGING TESTING',
        templateTitleZh: '跨孔超聲波測井 (Crosshole Sonic Logging) 完成工作紙 (FST03-FDT-D6760-2-260417)',
        formalReportTitleEn: 'TEST REPORT — INTEGRITY TESTING OF CONCRETE DEEP FOUNDATION BY CROSSHOLE SONIC LOGGING TEST',
        formalReportTitleZh: 'HOKLAS 認可跨孔超聲波測井正式測試報告 (FDT-D6760-RT)',
        testStandard: matched?.std || 'ASTM D6760-16',
        stpDocRef: `${matched?.stpDocCode || 'STP03-FDT-D6760'} (${matched?.stpRev || 'rev 2'})`,
        muRefCode: 'STP03-FDT-D6760 Cl. 11',
        uncertaintyStatement: 'Expanded Measurement Uncertainty U95: Depth ± 1% or 0.25m; Ultrasonic Pulse Time Base Verified (k = 2)',
        accredited: true,
      };
    case 'VC':
      return {
        stpCode: 'VC',
        worksheetFormCode: 'FST08-INC-Draft',
        formalReportFormCode: 'INC-RT',
        templateFileCode: 'STP07-PLT_Worksheet_template.xlsx',
        templateTitleEn: 'WORKSHEET FOR BIAXIAL INCLINOMETER VERTICALITY PROFILE CHECK (A0/A180 & B0/B180)',
        templateTitleZh: '雙軸測斜儀鑽孔／樁身垂直度完成工作紙',
        formalReportTitleEn: 'TEST REPORT — VERTICALITY CHECK BY BIAXIAL INCLINOMETER',
        formalReportTitleZh: '雙軸測斜儀樁身垂直度測試正式報告',
        testStandard: matched?.std || 'BD CoP Foundations / Geospec 3 Inclinometer Survey',
        stpDocRef: `${matched?.stpDocCode || 'STP08-INC-DRAFT'} (${matched?.stpRev || 'Draft'})`,
        muRefCode: 'MU-INC-01',
        uncertaintyStatement: 'Expanded Uncertainty U95 = ± 1.5 mm per 10 m depth (A0/A180 zero-bias compensated, k = 2)',
        accredited: false,
      };
    case 'KD':
    default:
      return {
        stpCode: clean,
        worksheetFormCode: 'FST02-FDT-TM3-6-260612',
        formalReportFormCode: 'FDT-TM3-RT',
        templateFileCode: 'FST02-FDT-TM3-6-260612_Worksheet_template.xlsx',
        templateTitleEn: 'ULTRASONIC ECHO SOUNDER TEST',
        templateTitleZh: 'Koden 超聲波鑽孔垂直度及孔徑剖面完成工作紙 (FST02-FDT-TM3-6-260612)',
        formalReportTitleEn: 'TEST REPORT — ULTRASONIC ECHO SOUNDER TEST (DETERMINATION OF GEOMETRY OF VERTICAL SHAFT EXCAVATION)',
        formalReportTitleZh: 'HOKLAS 認可 Koden 超聲波鑽孔垂直度正式測試報告 (FDT-TM3-RT)',
        testStandard: matched?.std || 'Hong Kong Concrete Institute TM3 Issue 2 (2024)',
        stpDocRef: `${matched?.stpDocCode || 'STP02-FDT-TM3'} (${matched?.stpRev || 'rev 7'})`,
        muRefCode: 'FC03-TM3-MU (250804)',
        uncertaintyStatement: 'Expanded Measurement Uncertainty U95 = ± 12 mm on resultant displacement (k = 2, ~95% confidence)',
        accredited: true,
      };
  }
}

function xmlEscape(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildCell(
  value: string | number,
  styleId = 'sCell',
  opts?: { type?: 'String' | 'Number'; formula?: string; mergeAcross?: number }
): string {
  const type = opts?.type || (typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String');
  const mergeAttr = opts?.mergeAcross && opts.mergeAcross > 0 ? ` ss:MergeAcross="${opts.mergeAcross}"` : '';
  const formulaAttr = opts?.formula ? ` ss:Formula="${xmlEscape(opts.formula)}"` : '';
  return `<Cell ss:StyleID="${styleId}"${mergeAttr}${formulaAttr}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

export interface CompletedExcelGeneratorParams {
  stpCode: string;
  reportRefNo: string;
  jobRefNo?: string;
  worksOrderNo?: string;
  batchNo?: string;
  sampleId?: string;
  testedAt: string;
  jobNo: string;
  companyProjNo: string;
  projectTitle: string;
  clientName: string;
  siteLocation: string;
  locationNote: string;
  ambientTemp: string;
  weatherNote: string;
  operatorName: string;
  approvedSignatory: string;
  pass: boolean;
  equipmentRows: HoklasWorksheetEquipmentRow[];
  measurementRows: HoklasWorksheetRow[];
  structured?: StructuredCalcPayload;
  tests?: TestMethodItem[];
  equipmentRegistry?: EquipmentItem[];
  job?: JobItem | null;
  record?: FieldCalcRecord | null;
}

const ZH_TO_EN_PHRASES: Record<string, string> = {
  '土木工程拓展署': 'CEDD',
  '建築署': 'ArchSD',
  '房屋署': 'Housing Department',
  '屋宇署': 'Buildings Department',
  '路政署': 'Highways Department',
  '渠務署': 'DSD',
  '水務署': 'WSD',
  '香港鐵路有限公司': 'MTR Corporation Ltd.',
  '新輝建築': 'Sanfield Building Contractors Ltd.',
  '金門建築': 'Gammon Construction Ltd.',
  '中國建築': 'China State Construction',
  '有利建築': 'Yau Lee Construction Co., Ltd.',
  '協興建築': 'Hip Hing Construction Co., Ltd.',
  '晴朗': 'Fine / Sunny',
  '多雲': 'Cloudy',
  '微雨': 'Light Rain',
};

/**
 * Ensures all Worksheet / Formal Report strings are 100% English (strips Chinese characters).
 */
export function toEnglishWorksheetText(input?: string | null, fallback = ''): string {
  if (!input) return fallback;
  let s = String(input);
  for (const [zh, en] of Object.entries(ZH_TO_EN_PHRASES)) {
    if (s.includes(zh)) {
      s = s.split(zh).join(en);
    }
  }
  // Remove CJK Ideographs and full-width punctuation
  s = s
    .replace(/[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || fallback;
}

/**
 * Generates the next sequential Job Reference No. for a given Job and Test Method.
 */
export function generateSequentialJobRefNo(
  jobNo: string,
  stpCode: string,
  existingRecords: FieldCalcRecord[] = [],
  dateIso?: string
): string {
  const cleanJob = toEnglishWorksheetText(jobNo, 'LT0001').toUpperCase();
  const cleanStp = toEnglishWorksheetText(stpCode, 'KD').toUpperCase();
  const ymd = (dateIso || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2, 8);
  const matchingCount = existingRecords.filter(
    (r) => r.jobNo.toUpperCase() === cleanJob && r.stpCode.toUpperCase() === cleanStp
  ).length;
  const nextSeq = String(matchingCount + 1).padStart(3, '0');
  return `${cleanJob}-${cleanStp}-${ymd}-${nextSeq}`;
}

const DEFAULT_HK_CLIENTS = [
  'CEDD',
  'ArchSD',
  'Highways Department (HyD)',
  'Water Supplies Department (WSD)',
  'Drainage Services Department (DSD)',
  'Hong Kong Housing Authority (HKHA)',
  'Buildings Department (BD)',
  'MTR Corporation Limited',
  'Airport Authority Hong Kong',
  'Gammon Construction Limited',
  'China State Construction Engineering (HK) Ltd.',
  'Hip Hing Construction Co., Ltd.',
  'Build King / Leighton Joint Venture',
  'Sanfield Building Contractors Ltd.',
  'Yau Lee Construction Co., Ltd.',
];

/**
 * Collects unique English Client names from historical calculation records, existing jobs, and standard HK clients.
 */
export function collectPreviousClientOptions(
  jobs: JobItem[] = [],
  calcRecords: FieldCalcRecord[] = []
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const addClient = (raw?: string | null) => {
    const clean = toEnglishWorksheetText(raw, '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  };
  for (const r of calcRecords) {
    addClient(r.clientName);
  }
  for (const j of jobs) {
    addClient(j.client);
  }
  for (const c of DEFAULT_HK_CLIENTS) {
    addClient(c);
  }
  return result;
}

/**
 * Generates an XML Workbook representation matching LabTech Testing Limited's official templates
 * (FST05-GTT-C939-2-260417, FST04-GTT-C940-3-261001, STP07-PLT Appendix B & C, FST06-RKT-D5731-2-260421, FST02-FDT-TM3-6-260612).
 */
export function buildCompletedExcelWorkbookXml(params: CompletedExcelGeneratorParams): {
  fileName: string;
  xmlContent: string;
  sheetNames: [string, string];
  cellMaps: Record<string, Record<string, string | number>>;
} {
  const meta = getOfficialTemplateMeta(params.stpCode, params.tests);
  const baseCode = meta.worksheetFormCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanJob = (params.jobNo || 'LT0002').trim().toUpperCase();
  const cleanRef = (params.reportRefNo || `${cleanJob}-${params.stpCode}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${baseCode}_${cleanJob}_${cleanRef}_Completed.xlsx`;
  const cellMaps = buildOfficialTemplateSheetCellMaps(params);

  const wsRows: string[] = [];
  const contractNo = params.job?.contractNo || params.companyProjNo || 'CEDD/2026/01';
  const dateOnly = (params.testedAt || '').slice(0, 10);

  // Company Header Block matching LabTech Testing Limited
  wsRows.push(
    `<Row ss:Height="26">${buildCell(`${LABTECH_COMPANY_HEADER.nameEn} (${LABTECH_COMPANY_HEADER.nameZh}) — WORKSHEET [${meta.worksheetFormCode}]`, 'sBanner', { mergeAcross: 6 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell(`${LABTECH_COMPANY_HEADER.addressLine1} | ${LABTECH_COMPANY_HEADER.contactLine}`, 'sMetaRow', { mergeAcross: 6 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="22">${buildCell(`${meta.templateTitleEn} — Test Method: ${meta.testStandard}`, 'sSubBanner', { mergeAcross: 6 })}</Row>`
  );

  // Information Supplied by Client (exact LabTech section title)
  wsRows.push(
    `<Row ss:Height="20">${buildCell('Information Supplied by Client / General Information (provided by customer)', 'sSecHdr', { mergeAcross: 6 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Client', 'sLabel')}${buildCell(params.clientName, 'sValBold', { mergeAcross: 2 })}${buildCell('Job Reference No', 'sLabel')}${buildCell(params.jobNo, 'sValBold', { mergeAcross: 1 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Project', 'sLabel')}${buildCell(params.projectTitle, 'sVal', { mergeAcross: 5 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Test Location', 'sLabel')}${buildCell(params.siteLocation, 'sVal', { mergeAcross: 2 })}${buildCell('Contract No', 'sLabel')}${buildCell(contractNo, 'sValBold', { mergeAcross: 1 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Location in Work / Sample ID', 'sLabel')}${buildCell(params.locationNote, 'sValBold', { mergeAcross: 2 })}${buildCell('Works order No', 'sLabel')}${buildCell(params.reportRefNo, 'sValBold', { mergeAcross: 1 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Ambient Temperature', 'sLabel')}${buildCell(params.ambientTemp, 'sVal', { mergeAcross: 2 })}${buildCell('Date of Testing', 'sLabel')}${buildCell(dateOnly, 'sVal', { mergeAcross: 1 })}</Row>`
  );

  // Test Equipment IDs
  wsRows.push(
    `<Row ss:Height="20">${buildCell('Test Equipment & Calibration Traceability', 'sSecHdr', { mergeAcross: 6 })}</Row>`
  );
  wsRows.push(
    `<Row ss:Height="18">${buildCell('Equipment ID', 'sTblHdr')}${buildCell('Instrument Description', 'sTblHdr', { mergeAcross: 1 })}${buildCell('Model', 'sTblHdr')}${buildCell('Serial No.', 'sTblHdr')}${buildCell('Cal Due Date', 'sTblHdr')}${buildCell('Location Status', 'sTblHdr')}</Row>`
  );
  params.equipmentRows.forEach((eq) => {
    wsRows.push(
      `<Row ss:Height="18">${buildCell(eq.code, 'sValMono')}${buildCell(eq.name, 'sVal', { mergeAcross: 1 })}${buildCell(eq.model, 'sVal')}${buildCell(eq.serial, 'sVal')}${buildCell(eq.calDue, 'sValPass')}${buildCell(eq.source === 'on_site' ? `On Site (${params.jobNo})` : 'Lab Calibrated', 'sVal')}</Row>`
    );
  });

  const st = params.structured;
  if (st?.kind === 'FC') {
    wsRows.push(
      `<Row ss:Height="20">${buildCell('Sample Information & Flow Cone Determinations (FST05-GTT-C939-2-260417)', 'sSecHdr', { mergeAcross: 6 })}</Row>`
    );
    wsRows.push(
      `<Row ss:Height="18">${buildCell('Brand of Cement', 'sLabel')}${buildCell(st.cementBrand || 'Green Island OPC', 'sVal', { mergeAcross: 2 })}${buildCell('Water / Cement Ratio', 'sLabel')}${buildCell(st.wcRatio || '0.42', 'sValBold', { mergeAcross: 1 })}</Row>`
    );
    wsRows.push(
      `<Row ss:Height="18">${buildCell('Test 1 Efflux (s)', 'sTblHdr')}${buildCell('Test 2 Efflux (s)', 'sTblHdr')}${buildCell('Average Time of Efflux (s)', 'sTblHdr')}${buildCell('Different Time of Efflux to Average (s)', 'sTblHdr')}${buildCell('Time to efflux compliance (<=35s)', 'sTblHdr')}${buildCell('Time different compliance (<=1.8s)', 'sTblHdr', { mergeAcross: 1 })}</Row>`
    );
    wsRows.push(
      `<Row ss:Height="20">${buildCell(st.t1Sec, 'sValNum', { type: 'Number' })}${buildCell(st.t2Sec, 'sValNum', { type: 'Number' })}${buildCell(Number(st.meanSec.toFixed(1)), 'sValBoldNum', { type: 'Number', formula: '=ROUND(AVERAGE(RC[-2]:RC[-1]),1)' })}${buildCell(Number(st.diffSec.toFixed(1)), 'sValBoldNum', { type: 'Number', formula: '=ABS(RC[-3]-RC[-2])' })}${buildCell(st.meanSec <= 35 ? 'Yes' : 'No', 'sValPass')}${buildCell(st.repeatOk ? 'Yes' : 'No', st.repeatOk ? 'sValPass' : 'sValWarn', { mergeAcross: 1 })}</Row>`
    );
  } else if (st?.kind === 'BL') {
    wsRows.push(
      `<Row ss:Height="20">${buildCell('Specimen No. 1 — Bleeding and Free Expansion Readings (FST04-GTT-C940-3-261001)', 'sSecHdr', { mergeAcross: 6 })}</Row>`
    );
    wsRows.push(
      `<Row ss:Height="18">${buildCell('Elapsed Time', 'sTblHdr')}${buildCell(`Initial (${st.unit})`, 'sTblHdr')}${buildCell(`Reading: Bleed Water (${st.unit})`, 'sTblHdr')}${buildCell(`Reading: Grout (${st.unit})`, 'sTblHdr')}${buildCell(`Bleed Volume (${st.unit})`, 'sTblHdr')}${buildCell('Bleeding (%)', 'sTblHdr')}${buildCell('Expansion (%)', 'sTblHdr')}</Row>`
    );
    st.intervals.forEach((r) => {
      wsRows.push(
        `<Row ss:Height="18">${buildCell(r.timeLabel, 'sValBold')}${buildCell(st.v1, 'sValNum', { type: 'Number' })}${buildCell(r.v2, 'sValNum', { type: 'Number' })}${buildCell(r.vg, 'sValNum', { type: 'Number' })}${buildCell(Number(r.bleedAmt.toFixed(2)), 'sValNum', { type: 'Number', formula: '=MAX(0,RC[-2]-RC[-1])' })}${buildCell(Number(r.bleedPct.toFixed(2)), 'sValBoldNum', { type: 'Number', formula: '=ROUND((RC[-1]/RC[-4])*100,2)' })}${buildCell(Number(r.expPct.toFixed(2)), 'sValNum', { type: 'Number', formula: '=ROUND(((RC[-3]-RC[-5])/RC[-5])*100,2)' })}</Row>`
      );
    });
  } else if (st?.kind === 'PLT') {
    wsRows.push(
      `<Row ss:Height="20">${buildCell('Appendix C — Sample Test Record Sheet (Incremental Loading Method — STP07-PLT)', 'sSecHdr', { mergeAcross: 6 })}</Row>`
    );
    wsRows.push(
      `<Row ss:Height="18">${buildCell('Cycle / Stage', 'sTblHdr')}${buildCell('Applied Pressure (kPa)', 'sTblHdr')}${buildCell('Applied Load (kN)', 'sTblHdr')}${buildCell('Dial Gauge 1 & 2 (mm)', 'sTblHdr')}${buildCell('Dial Gauge 3 & 4 (mm)', 'sTblHdr')}${buildCell('Average Reading (mm)', 'sTblHdr')}${buildCell('Cumulative Deformation (mm)', 'sTblHdr')}</Row>`
    );
    st.steps.forEach((s) => {
      wsRows.push(
        `<Row ss:Height="18">${buildCell(s.stepName, 'sValBold')}${buildCell(Number(s.pressureKpa.toFixed(1)), 'sValNum', { type: 'Number' })}${buildCell(Number(s.loadKn.toFixed(2)), 'sValNum', { type: 'Number' })}${buildCell(`${s.g1.toFixed(2)} / ${s.g2.toFixed(2)}`, 'sValMono')}${buildCell(`${s.g3.toFixed(2)} / ${s.g4.toFixed(2)}`, 'sValMono')}${buildCell(Number(((s.g1 + s.g2 + s.g3 + s.g4) / 4).toFixed(2)), 'sValNum', { type: 'Number' })}${buildCell(Number(s.meanMm.toFixed(2)), 'sValBoldNum', { type: 'Number' })}</Row>`
      );
    });
  } else {
    wsRows.push(
      `<Row ss:Height="20">${buildCell(`Test Results (${meta.worksheetFormCode})`, 'sSecHdr', { mergeAcross: 6 })}</Row>`
    );
    params.measurementRows.forEach((r, idx) => {
      wsRows.push(
        `<Row ss:Height="18">${buildCell(idx + 1, 'sValNum', { type: 'Number' })}${buildCell(r.parameter, 'sValBold', { mergeAcross: 2 })}${buildCell(r.value, 'sValMono', { mergeAcross: 3 })}</Row>`
      );
    });
  }

  wsRows.push(
    `<Row ss:Height="22">${buildCell('Tested By', 'sLabel')}${buildCell(params.operatorName, 'sValBold', { mergeAcross: 2 })}${buildCell('Checked By', 'sLabel')}${buildCell(params.approvedSignatory, 'sValBold', { mergeAcross: 1 })}</Row>`
  );

  // Sheet 2: Formal Test Report (GTT-C939-RT / GTT-C940-RT / FDT-TM3-RT / RKT-D5731-RT / PLT-RT)
  const repRows: string[] = [];
  repRows.push(
    `<Row ss:Height="28">${buildCell(`${LABTECH_COMPANY_HEADER.nameEn} (${LABTECH_COMPANY_HEADER.nameZh}) — ${LABTECH_COMPANY_HEADER.hoklasRegNo}`, 'sBanner', { mergeAcross: 5 })}</Row>`
  );
  repRows.push(
    `<Row ss:Height="18">${buildCell(`${LABTECH_COMPANY_HEADER.addressLine1} | ${LABTECH_COMPANY_HEADER.contactLine}`, 'sMetaRow', { mergeAcross: 5 })}</Row>`
  );
  repRows.push(
    `<Row ss:Height="22">${buildCell(`${meta.formalReportTitleEn} [${meta.formalReportFormCode}]`, 'sSubBanner', { mergeAcross: 5 })}</Row>`
  );
  repRows.push(
    `<Row ss:Height="18">${buildCell(`Report No.: ${params.reportRefNo}`, 'sLabel')}${buildCell(`Date of Issue: ${dateOnly}`, 'sValBold', { mergeAcross: 2 })}${buildCell('Page 1 of 1', 'sValPass', { mergeAcross: 1 })}</Row>`
  );
  params.measurementRows.forEach((r, idx) => {
    repRows.push(
      `<Row ss:Height="18">${buildCell(idx + 1, 'sValNum', { type: 'Number' })}${buildCell(r.parameter, 'sValBold', { mergeAcross: 2 })}${buildCell(r.value, 'sValMono', { mergeAcross: 2 })}</Row>`
    );
  });
  repRows.push(
    `<Row ss:Height="26">${buildCell('Tested By:', 'sLabel')}${buildCell(params.operatorName, 'sValBold', { mergeAcross: 1 })}${buildCell('Checked and Authorized to Release Results By:', 'sLabel')}${buildCell(params.approvedSignatory, 'sValBold', { mergeAcross: 1 })}</Row>`
  );

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/></Style>
  <Style ss:ID="sBanner"><Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sSubBanner"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#0369A1"/><Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sMetaRow"><Font ss:FontName="Arial" ss:Size="8.5" ss:Bold="1" ss:Color="#334155"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sSecHdr"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sTblHdr"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#1E293B"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sLabel"><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#475569"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sVal"><Font ss:FontName="Arial" ss:Size="9" ss:Color="#0F172A"/></Style>
  <Style ss:ID="sValBold"><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/></Style>
  <Style ss:ID="sValMono"><Font ss:FontName="Consolas" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/></Style>
  <Style ss:ID="sValNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Consolas" ss:Size="9" ss:Color="#0F172A"/></Style>
  <Style ss:ID="sValBoldNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Consolas" ss:Size="9" ss:Bold="1" ss:Color="#0369A1"/><Interior ss:Color="#F0F9FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sValPass"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#065F46"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>
  <Style ss:ID="sValWarn"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#9F1239"/><Interior ss:Color="#FFE4E6" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="1_Completed_Worksheet">
  <Table ss:DefaultColumnWidth="115">
   ${wsRows.join('\n   ')}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="2_Formal_Report">
  <Table ss:DefaultColumnWidth="120">
   ${repRows.join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;

  return {
    fileName,
    xmlContent,
    sheetNames: ['1_Completed_Worksheet', '2_Formal_Report'],
    cellMaps,
  };
}

/**
 * Fetches the actual LabTech .xlsx template from /templates/..., injects the calculated values
 * into the exact cells while preserving the LabTech logo (xl/media/image1.jpeg), cell borders,
 * and merged cells, and triggers a browser download of the completed .xlsx file.
 */
export function triggerCompletedExcelDownload(params: CompletedExcelGeneratorParams): string {
  const { fileName, xmlContent, cellMaps } = buildCompletedExcelWorkbookXml(params);
  const templateUrl = getTemplatePublicPath(params.stpCode);

  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    fetch(templateUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((ab) => fillXlsxTemplateBuffer(new Uint8Array(ab), cellMaps))
      .then((filledBytes) => {
        const blob = new Blob([filledBytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      })
      .catch(() => {
        // Fallback if template fetch fails
        const fallbackName = fileName.replace(/\.xlsx$/i, '.xls');
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fallbackName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      });
  }

  return fileName;
}
