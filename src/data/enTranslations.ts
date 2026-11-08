import {
  TestMethodItem,
  JobItem,
  CalendarEvent,
  EquipmentItem,
  EquipmentLoanRecord,
} from '../types';

export const DOC_TYPE_EN_MAP: Record<string, string> = {
  '受控 STP PDF': 'Controlled STP PDF',
  '空白 Worksheet PDF': 'Blank Worksheet PDF',
  '空白 Worksheet XLSX': 'Blank Worksheet XLSX',
  '空白 Worksheet XLS': 'Blank Worksheet XLS',
  'FQS08 委託單': 'FQS08 Order Form',
  'FQS09 每日紀錄': 'FQS09 Daily Record',
  '操作指南 PDF': 'Field Guide PDF',
  '同軸度核查表': 'Coaxial Check Sheet',
  '750 kPa 反力架結構驗算': '750 kPa Setup Calculation',
  'Draft STP PDF (25p)': 'Draft STP PDF (25p)',
  '參考文件 PDF': 'Reference PDF',
  '簽到表': 'Attendance Sheet',
  '考核表': 'Assessment Checklist',
};

export const STP_EN_MAP: Record<
  string,
  { stpRev?: string; keyParams: string[]; versionNotes: Record<string, { ver?: string; note: string }> }
