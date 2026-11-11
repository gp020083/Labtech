import { EquipmentItem, EquipmentLoanRecord } from '../types';

interface RawEqRow {
  code: string; name: string; model: string; serial: string; maker: string;
  tests: string; req: string; last: string; due: string; certDue?: string;
  certFile?: string; certUrl?: string; monthlyCheck?: boolean;
}

const C = '/server-docs/calcerts/';
const PMC_URL = `${C}CalCert_Plastic_Measuring_Cylinder_LT-PMC-01_to_12_270907.pdf`;
const PMC_FILE = 'Calibration Certificate - Plastic Measuring Cylinder_LT-PMC-01 to 12_270907.pdf';
const DE_URL = `${C}FQS39_CRITERIA_OF_EXTERNAL_CALIBRATION_230417_250729_LT-DE-01_to_04.pdf`;
const DE_FILE = 'FQS39 CRITERIA OF EXTERNAL CALIBRATION_LT-DE-01 to 04.pdf';

const RAW_EQ_PART1: RawEqRow[] = [
  { code: 'LT-KM-04', name: 'Ultrasonic Echo Sounder', model: 'DM-604RR', serial: '60480363', maker: 'Koden Electronics Co. Ltd.', tests: 'KD', req: 'E', last: '2026-05-14', due: '2027-05-13', certDue: '2027-05-13', certFile: 'Calibration Certificate - Koden Ultrasonic Echo Sounder_LT-KM-04_270513.pdf', certUrl: `${C}CalCert_Koden_Ultrasonic_Echo_Sounder_LT-KM-04_270513.pdf` },
  { code: 'LT-CA-01', name: 'Cross-hole Analyzer', model: 'CHAMP-Q', serial: '8251 XC', maker: 'Pile Dynamics, Inc.', tests: 'SO', req: 'E', last: '2026-09-21', due: '2027-09-20', certDue: '2027-09-20', certFile: 'Calibration Certificate - Cross-hole Analyzer_LT-CA-01_270920.pdf', certUrl: `${C}CalCert_Cross-hole_Analyzer_LT-CA-01_270920.pdf` },
  { code: 'LT-DE-01', name: 'Depth Encoder for PDI CHAMP-Q', model: 'H20DB-37-SS-12ABC', serial: 'WW48929', maker: 'Pile Dynamics, Inc.', tests: 'SO', req: 'E', last: '2025-07-25', due: '2026-07-24', certDue: '2026-07-24', certFile: DE_FILE, certUrl: DE_URL },
  { code: 'LT-DE-02', name: 'Depth Encoder for PDI CHAMP-Q', model: 'H20DB-37-SS-12ABC', serial: 'WW48930', maker: 'Pile Dynamics, Inc.', tests: 'SO', req: 'E', last: '2025-07-25', due: '2026-07-24', certDue: '2026-07-24', certFile: DE_FILE, certUrl: DE_URL },
  { code: 'LT-DE-03', name: 'Depth Encoder for PDI CHAMP-Q', model: 'H20DB-37-SS-12ABC', serial: 'WW48931', maker: 'Pile Dynamics, Inc.', tests: 'SO', req: 'E', last: '2025-07-25', due: '2026-07-24', certDue: '2026-07-24', certFile: DE_FILE, certUrl: DE_URL },
  { code: 'LT-DE-04', name: 'Depth Encoder for PDI CHAMP-Q', model: 'H20DB-37-SS-12ABC', serial: 'WW48932', maker: 'Pile Dynamics, Inc.', tests: 'SO', req: 'E', last: '2025-07-25', due: '2026-07-24', certDue: '2026-07-24', certFile: DE_FILE, certUrl: DE_URL },
  { code: 'LT-FC-01', name: 'Flow Cone', model: 'ASTM C939', serial: 'NA', maker: 'Standard', tests: 'FC', req: 'E', last: '2026-05-12', due: '2027-05-11', certDue: '2027-05-11', certFile: 'Calibration Certificate - Flow Cone_LT-FC-01_270511.pdf', certUrl: `${C}CalCert_Flow_Cone_LT-FC-01_270511.pdf` },
  { code: 'LT-FC-02', name: 'Flow Cone', model: 'ASTM C939', serial: 'NA', maker: 'Standard', tests: 'FC', req: 'E', last: '2026-07-23', due: '2027-07-22', certDue: '2027-07-22', certFile: 'Calibration Certificate - Flow Cone_LT-FC-02_270722.pdf', certUrl: `${C}CalCert_Flow_Cone_LT-FC-02_270722.pdf` },
  { code: 'LT-TD-01', name: 'Stop Watch', model: 'HS-3', serial: 'NA', maker: 'Casio', tests: 'FC + BL + SO + PO', req: 'E', last: '2026-03-23', due: '2027-03-22', certDue: '2027-03-22', certFile: 'Calibration Certificate - Stop watch_LT-TD-01_270322.pdf', certUrl: `${C}CalCert_Stop_watch_LT-TD-01_270322.pdf` },
  { code: 'LT-PO-02', name: 'Point Load Tester', model: 'ASTM D5731', serial: 'NA', maker: 'Standard', tests: 'PO', req: 'E', last: '2026-02-06', due: '2027-02-05', certDue: '2027-02-05', certFile: 'Calibration Certificate - Point Load Tester_LT-PO-02_270205.pdf', certUrl: `${C}CalCert_Point_Load_Tester_LT-PO-02_270205.pdf` },
  { code: 'LT-LC-01', name: 'Compression Load Cell with Digital Readout', model: 'CWH-T5', serial: 'D2407004', maker: 'Dacell Co., Ltd.', tests: 'PO + PLT', req: 'E', last: '2026-01-29', due: '2027-01-28', certDue: '2027-01-28', certFile: 'Calibration Certificate - Load Cell_LT-LC-01_270128.pdf', certUrl: `${C}CalCert_Load_Cell_LT-LC-01_270128.pdf` },
  { code: 'LT-DG-01', name: 'Dial Gauge', model: '0.01mm', serial: '25S00276', maker: 'Aiceyi', tests: 'PO + PLT', req: 'E', last: '2026-02-02', due: '2027-02-01', certDue: '2027-02-01', certFile: 'Calibration Certificate - Dial Gauge_LT-DG-01_270201.pdf', certUrl: `${C}CalCert_Dial_Gauge_LT-DG-01_270201.pdf` },
  { code: 'LT-PL-01', name: 'Conical Platens', model: '60° Cone', serial: 'NA', maker: 'Standard', tests: 'PO', req: 'E', last: '2026-05-27', due: '2027-05-26', certDue: '2027-05-26', certFile: 'Calibration Certificate - Conical Platen_LT-PL-01 to 02_270526.pdf', certUrl: `${C}CalCert_Conical_Platen_LT-PL-01_to_02_270526.pdf` },
  { code: 'LT-PL-02', name: 'Conical Platens', model: '60° Cone', serial: 'NA', maker: 'Standard', tests: 'PO', req: 'E', last: '2026-05-27', due: '2027-05-26', certDue: '2027-05-26', certFile: 'Calibration Certificate - Conical Platen_LT-PL-01 to 02_270526.pdf', certUrl: `${C}CalCert_Conical_Platen_LT-PL-01_to_02_270526.pdf` },
  { code: 'LT-PL-03', name: 'Conical Platens', model: '60° Cone', serial: 'NA', maker: 'Standard', tests: 'PO', req: 'E', last: '2026-02-06', due: '2027-02-05', certDue: '2027-02-05', certFile: 'Calibration Certificate - Conical Platen_LT-PL-01 to 04_270205.pdf', certUrl: `${C}CalCert_Conical_Platen_LT-PL-01_to_04_270205.pdf` },
  { code: 'LT-PL-04', name: 'Conical Platens', model: '60° Cone', serial: 'NA', maker: 'Standard', tests: 'PO', req: 'E', last: '2026-02-06', due: '2027-02-05', certDue: '2027-02-05', certFile: 'Calibration Certificate - Conical Platen_LT-PL-01 to 04_270205.pdf', certUrl: `${C}CalCert_Conical_Platen_LT-PL-01_to_04_270205.pdf` },
  { code: 'LT-MT-06', name: 'Measuring Tape (100m)', model: '100m', serial: 'CAL-194412', maker: 'Sunlon', tests: 'KD + SO', req: 'E', last: '2025-12-23', due: '2026-12-22', certDue: '2026-12-22', certFile: 'Calibration Certificate - Measuring Tape 100m_LT-MT-06_261222.pdf', certUrl: `${C}CalCert_Measuring_Tape_100m_LT-MT-06_261222.pdf`, monthlyCheck: true },
  { code: 'LT-MT-09', name: 'Measuring Tape (5m)', model: 'RA-519', serial: 'NA', maker: 'Rong Shen', tests: 'KD + SO', req: 'E', last: '2025-12-23', due: '2026-12-22', certDue: '2026-12-22', certFile: 'Calibration Certificate - Measuring Tape 5m_LT-MT-09_261222.pdf', certUrl: `${C}CalCert_Measuring_Tape_5m_LT-MT-09_261222.pdf`, monthlyCheck: true },
  { code: 'LT-MT-10', name: 'Measuring Tape (5m)', model: 'RA-519', serial: 'NA', maker: 'Rong Shen', tests: 'KD + SO', req: 'E', last: '2025-12-23', due: '2026-12-22', certDue: '2026-12-22', certFile: 'Calibration Certificate - Measuring Tape 5m_LT-MT-10_261222.pdf', certUrl: `${C}CalCert_Measuring_Tape_5m_LT-MT-10_261222.pdf`, monthlyCheck: true },
  { code: 'LT-DM-01', name: 'Dipmeter', model: 'Water Level', serial: '09312', maker: 'Yamayo', tests: 'KD + SO', req: 'E', last: '2025-12-23', due: '2026-12-22', certDue: '2026-12-22', certFile: 'Calibration Certificate - Dipmeter_LT-DM-01_261222.pdf', certUrl: `${C}CalCert_Dipmeter_LT-DM-01_261222.pdf` },
  { code: 'LT-LV-01', name: 'Spirit Level', model: '779-40', serial: 'NA', maker: 'KAPRO', tests: 'KD + SO + BL + FC', req: 'E', last: '2025-12-19', due: '2026-12-18', certDue: '2026-12-18', certFile: 'Calibration Certificate - Spirit Level_LT-LV-01_261218.pdf', certUrl: `${C}CalCert_Spirit_Level_LT-LV-01_261218.pdf` },
  { code: 'LT-TM-01', name: 'Digital Thermometer', model: 'Probe', serial: 'NA', maker: 'Standard', tests: 'KD + BL + FC', req: 'E', last: '2025-12-19', due: '2026-12-18', certDue: '2026-12-18', certFile: 'Calibration Certificate - Digital Thermometer_LT-TM-01_261218.pdf', certUrl: `${C}CalCert_Digital_Thermometer_LT-TM-01_261218.pdf` },
  { code: 'LT-TM-02', name: 'Digital Thermometer', model: 'O-900', serial: 'NA', maker: 'Dretec', tests: 'KD + BL + FC', req: 'E', last: '2026-03-20', due: '2027-03-19', certDue: '2027-03-19', certFile: 'Calibration Certificate - Digital Thermometer_LT-TM-02_270319.pdf', certUrl: `${C}CalCert_Digital_Thermometer_LT-TM-02_270319.pdf` },
  { code: 'LT-MM-01', name: 'Thermometer (Max & Min)', model: 'Max/Min', serial: 'NA', maker: 'Lab Standard', tests: 'BL + FC', req: 'E', last: '2026-05-14', due: '2027-05-13', certDue: '2027-05-13', certFile: 'Calibration Certificate - Thermometer (Max & Min)_LT-MM-01_270513.pdf', certUrl: `${C}CalCert_Thermometer_(Max_and_Min)_LT-MM-01_270513.pdf` },
];

