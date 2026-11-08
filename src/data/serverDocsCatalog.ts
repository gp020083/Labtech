export interface ServerQualityDoc {
  id: string;
  code: string;
  category: 'order_form' | 'daily_record' | 'cal_qc' | 'mu' | 'hoklas_org';
  testCode?: string;
  titleZh: string;
  titleEn: string;
  revDate: string;
  format: 'PDF' | 'XLSX' | 'XLS' | 'DOC';
  url: string;
}

export const SERVER_QUALITY_DOCS: ServerQualityDoc[] = [
  // HOKLAS 298, Competence & Organization
  { id: 'qd-hoklas', code: 'HOKLAS 298-6', category: 'hoklas_org', titleZh: 'HOKLAS 298 認可範圍證書 (Scope of Accreditation)', titleEn: 'HOKLAS 298 Scope of Accreditation (Issue 24 Jul 2026)', revDate: '2026-07-24', format: 'PDF', url: '/server-docs/forms/HOKLAS298_Scope_of_Accreditation_260727.pdf' },
  { id: 'qd-fqs49', code: 'FQS49', category: 'hoklas_org', titleZh: '合資格操作員及授權簽署人名單 (List of Qualified Operator)', titleEn: 'FQS49 List of Qualified Operators & Approved Signatories', revDate: '2026-03-23', format: 'PDF', url: '/server-docs/forms/FQS49_List_of_Qualified_Operator_260323.pdf' },
  { id: 'qd-mwi01', code: 'MWI01 rev 4', category: 'hoklas_org', titleZh: '職責說明及人員能力要求 (Job Descriptions & Competence)', titleEn: 'MWI01 Job Descriptions and Competence Requirements rev 4', revDate: '2026-02-06', format: 'PDF', url: '/server-docs/forms/MWI01_Job_Descriptions_Competence_rev4_260206.pdf' },
  { id: 'qd-ochart', code: 'O-Chart Rev.0', category: 'hoklas_org', titleZh: 'Labtech 部門組織架構圖 (Organization Chart)', titleEn: 'Labtech Organization Chart Rev.0', revDate: '2026-04-01', format: 'PDF', url: '/server-docs/forms/Labtech_Organization_Chart_Rev0.pdf' },
  // FQS08 Test Order Forms (Dedicated Sub-Section 3)
  { id: 'qd-fqs08-kd', code: 'FQS08-FDT-TM3', category: 'order_form', testCode: 'KD', titleZh: 'Koden 超聲波測試委託單範本 (Test Order Form)', titleEn: 'FQS08 Test Order Form — Ultrasonic Echo Sounder (KD)', revDate: '2026-04-17', format: 'DOC', url: '/server-docs/forms/FQS08-FDT-TM3_Test_Order_Form_260417.doc' },
  { id: 'qd-fqs08-so', code: 'FQS08-FDT-D6760', category: 'order_form', testCode: 'SO', titleZh: 'Sonic 跨孔超聲波測試委託單範本 (Test Order Form)', titleEn: 'FQS08 Test Order Form — Crosshole Sonic Logging (SO)', revDate: '2026-04-17', format: 'PDF', url: '/server-docs/forms/FQS08-FDT-D6760_Test_Order_Form_260417.pdf' },
  { id: 'qd-fqs08-gt', code: 'FQS08-GTT-C939&940', category: 'order_form', testCode: 'FC+BL', titleZh: 'Flow Cone 及 Bleeding 水泥漿測試委託單範本 (Test Order Form)', titleEn: 'FQS08 Test Order Form — Grout Flow Cone & Bleeding', revDate: '2026-04-17', format: 'DOC', url: '/server-docs/forms/FQS08-GTT-C939_940_Test_Order_Form_260417.doc' },
  { id: 'qd-fqs08-po', code: 'FQS08-RKT-D5731', category: 'order_form', testCode: 'PO', titleZh: 'Point Load 岩石點荷載測試委託單範本 (Test Order Form)', titleEn: 'FQS08 Test Order Form — Point Load Strength Index (PO)', revDate: '2026-10-21', format: 'PDF', url: '/server-docs/forms/FQS08-RKT-D5731_Test_Order_Form_240715.pdf' },
  // FQS09 Daily Site Records (Dedicated Sub-Section 4)
  { id: 'qd-fqs09-kd', code: 'FQS09-FDT-TM3', category: 'daily_record', testCode: 'KD', titleZh: 'Koden 現場每日測試紀錄表 (Daily Site Record)', titleEn: 'FQS09 Daily Site Record — Ultrasonic Echo Sounder (KD)', revDate: '2026-04-17', format: 'DOC', url: '/server-docs/forms/FQS09-FDT-TM3_Daily_Record_260417.doc' },
  { id: 'qd-fqs09-so', code: 'FQS09-FDT-D6760', category: 'daily_record', testCode: 'SO', titleZh: 'Sonic 現場每日測試紀錄表 (Daily Site Record)', titleEn: 'FQS09 Daily Site Record — Crosshole Sonic Logging (SO)', revDate: '2026-05-02', format: 'PDF', url: '/server-docs/forms/FQS09-FDT-D6760_Daily_Record_260502.pdf' },
  { id: 'qd-fqs09-bl', code: 'FQS09-GTT-C940', category: 'daily_record', testCode: 'BL', titleZh: 'Grout Bleeding 現場每日測試紀錄表 (Daily Site Record)', titleEn: 'FQS09 Daily Site Record — Expansion & Bleeding (BL)', revDate: '2026-10-01', format: 'DOC', url: '/server-docs/forms/FQS09-GTT-C940_Daily_Record_261001.doc' },
  { id: 'qd-fqs09-fc', code: 'FQS09-GTT-C939', category: 'daily_record', testCode: 'FC', titleZh: 'Flow Cone 現場每日測試紀錄表 (Daily Site Record)', titleEn: 'FQS09 Daily Site Record — Flow of Grout (FC)', revDate: '2026-10-01', format: 'DOC', url: '/server-docs/forms/FQS09-GTT-C939_Daily_Record_261001.doc' },
  { id: 'qd-fqs09-po', code: 'FQS09-RKT-D5731', category: 'daily_record', testCode: 'PO', titleZh: 'Point Load 每日測試紀錄表 (Daily Site Record)', titleEn: 'FQS09 Daily Record — Point Load Strength Index (PO)', revDate: '2026-04-17', format: 'DOC', url: '/server-docs/forms/FQS09-RKT-D5731_Daily_Record_260417.doc' },
  // Calibration, Monthly Check & Equipment Loan Forms
  { id: 'qd-fqs38-pdf', code: 'FQS38-3', category: 'cal_qc', titleZh: '2026–2027 儀器外校及每月內檢時間表 (Calibration Schedule)', titleEn: 'FQS38 Calibration & Verification Check Schedule 2026–2027', revDate: '2026-05-20', format: 'PDF', url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf' },
  { id: 'qd-fcc01-pdf', code: 'FCC01 (2026)', category: 'cal_qc', titleZh: '2026 度尺、卷尺、卡尺及指南針每月內檢紀錄 (Monthly Check)', titleEn: 'FCC01 Monthly Check Record of Tape, Ruler & Compass (2026)', revDate: '2026-05-01', format: 'PDF', url: '/server-docs/forms/FCC01_Monthly_Check_Record_2026.pdf' },
  { id: 'qd-fcc01-xls', code: 'FCC01 Template', category: 'cal_qc', titleZh: '每月內檢紀錄空白表格範本 (Monthly Check Template)', titleEn: 'FCC01 Monthly Check Blank Excel Template', revDate: '2026-01-01', format: 'XLSX', url: '/server-docs/forms/FCC01_Monthly_Check_Template.xlsx' },
  { id: 'qd-fqs50', code: 'FQS50', category: 'cal_qc', titleZh: '儀器借出及交還登記表範本 (Record of Loan of Equipment)', titleEn: 'FQS50 Record of Loan of Equipment Template', revDate: '2023-02-01', format: 'DOC', url: '/server-docs/forms/FQS50_Loan_of_Equipment_template.doc' },
  { id: 'qd-fqs39', code: 'FQS39', category: 'cal_qc', titleZh: '外送校準驗收準則表範本 (Criteria of External Calibration)', titleEn: 'FQS39 Criteria of External Calibration Template', revDate: '2023-04-17', format: 'DOC', url: '/server-docs/forms/FQS39_Criteria_External_Calibration_template.doc' },
  { id: 'qd-coax', code: 'FSTxx-D5731', category: 'cal_qc', testCode: 'PO', titleZh: 'Point Load 圓錐壓頭同軸度核查表 (Coaxial Check)', titleEn: 'Point Load Conical Platen Coaxial Verification Check', revDate: '2026-07-20', format: 'XLS', url: '/server-docs/worksheets/FSTxx-RKT-D5731-0-260720_Coaxial_check.xls' },
  // Measurement Uncertainty (MU)
  { id: 'qd-mu-kd', code: 'FC03-TM3-MU', category: 'mu', testCode: 'KD', titleZh: 'Koden 測量不確定度評估表 (ISO Guide 98-3 MU)', titleEn: 'FC03-TM3-MU Measurement Uncertainty Evaluation — Koden', revDate: '2025-08-04', format: 'XLSX', url: '/server-docs/forms/FC03-TM3-MU_Koden_Uncertainty_template.xlsx' },
  { id: 'qd-mu-fc', code: 'MU-GTT-C939-1', category: 'mu', testCode: 'FC', titleZh: 'Flow Cone 測量不確定度評估表 (ASTM C939 MU)', titleEn: 'MU-GTT-C939 Measurement Uncertainty — Flow Cone', revDate: '2026-04-21', format: 'XLSX', url: '/server-docs/forms/MU-GTT-C939_FlowCone_Uncertainty_260421.xlsx' },
  { id: 'qd-mu-bl', code: 'MU-GTT-C940-1', category: 'mu', testCode: 'BL', titleZh: 'Grout Bleeding 測量不確定度評估表 (ASTM C940 MU)', titleEn: 'MU-GTT-C940 Measurement Uncertainty — Bleeding & Expansion', revDate: '2026-04-21', format: 'XLSX', url: '/server-docs/forms/MU-GTT-C940_Bleeding_Uncertainty_260421.xlsx' },
  { id: 'qd-mu-po', code: 'MU-RKT-D5731-1', category: 'mu', testCode: 'PO', titleZh: 'Point Load 測量不確定度評估表 (ASTM D5731 MU)', titleEn: 'MU-RKT-D5731 Measurement Uncertainty — Point Load Is(50)', revDate: '2026-04-21', format: 'XLSX', url: '/server-docs/forms/MU-RKT-D5731_PointLoad_Uncertainty_260421.xlsx' },
  // Job References (Grouped under HOKLAS / Org / Competence & Job References)
  { id: 'qd-ref-kd', code: 'JobRef-KD', category: 'hoklas_org', testCode: 'KD', titleZh: 'Koden Test 工程實績履歷 (Job Reference)', titleEn: 'Labtech Job Reference — Koden Test (Oct 2026)', revDate: '2026-10-06', format: 'PDF', url: '/server-docs/forms/Labtech_Job_Reference_Koden_261006.pdf' },
  { id: 'qd-ref-so', code: 'JobRef-SO', category: 'hoklas_org', testCode: 'SO', titleZh: 'Sonic Logging 工程實績履歷 (Job Reference)', titleEn: 'Labtech Job Reference — Sonic Logging Test (Oct 2026)', revDate: '2026-10-06', format: 'PDF', url: '/server-docs/forms/Labtech_Job_Reference_Sonic_261006.pdf' },
  { id: 'qd-ref-gt', code: 'JobRef-FC&BL', category: 'hoklas_org', testCode: 'FC+BL', titleZh: 'Flow Cone & Bleeding 工程實績履歷 (Job Reference)', titleEn: 'Labtech Job Reference — Flow Cone & Bleeding Test', revDate: '2026-10-06', format: 'PDF', url: '/server-docs/forms/Labtech_Job_Reference_FlowCone_Bleeding.pdf' },
];

export interface PersonnelMatrixRow {
  code: string;
  testName: string;
  standard: string;
  hoklasStatus: 'Accredited' | 'Target 2027 Q2';
  signatories: string[];
  qualifiedOperators: string[];
  trainees: string[];
}

export const FQS49_MATRIX: PersonnelMatrixRow[] = [
  { code: 'KD', testName: 'Ultrasonic Echo Sounder (Koden)', standard: 'HKCI TM3 Issue 2 (2024)', hoklasStatus: 'Accredited', signatories: ['Lam Hoi Fan, James (JL)', 'Chu Lap Man, Raymond (RC)', 'Tang Man Fu (MFT)'], qualifiedOperators: ['Lin Chung Kit (CKL)', 'Shih Chak Lung, Ben (BS)', 'Li Chun Yin, Brian (BL)', 'Cheung Dickson (DC)'], trainees: [] },
  { code: 'SO', testName: 'Crosshole Sonic Logging', standard: 'ASTM D6760-16', hoklasStatus: 'Accredited', signatories: ['Lam Hoi Fan, James (JL)', 'Yue Wai Chun (WCY)', 'Tang Man Fu (MFT)'], qualifiedOperators: ['Shih Chak Lung, Ben (BS)', 'Li Chun Yin, Brian (BL)', 'Cheung Dickson (DC)'], trainees: [] },
  { code: 'FC', testName: 'Flow of Grout (Flow Cone)', standard: 'ASTM C939/C939M-22', hoklasStatus: 'Accredited', signatories: ['Lam Hoi Fan, James (JL)', 'Tang Man Fu (MFT)'], qualifiedOperators: ['Shih Chak Lung, Ben (BS)', 'Li Chun Yin, Brian (BL)', 'Cheung Dickson (DC)'], trainees: ['Zoe Chiu', 'Chan Yuet Man, Moon', 'Winnie Lai'] },
  { code: 'BL', testName: 'Bleeding & Free Expansion of Grout', standard: 'ASTM C940-22', hoklasStatus: 'Accredited', signatories: ['Lam Hoi Fan, James (JL)', 'Tang Man Fu (MFT)'], qualifiedOperators: ['Shih Chak Lung, Ben (BS)', 'Li Chun Yin, Brian (BL)', 'Cheung Dickson (DC)'], trainees: ['Zoe Chiu', 'Chan Yuet Man, Moon', 'Winnie Lai'] },
  { code: 'PO', testName: 'Point Load Strength Index of Rock', standard: 'ASTM D5731-16', hoklasStatus: 'Accredited', signatories: ['Lam Hoi Fan, James (JL)', 'Chu Kar Wai, Peter (PC)'], qualifiedOperators: ['Chu Kar Wai, Peter (PC)', 'Yam Tsz Kin, Kim (KY)'], trainees: ['Law Cheuk Yin'] },
  { code: 'PLT', testName: 'Plate Load Test (Soil / Rock)', standard: 'BS 1377-9 Cl. 4.1 / BD Cl. 8.2', hoklasStatus: 'Target 2027 Q2', signatories: ['Lam Hoi Fan, James (JL)', 'Tang Man Fu (MFT)'], qualifiedOperators: [], trainees: ['Shih Chak Lung, Ben (BS)', 'Li Chun Yin, Brian (BL)', 'Chan Yuet Man, Moon'] },
  { code: 'VC', testName: 'Verticality Check (Inclinometer)', standard: 'Biaxial Inclinometer / BD CoP', hoklasStatus: 'Target 2027 Q2', signatories: ['Lam Hoi Fan, James (JL)', 'Chu Kar Wai, Peter (PC)'], qualifiedOperators: [], trainees: ['Yam Tsz Kin, Kim (KY)', 'Chu Kar Wai, Peter (PC)'] },
];