> = {
  KD: {
    keyParams: [
      'Measure borehole verticality and diameter profiles along orthogonal X-X and Y-Y axes per HKCI TM3 Issue 2 (2024).',
      'Verify borehole standing time, drilling fluid level, and specific gravity meet specification requirements before testing.',
      'Perform centralizer zero-offset check and read ultrasonic profile charts using calibrated digital calipers (LT-DC-01/03).',
      "Convert chart readings via scale factor S (L' = r × S) and evaluate expanded measurement uncertainty U95 per FC03-TM3-MU.",
    ],
    versionNotes: {
      'STP02-FDT-TM3 rev 7': { note: 'Current controlled edition aligned with HKCI TM3 Issue 2 (2024)' },
      'STP02-FDT-TM3 rev 6': { note: 'Superseded & archived — strictly prohibited for site testing or audit' },
      'STP02-FDT-TM3 rev 5': { note: 'Superseded (Obsolete)' },
    },
  },
  SO: {
    keyParams: [
      'Fill access tubes completely with clean water free of air bubbles; verify tube depth and center-to-center spacing via dipmeter/tape.',
      'Raise transmitter and receiver probes synchronously across all profiles (AB, BC, CD, AC, BD, AD) at pulling speed ≤ 0.5 m/s.',
      'Record First Arrival Time (FAT) and relative energy attenuation waterfall logs continuously.',
      'Verify PDI CHAMP-Q analyzer (LT-CA-01) and depth encoders (LT-DE-01~04) hold valid calibration.',
    ],
    versionNotes: {
      'STP03-FDT-D6760 rev 2': { note: 'HOKLAS 298 accredited current controlled edition' },
      'STP03-FDT-D6760 rev 1': { note: 'Superseded (Obsolete)' },
    },
  },
  FC: {
    keyParams: [
      'Verify standard water efflux time using 1725 ± 5 mL clean water prior to testing; reading shall be 8.0 ± 0.2 s.',
      'Record ambient temperature and grout sample temperature using calibrated digital thermometers (LT-TM-01/02).',
      'Commence test within 1 min of sampling; two consecutive efflux readings shall differ by ≤ 1.8 s (ASTM C939 repeatability), reported to 0.1 s.',
    ],
    versionNotes: {
      'STP05-GTT-C939 rev 2': { note: 'HOKLAS 298 accredited current controlled edition' },
      'STP05-GTT-C939 rev 1': { note: 'Superseded (Obsolete)' },
    },
  },
  BL: {
    keyParams: [
      'Pour 800 ± 10 mL freshly mixed grout into a calibrated 1000 mL graduated cylinder (LT-GMC / LT-PMC), cover to prevent evaporation, and place on a vibration-free level surface.',
      'Record total volume V2 and bleed-water interface every 15 min for the first 60 min, then hourly up to 3 hours or until readings stabilize.',
      'Calculate Free Expansion (%), Bleeding (%), and decanted Final Bleeding (%).',
    ],
    versionNotes: {
      'STP04-GTT-C940 rev 2': { note: 'HOKLAS 298 current controlled edition (paired with FST04 rev 3 worksheet)' },
      'STP04-GTT-C940 rev 1': { note: 'Superseded (Obsolete)' },
    },
  },
  PO: {
    keyParams: [
      'Measure rock core dimensions D, W, and L using calibrated digital calipers (LT-DC-01/03) and verify Diametral / Axial / Block geometry ratios.',
      'Inspect 60° spherically truncated conical platens (LT-PL-01~04) for tip wear and coaxial alignment (≤ ±0.2 mm) prior to testing.',
      'Apply steady loading so failure occurs within 10–60 s; reject invalid chip-only failures and compute size-corrected Point Load Strength Index Is(50).',
    ],
    versionNotes: {
      'STP06-RKT-D5731 rev 2': { note: 'HOKLAS 298 accredited current controlled edition' },
      'STP06-RKT-D5731 rev 1': { note: 'Superseded (Obsolete)' },
    },
  },
  PLT: {
    keyParams: [
      'Assemble 750 kPa kentledge reaction system (5 blocks of 2250×750×750 mm with UC 305×305×97 steel beams), hydraulic jack, and Load Cell concentrically and plumb.',
      'Mount 4 calibrated dial gauges (0.01 mm resolution) symmetrically on an independent reference beam (supports ≥ 2.5B from plate edge) with weather/sun shelter.',
      'Execute 3-Cycle loading/unloading (1.0W → 2.0W → 3.0W) in 0.5W increments; hold each stage ≥ 10 min until settlement rate < 0.05 mm / 10 min, and maintain 3.0W peak load ≥ 72 hours.',
      'Verify maximum settlement Smax ≤ 0.15B and evaluate soil modulus of elasticity Es in accordance with BD CoP Cl. 8.2(2).',
    ],
    versionNotes: {
      'STP07-PLT Issue 0 (Draft)': { note: 'Includes Appendix A setup drawing, Appendix B 3-cycle schedule & 750 kPa structural check (Targeting 2027 Q2 HOKLAS extension)' },
    },
  },
  VC: {
    stpRev: 'In Preparation',
    keyParams: [
      'Raise the biaxial inclinometer probe from borehole bottom upward at 0.5 m intervals along guide grooves; record A0 / B0 pass followed by 180°-rotated A180 / B180 pass.',
      'Verify checksum consistency (A0 + A180 and B0 + B180) to eliminate probe zero-bias drift.',
      'Compute cumulative lateral displacements ΔX, ΔY, resultant deviation R = √(ΔX² + ΔY²), and verticality ratio 1:N (acceptance typically ≤ 1:75 or ≤ 1:100).',
    ],
    versionNotes: {
      'STP08-INC 籌備版': { ver: 'STP08-INC (In Prep)', note: 'Standard Test Procedure in preparation (Targeting 2027 Q2 HOKLAS accreditation)' },
    },
  },
};