const RAW_EQ_PART2: RawEqRow[] = [
  { code: 'LT-DC-01', name: 'Digital Caliper', model: '150mm', serial: 'NA', maker: 'Standard', tests: 'KD + PO', req: 'E', last: '2025-12-22', due: '2026-12-21', certDue: '2026-12-21', certFile: 'Calibration Certificate - Digital Caliper_LT-DC-01_261221.pdf', certUrl: `${C}CalCert_Digital_Caliper_LT-DC-01_261221.pdf`, monthlyCheck: true },
  { code: 'LT-DC-03', name: 'Digital Caliper', model: '150mm', serial: 'NA', maker: 'Standard', tests: 'KD + PO', req: 'E', last: '2025-12-22', due: '2026-12-21', certDue: '2026-12-21', certFile: 'Calibration Certificate - Digital Caliper_LT-DC-03_261221.pdf', certUrl: `${C}CalCert_Digital_Caliper_LT-DC-03_261221.pdf`, monthlyCheck: true },
  { code: 'LT-SR-10', name: 'Steel Rule (200mm)', model: 'TH-5021', serial: 'NA', maker: 'THD', tests: 'KD + SO + PLT', req: 'E', last: '2025-12-24', due: '2026-12-23', certDue: '2026-12-23', certFile: 'Calibration Certificate - Steel Ruler 200mm_LT-SR-10_261223.pdf', certUrl: `${C}CalCert_Steel_Ruler_200mm_LT-SR-10_261223.pdf`, monthlyCheck: true },
  { code: 'LT-SR-11', name: 'Steel Rule (200mm)', model: 'TH-5021', serial: 'NA', maker: 'THD', tests: 'KD + SO + PLT', req: 'E', last: '2025-12-24', due: '2026-12-23', certDue: '2026-12-23', certFile: 'Calibration Certificate - Steel Ruler 200mm_LT-SR-11_261223.pdf', certUrl: `${C}CalCert_Steel_Ruler_200mm_LT-SR-11_261223.pdf`, monthlyCheck: true },
  { code: 'LT-SR-12', name: 'Steel Rule (150mm)', model: 'TH-5020', serial: 'NA', maker: 'THD', tests: 'KD + SO + BL', req: 'E', last: '2025-12-24', due: '2026-12-23', certDue: '2026-12-23', certFile: 'Calibration Certificate - Steel Ruler 150mm_LT-SR-12_261223.pdf', certUrl: `${C}CalCert_Steel_Ruler_150mm_LT-SR-12_261223.pdf`, monthlyCheck: true },
  { code: 'LT-SR-13', name: 'Steel Rule (150mm)', model: 'TH-5020', serial: 'NA', maker: 'THD', tests: 'KD + SO + BL', req: 'E', last: '2025-12-24', due: '2026-12-23', certDue: '2026-12-23', certFile: 'Calibration Certificate - Steel Ruler 150mm_LT-SR-13_261223.pdf', certUrl: `${C}CalCert_Steel_Ruler_150mm_LT-SR-13_261223.pdf`, monthlyCheck: true },
  { code: 'LT-CP-01', name: 'Compass', model: 'Magnetic', serial: 'NA', maker: 'Smartnax', tests: 'KD + SO', req: 'Internal Check', last: '2026-04-01', due: 'N/A', monthlyCheck: true },
  { code: 'LT-CP-02', name: 'Compass', model: 'Magnetic', serial: 'NA', maker: 'Smartnax', tests: 'KD + SO', req: 'Internal Check', last: '2026-04-01', due: 'N/A', monthlyCheck: true },
  { code: 'LT-CP-03', name: 'Compass', model: 'Magnetic', serial: 'NA', maker: 'Smartnax', tests: 'KD + SO', req: 'Internal Check', last: '2026-04-01', due: 'N/A', monthlyCheck: true },
  { code: 'LT-GMC-01', name: 'Glass Measuring Cylinder', model: '1000ml', serial: 'NA', maker: 'Pyrex', tests: 'BL + FC', req: 'E', last: '2026-03-23', due: '2027-03-22', certDue: '2027-03-22', certFile: 'Calibration Certificate - Glass Measuring Cylinder_LT-GMC-01_270322.pdf', certUrl: `${C}CalCert_Glass_Measuring_Cylinder_LT-GMC-01_270322.pdf` },
  { code: 'LT-GMC-02', name: 'Glass Measuring Cylinder', model: '1000ml', serial: 'NA', maker: 'Pyrex', tests: 'BL + FC', req: 'E', last: '2026-03-23', due: '2027-03-22', certDue: '2027-03-22', certFile: 'Calibration Certificate - Glass Measuring Cylinder_LT-GMC-02_270322.pdf', certUrl: `${C}CalCert_Glass_Measuring_Cylinder_LT-GMC-02_270322.pdf` },
  { code: 'LT-GMC-03', name: 'Glass Measuring Cylinder', model: '1000ml', serial: 'NA', maker: 'Pyrex', tests: 'BL', req: 'E', last: '2026-03-23', due: '2027-03-22', certDue: '2027-03-22', certFile: 'Calibration Certificate - Glass Measuring Cylinder_LT-GMC-03_270322.pdf', certUrl: `${C}CalCert_Glass_Measuring_Cylinder_LT-GMC-03_270322.pdf` },
  ...(['04', '05', '06'] as const).map((n): RawEqRow => ({ code: `LT-GMC-${n}`, name: 'Glass Measuring Cylinder (Spare)', model: '1000ml', serial: 'NA', maker: 'Pyrex', tests: 'BL', req: 'N', last: '2025-01-03', due: 'NA' })),
  ...Array.from({ length: 12 }, (_, i): RawEqRow => {
    const idx = String(i + 1).padStart(2, '0');
    return { code: `LT-PMC-${idx}`, name: 'Plastic Measuring Cylinder', model: '1000ml', serial: `CAL-${266893 + i}`, maker: 'Sunnex', tests: 'BL', req: 'E', last: '2026-09-08', due: '2027-09-07', certDue: '2027-09-07', certFile: PMC_FILE, certUrl: PMC_URL };
  }),
];