export const JOB_EN_MAP: Record<string, { shortName: string; mapAddress: string; remark: string }> = {
  LT0002: {
    shortName: 'PolyU House of Innovation',
    mapAddress: 'HKPolyU Campus, 11 Yuk Choi Rd, Hung Hom, Kowloon',
    remark: 'Ongoing Grout Flow Cone & Bleeding tests since Oct 2026; target completion late Dec 2026.',
  },
  LT0004: {
    shortName: 'Sandy Ridge Data Cluster',
    mapAddress: 'Lot No. 953 in D.D. 89, Sha Ling Rd, Sandy Ridge, NT',
    remark: 'Point Load Strength Index testing on 17 rock core samples (PO-260004).',
  },
  LT0006: {
    shortName: 'Shek Kip Mei / Tai Hang Sai',
    mapAddress: 'Woh Chai St / Tai Hang Sai Site, Shek Kip Mei, Kowloon (NKIL 6654)',
    remark: 'Scheduled Crosshole Sonic Logging (SO) and Koden Ultrasonic Echo Sounder tests (KD).',
  },
  LT0003: {
    shortName: 'Long Bin Phase 2, Yuen Long',
    mapAddress: 'Castle Peak Rd - Ping Shan, Long Bin Public Housing Phase 2, Yuen Long, NT',
    remark: 'Public housing foundation rock core Point Load strength testing.',
  },
  LT0005: {
    shortName: 'Kwu Tung North Area 29 Complex',
    mapAddress: 'Area 29, Kwu Tung North NDA, Sheung Shui, NT',
    remark: 'ArchSD Contract SS R501 foundation rock Point Load testing.',
  },
  'SO-LCK': {
    shortName: 'Lai Chi Kok Reception Centre',
    mapAddress: '5 Butterfly Valley Rd, Lai Chi Kok, Kowloon',
    remark: 'Shui On Construction crosshole sonic logging & field operator training site.',
  },
  LT0001: {
    shortName: 'Shantung St, Mong Kok (KIL11295)',
    mapAddress: 'Junction of Shantung St & Thistle St, Mong Kok, Kowloon (KIL 11295)',
    remark: 'Completed C1BP1 Koden test and issued HOKLAS endorsed report (2026-07-08).',
  },
  'KW-STS': {
    shortName: 'Shing Tak St, Ma Tau Chung',
    mapAddress: 'Shing Tak St Redevelopment Site, Ma Tau Chung, Kowloon (KIL 11290)',
    remark: 'Completed SO-260001, FC-260001~03, and BL-260001~03 test reports.',
  },
  TLT0003: {
    shortName: 'ASD 207GK Foundation Tender',
    mapAddress: 'ArchSD Programme 207GK Sites, Hong Kong',
    remark: 'Submitted Koden & Sonic testing tender proposal; pending award.',
  },
};

export const LOAN_EN_MAP: Record<string, { siteLocation?: string; remark: string; returnRemark?: string }> = {
  'LN-261101': { remark: 'Dispatched to PolyU DGP0104 site for Grout Flow Cone testing' },
  'LN-261102': { remark: 'Graduated cylinder for Grout Bleeding & Expansion site test' },
  'LN-261029': { remark: 'EBP06 Sonic Logging (SO-260005) field test & training', returnRemark: 'Test completed; probe cables cleaned and returned to cabinet' },
  'LN-261104': { remark: 'Sandy Ridge PO-260004 (17 rock cores) Point Load testing', returnRemark: 'Testing completed; 60° conical platens verified intact and returned' },
  'LN-261031': { siteLocation: 'Depot Testing Yard', remark: 'Plate Load Test reaction frame assembly & initial training drill', returnRemark: 'Verified normal operation; returned to Office instrument room' },
};