export function buildRealEquipment(loans: EquipmentLoanRecord[]): EquipmentItem[] {
  const activeLoans = new Map(loans.filter((l) => !l.returnedAt).map((l) => [l.equipmentCode, l]));
  return [...RAW_EQ_PART1, ...RAW_EQ_PART2].map((r) => {
    const loan = activeLoans.get(r.code);
    const tags = r.tests.split('+').map((s) => s.trim()).filter(Boolean);
    return {
      code: r.code, name: r.name, model: r.model, serial: r.serial, maker: r.maker,
      inUse: 'Y', tests: tags.join(' + '), testTags: tags, req: r.req, last: r.last, due: r.due,
      store: 'Office', loc: loan ? loan.siteLocation : 'Office', remark: r.monthlyCheck ? 'FCC01 每月內檢項目' : '',
      certDue: r.certDue, certFile: r.certFile, certUrl: r.certUrl, monthlyCheck: r.monthlyCheck,
      calCerts: r.certFile && r.certUrl ? [{
        id: `cert-srv-${r.code}`, fileName: r.certFile, fileSize: 'PDF', dueDate: r.certDue, eqCode: r.code,
        calLab: 'HOKLAS Accredited Lab', uploadedBy: 'Chu Lap Man, Raymond', uploadedAt: `${r.last} 10:00`,
        serverPath: `\\\\ckw\\CKWData\\LTData\\New Structure\\10 Calibration Database\\10.1 Calibration Certificate\\${r.certFile}`,
        dataUrl: r.certUrl,
      }] : [],
      currentLoan: loan ? {
        loanId: loan.id, borrowerName: loan.borrowerName, borrowerStaffId: loan.borrowerStaffId,
        jobNo: loan.jobNo, siteLocation: loan.siteLocation, checkoutAt: loan.checkoutAt,
        expectedReturn: loan.expectedReturn, remark: loan.remark,
      } : null,
    };
  });
}