export const EVENT_EN_MAP: Record<string, { title: string; site: string; notes: string }> = {
  'ev-261010-po': { title: 'Point Load Internal Practical Training (ASTM D5731)', site: 'Depot Testing Yard', notes: 'Completed initial Depot rock Point Load operational training and coaxial platen check.' },
  'ev-261029-so': { title: 'Sonic Logging Field Test & Training (EBP06)', site: 'Lai Chi Kok Reception Centre', notes: 'Completed SO-260005 crosshole sonic data acquisition and report preparation training.' },
  'ev-261030-fc': { title: 'PolyU DGP0104 Site Testing (FC/BL-260017~18)', site: 'PolyU Hung Hom (DGP0104)', notes: 'Completed FC-260017~18 and BL-260017~18 field grout tests and endorsed reports.' },
  'ev-261031-plt': { title: 'Plate Load Test Reaction Frame Setup & Training', site: 'Depot / Lung Tin Tsuen', notes: '750 kPa kentledge reaction frame, Load Cell, and 4 symmetrical Dial Gauges setup drill.' },
  'ev-261105-so': { title: 'Sonic Logging Practical Training (LCK)', site: 'Lai Chi Kok Reception Centre', notes: 'CHAMP-Q synchronous probe pulling speed control and anomaly waveform interpretation.' },
  'ev-261105-po': { title: 'Sandy Ridge PO-260004 Rock Testing (17 Cores)', site: 'Sandy Ridge / Lab Testing Room', notes: 'Point Load Strength Index Is(50) testing for 17 DrilTech rock core specimens.' },
  'ev-261106-fc': { title: 'Flow Cone & Bleeding Site Training', site: 'PolyU Hung Hom (DGP0104)', notes: 'Verify 1725 mL water efflux calibration (8.0±0.2s) and ASTM C940 bleeding/expansion log.' },
  'ev-261107-plt': { title: 'Plate Load Test 3-Cycle Loading Drill', site: 'Depot / Lung Tin Tsuen', notes: 'Practice 0.5W staged loading increments and 10-min settlement stability criterion (<0.05 mm).' },
  'ev-261112-so': { title: 'Sonic Logging Field Operation Training', site: 'Lai Chi Kok Reception Centre', notes: 'Full 6-profile scanning and FST03 worksheet recording per STP03-FDT-D6760 rev 2.' },
  'ev-261114-po': { title: 'Point Load Scheduled Refresher Training', site: 'Depot Testing Yard', notes: 'ASTM D5731 valid failure mode verification and digital caliper measurement check.' },
  'ev-261119-kd': { title: 'Koden Ultrasonic Borehole Training (Session 1)', site: 'Lung Tin Tsuen, Yuen Long', notes: 'Orthogonal X-X / Y-Y borehole profiling using Koden DM-604RR (LT-KM-04) per STP02 rev 7.' },
  'ev-261120-fc': { title: 'Flow Cone & Bleeding Practical Training', site: 'PolyU Hung Hom (DGP0104)', notes: 'Trainee assessment on independent completion of FST04 and FST05 field worksheets.' },
  'ev-261126-kd': { title: 'Koden Ultrasonic Borehole Training (Session 2)', site: 'Lung Tin Tsuen, Yuen Long', notes: 'Verticality offset ratio calculation and FC03-TM3-MU uncertainty evaluation.' },
  'ev-261128-plt': { title: 'Plate Load Test Instrument & Logging Training', site: 'Depot / Lung Tin Tsuen', notes: 'Verify BD Cl. 8.2(2) soil modulus Es and settlement acceptance calculation.' },
  'ev-261205-cal': { title: 'FQS38 Dec Batch External Calibration (11 Items)', site: 'HOKLAS Calibration Lab', notes: 'Dispatch instruments due Dec 18–23: LT-LV-01, LT-TM-01, LT-DC-01/03, LT-MT-06/09/10, LT-DM-01, LT-SR-10~13.' },
  'ev-261212-po': { title: 'Point Load December Refresher Training', site: 'Depot Testing Yard', notes: 'Mock HOKLAS audit Q&A and invalid specimen rejection criteria.' },
  'ev-261219-plt': { title: 'Plate Load Test Pre-Assessment Drill', site: 'Depot / Lung Tin Tsuen', notes: 'Compile full trial dataset for early 2027 HOKLAS scope extension application.' },
  'ev-261224-kd': { title: 'Koden Site Training — Tai Hang Sai', site: 'Tai Hang Sai / Shek Kip Mei (NKIL 6654)', notes: 'On-site Koden profiling aligned with NKIL 6654 bored pile schedule.' },
  'ev-270107-kd': { title: 'Koden Jan 2027 Refresher Session', site: 'Tai Hang Sai / Shek Kip Mei (NKIL 6654)', notes: 'Consolidate HKCI TM3 Issue 2 (2024) test report review workflow.' },
  'ev-270109-plt': { title: 'Plate Load & Verticality HOKLAS Internal Audit', site: 'Labtech HQ & Depot', notes: 'Targeting 2027 Q2 HOKLAS on-site assessment for Plate Load Test & Verticality Check.' },
};

export function localizeDocType(dt: string | undefined, lang: 'zh' | 'en'): string | undefined {
  if (!dt || lang !== 'en') return dt;
  return DOC_TYPE_EN_MAP[dt] || dt;
}

export function localizeTest(t: TestMethodItem, lang: 'zh' | 'en'): TestMethodItem {
  if (lang !== 'en') return t;
  const m = STP_EN_MAP[t.code];
  return {
    ...t,
    stpRev: m?.stpRev || (t.stpRev === '籌備中' ? 'In Preparation' : t.stpRev),
    keyParams: m?.keyParams || t.keyParams,
    qualifiedOperators: t.qualifiedOperators?.map((op) =>
      op.replace('[培訓中]', '[In Training]').replace('[籌備中]', '[In Prep]')
    ),
    versions: (t.versions || []).map((v) => {
      const vm = m?.versionNotes[v.ver];
      const fallbackNote = v.note === '已作廢' ? 'Superseded (Obsolete)' : v.note;
      return { ...v, ver: vm?.ver || v.ver, note: vm?.note || fallbackNote };
    }),
    stpFiles: t.stpFiles?.map((f) => ({ ...f, docType: localizeDocType(f.docType, 'en') })),
  };
}

export function localizeJob(j: JobItem, lang: 'zh' | 'en'): JobItem {
  if (lang !== 'en') return j;
  const m = JOB_EN_MAP[j.no];
  return m ? { ...j, shortName: m.shortName, mapAddress: m.mapAddress, remark: m.remark } : j;
}

export function localizeLoan(ln: EquipmentLoanRecord, lang: 'zh' | 'en'): EquipmentLoanRecord {
  if (lang !== 'en') return ln;
  const m = LOAN_EN_MAP[ln.id];
  if (!m) return ln;
  return {
    ...ln,
    siteLocation: m.siteLocation || ln.siteLocation,
    remark: m.remark || ln.remark,
    returnRemark: m.returnRemark || ln.returnRemark,
  };
}

export function localizeEquipment(eq: EquipmentItem, lang: 'zh' | 'en'): EquipmentItem {
  if (lang !== 'en') return eq;
  const lnMap = eq.currentLoan ? LOAN_EN_MAP[eq.currentLoan.loanId] : undefined;
  return {
    ...eq,
    loc: eq.loc === '維修中 / 待檢查' ? 'Under Maintenance / Check' : eq.loc === 'Depot 試驗場' ? 'Depot Testing Yard' : eq.loc,
    remark: eq.remark === 'FCC01 每月內檢項目' ? 'FCC01 Monthly Verification Item' : eq.remark,
    currentLoan: eq.currentLoan
      ? {
          ...eq.currentLoan,
          siteLocation: lnMap?.siteLocation || eq.currentLoan.siteLocation,
          remark: lnMap?.remark || eq.currentLoan.remark,
        }
      : null,
  };
}

export function localizeEvent(ev: CalendarEvent, lang: 'zh' | 'en'): CalendarEvent {
  if (lang !== 'en') return ev;
  const m = EVENT_EN_MAP[ev.id];
  return m
    ? {
        ...ev,
        title: m.title,
        site: m.site,
        notes: m.notes,
        attachments: ev.attachments?.map((a) => ({ ...a, docType: localizeDocType(a.docType, 'en') })),
      }
    : ev;
}
