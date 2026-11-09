import { CalendarEvent, SharedDocAttachment } from '../types';

export interface ServerMasterScheduleDoc {
  id: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  fileName: string;
  fileSize: string;
  serverPath: string;
  url: string;
  badge: string;
}

export const SERVER_MASTER_SCHEDULES: ServerMasterScheduleDoc[] = [
  {
    id: 'srv-trn-261012',
    titleZh: 'Training Schedule - 20261012.xlsx',
    titleEn: 'Training Schedule - 20261012.xlsx',
    subtitleZh: '02 Training Record · 全測試培訓排程總表 (KD/SO/FC/BL/PO/PLT)',
    subtitleEn: '02 Training Record · Master Training Schedule (KD/SO/FC/BL/PO/PLT)',
    fileName: 'Training_Schedule_20261012.xlsx',
    fileSize: '28 KB',
    serverPath: '02 Training Record\\Training Schedule - 20261012.xlsx',
    url: '/server-docs/schedules/Training_Schedule_20261012.xlsx',
    badge: 'XLSX 排程表',
  },
  {
    id: 'srv-prog-261021',
    titleZh: 'LT Progress - 20261021.xlsx',
    titleEn: 'LT Progress - 20261021.xlsx',
    subtitleZh: '09.1 Labtech Progress · 10 項測試籌備及 HOKLAS 認證進度表',
    subtitleEn: '09.1 Labtech Progress · 10-Test Readiness & HOKLAS Milestones',
    fileName: 'LT_Progress_20261021.xlsx',
    fileSize: '31 KB',
    serverPath: '09 Programme\\9.1 Labtech Progress\\LT Progress - 20261021.xlsx',
    url: '/server-docs/schedules/LT_Progress_20261021.xlsx',
    badge: 'XLSX 進度表',
  },
  {
    id: 'srv-mtg-261021-pdf',
    titleZh: 'LT Report Summary_202610.pdf',
    titleEn: 'LT Report Summary_202610.pdf',
    subtitleZh: '04.3 Piling Meeting · 2026年10月工程、投標及培訓統計月報',
    subtitleEn: '04.3 Piling Meeting · Oct 2026 Project, Tender & Training Summary',
    fileName: 'LT_Report_Summary_202610.pdf',
    fileSize: '30 KB',
    serverPath: '04 Meeting\\4.3 Piling Meeting\\20261021\\LT Report Summary_202610.pdf',
    url: '/server-docs/schedules/LT_Report_Summary_202610.pdf',
    badge: 'PDF 月報',
  },
];

SERVER_MASTER_SCHEDULES.push(
  {
    id: 'srv-dept-261021-pdf',
    titleZh: 'Labtech Department_202610.pdf',
    titleEn: 'Labtech Department_202610.pdf',
    subtitleZh: '04.3 Piling Meeting · Labtech 部門簡報 (架構、認證及排程)',
    subtitleEn: '04.3 Piling Meeting · Labtech Department Presentation (Oct 2026)',
    fileName: 'Labtech_Department_202610.pdf',
    fileSize: '1.0 MB',
    serverPath: '04 Meeting\\4.3 Piling Meeting\\20261021\\Labtech Department_202610.pdf',
    url: '/server-docs/schedules/Labtech_Department_202610.pdf',
    badge: 'PDF 簡報',
  },
  {
    id: 'srv-fqs38-pdf',
    titleZh: 'FQS38 校準及核查時間表 (260520).pdf',
    titleEn: 'FQS38 Calibration & Verification Schedule (260520).pdf',
    subtitleZh: '01 Quality Document\\Form\\FQS38 · 儀器外校及內檢排程',
    subtitleEn: '01 Quality Document\\Form\\FQS38 · Calibration & Check Schedule',
    fileName: 'FQS38_Calibration_Verification_Schedule_260520.pdf',
    fileSize: '776 KB',
    serverPath: '01 Quality Document\\Correspondences\\S&A Consultancy\\In\\260504\\WL1a FQS38 CALIBRATION AND VERIFICATION CHECK SCHEDULE_260520.pdf',
    url: '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf',
    badge: 'FQS38 PDF',
  },
  {
    id: 'srv-jobreg-xlsx',
    titleZh: 'LabTech Job Register.xlsx',
    titleEn: 'LabTech Job Register.xlsx',
    subtitleZh: '01 Quality Document · 歷年及 2026 全項目測試登記總表 (KD/SO/FC/BL/PO)',
    subtitleEn: '01 Quality Document · Full Test Job Register (KD/SO/FC/BL/PO)',
    fileName: 'LabTech_Job_Register.xlsx',
    fileSize: '75 KB',
    serverPath: '01 Quality Document\\LabTech Job Register.xlsx',
    url: '/server-docs/schedules/LabTech_Job_Register.xlsx',
    badge: 'XLSX 總表',
  }
);

function att(
  id: string,
  fileName: string,
  fileSize: string,
  docType: string,
  serverPath: string,
  dataUrl: string,
  uploadedAt = '2026-10-21'
): SharedDocAttachment {
  return { id, fileName, fileSize, docType, uploadedBy: 'Server Sync', uploadedAt, serverPath, dataUrl };
}

const ATT_TRN_XLSX = att('att-trn-261012', 'Training_Schedule_20261012.xlsx', '28 KB', '參考文件 PDF', '02 Training Record\\Training Schedule - 20261012.xlsx', '/server-docs/schedules/Training_Schedule_20261012.xlsx', '2026-10-12');
const ATT_PROG_XLSX = att('att-prog-261021', 'LT_Progress_20261021.xlsx', '31 KB', '參考文件 PDF', '09 Programme\\9.1 Labtech Progress\\LT Progress - 20261021.xlsx', '/server-docs/schedules/LT_Progress_20261021.xlsx', '2026-10-21');
const ATT_RPT_SUM_PDF = att('att-rpsum-2610', 'LT_Report_Summary_202610.pdf', '30 KB', '參考文件 PDF', '04 Meeting\\4.3 Piling Meeting\\20261021\\LT Report Summary_202610.pdf', '/server-docs/schedules/LT_Report_Summary_202610.pdf', '2026-10-21');
const ATT_DEPT_PDF = att('att-dept-2610', 'Labtech_Department_202610.pdf', '1.0 MB', '參考文件 PDF', '04 Meeting\\4.3 Piling Meeting\\20261021\\Labtech Department_202610.pdf', '/server-docs/schedules/Labtech_Department_202610.pdf', '2026-10-21');
const ATT_MTG_DOCX = att('att-mtg-261021', 'Meeting_20261021.docx', '20 KB', '參考文件 PDF', '04 Meeting\\4.3 Piling Meeting\\20261021\\Meeting - 20261021.docx', '/server-docs/schedules/Meeting_20261021.docx', '2026-10-21');
const ATT_PLT_CHK_PDF = att('att-plt-261021', 'PLT_Setup_Checking_750kPa_261021.pdf', '1.4 MB', '750 kPa 反力架結構驗算', '03 Works\\03.5.6 Plate Load Test\\Working File\\20261021 Plate Load Test Setup Checking.pdf', '/server-docs/stp/PLT_Setup_Checking_750kPa_261021.pdf', '2026-10-21');
const ATT_FQS38_PDF = att('att-fqs38-260520', 'FQS38_Calibration_Verification_Schedule_260520.pdf', '776 KB', '參考文件 PDF', '01 Quality Document\\Form\\FQS38\\WL1a FQS38 CALIBRATION AND VERIFICATION CHECK SCHEDULE_260520.pdf', '/server-docs/forms/FQS38_Calibration_Verification_Schedule_260520.pdf', '2026-05-20');
const ATT_HOKLAS_SCOPE = att('att-hoklas-260727', 'HOKLAS298_Scope_of_Accreditation_260727.pdf', '159 KB', '參考文件 PDF', '03 Works\\03.6 Job Reference\\LabTech - Scope of Accreditation_260727.pdf', '/server-docs/forms/HOKLAS298_Scope_of_Accreditation_260727.pdf', '2026-07-27');
const ATT_JOB_REG = att('att-jobreg-2610', 'LabTech_Job_Register.xlsx', '75 KB', '參考文件 PDF', '01 Quality Document\\LabTech Job Register.xlsx', '/server-docs/schedules/LabTech_Job_Register.xlsx', '2026-10-21');

export const SERVER_CALENDAR_EVENTS: CalendarEvent[] = [
  // === 2026 Early - Mid Historical Milestones & HOKLAS Audits ===
  { id: 'ev-260225-kd-aud', type: 'hoklas', tests: ['koden'], title: 'HOKLAS Koden 超聲波孔壁檢測現場覆審 (Audit)', date: '2026-02-25', timeSlot: '09:00 - 17:00', dateTentative: false, jobNo: 'KW-STS', site: 'Shing Tak Street (馬頭涌盛德街 KIL11290)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: '依據 STP02-FDT-TM3 rev 7 及 HKCI TM3 Issue 2 (2024) 完成 HOKLAS 現場覆審。', status: 'done', attachments: [ATT_TRN_XLSX, ATT_HOKLAS_SCOPE] },
  { id: 'ev-260320-sts-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: '馬頭涌盛德街 BP01 現場測試 (FC-260001 / BL-260001)', date: '2026-03-20', timeSlot: '08:00 - 18:00', dateTentative: false, jobNo: 'KW-STS', site: 'Shing Tak Street (馬頭涌盛德街 KIL11290)', operators: ['Shih Chak Lung, Ben', 'Cheung Dickson'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '完成 BP01 水泥漿流錐及泌水膨脹測試並於 2026-03-24 簽發報告。', status: 'done', attachments: [ATT_JOB_REG] },
  { id: 'ev-260323-sts-so', type: 'site_test', tests: ['sonic'], title: '馬頭涌盛德街 BP01 跨孔超聲波測試 (SO-260001)', date: '2026-03-23', timeSlot: '08:00 - 18:00', dateTentative: false, jobNo: 'KW-STS', site: 'Shing Tak Street (馬頭涌盛德街 KIL11290)', operators: ['Shih Chak Lung, Ben', 'Cheung Dickson'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: '完成 BP01 跨孔超聲波檢測 (SO-260001) 及報告編製訓練。', status: 'done', attachments: [ATT_JOB_REG, ATT_TRN_XLSX] },
  { id: 'ev-260421-lck-so', type: 'site_test', tests: ['sonic'], title: '荔枝角收押所 SBP03 跨孔超聲波測試 (SO-260002)', date: '2026-04-21', timeSlot: '08:00 - 18:00', dateTentative: false, jobNo: 'SO-LCK', site: 'Lai Chi Kok Reception Centre', operators: ['Cheung Dickson', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: '瑞安建業荔枝角收押所重建項目 SBP03 跨孔超聲波現場檢測及評審前預演。', status: 'done', attachments: [ATT_JOB_REG] },
  { id: 'ev-260422-hoklas-so', type: 'hoklas', tests: ['sonic', 'point_load'], title: 'HOKLAS 擴項現場評審 — Sonic (SO-260003) & Point Load (PO-260001)', date: '2026-04-22', timeSlot: '09:00 - 17:30', dateTentative: false, jobNo: 'SO-LCK', site: 'Lai Chi Kok Reception Centre & Head Office', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian', 'Cheung Dickson', 'Chu Kar Wai, Peter'], helpers: ['楊敬全', '羅錦有', '成敏光'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun', 'Chu Kar Wai, Peter'], notes: 'HKAS 評審組親臨荔枝角工地 (SBP03) 及總部考核 ASTM D6760 跨孔超聲波與 ASTM D5731 岩石點荷載測試。', status: 'done', attachments: [ATT_HOKLAS_SCOPE, ATT_TRN_XLSX, ATT_JOB_REG] },
  { id: 'ev-260423-hoklas-fc', type: 'hoklas', tests: ['flowcone_bleeding', 'point_load'], title: 'HOKLAS 擴項現場評審 — Flow Cone & Bleeding (FC/BL-260002) & Point Load (PO-260002)', date: '2026-04-23', timeSlot: '09:00 - 17:30', dateTentative: false, jobNo: 'KW-STS', site: 'Shing Tak Street (KIL11290) & Lai Chi Kok', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian', 'Cheung Dickson', 'Chu Kar Wai, Peter'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Kar Wai, Peter'], notes: '於馬頭涌盛德街 BP01 進行 ASTM C939 / C940 現場評審測試及 PO-260002 評審樣本考核。', status: 'done', attachments: [ATT_HOKLAS_SCOPE, ATT_TRN_XLSX, ATT_JOB_REG] },
  { id: 'ev-260429-sts-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: '馬頭涌盛德街 P25 現場測試 (FC-260003 / BL-260003)', date: '2026-04-29', timeSlot: '09:00 - 16:00', dateTentative: false, jobNo: 'KW-STS', site: 'Shing Tak Street (馬頭涌盛德街 KIL11290)', operators: ['Cheung Dickson'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '完成 P25 樁位水泥漿流錐及泌水測試並於 2026-05-05 發出正式報告。', status: 'done', attachments: [ATT_JOB_REG] },
  { id: 'ev-260507-lck-so', type: 'site_test', tests: ['sonic'], title: '荔枝角收押所 SBP03/SBP14 實驗室間比對測試 (SO-260004 InterLab)', date: '2026-05-07', timeSlot: '08:30 - 17:30', dateTentative: false, jobNo: 'SO-LCK', site: 'Lai Chi Kok Reception Centre', operators: ['Shih Chak Lung, Ben'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: '完成 SBP03 及 SBP14 跨孔超聲波實驗室間比對測試 (SO-260004) 並簽發報告。', status: 'done', attachments: [ATT_JOB_REG, ATT_PROG_XLSX] },
  { id: 'ev-260623-mk-kd', type: 'training', tests: ['koden'], title: '旺角山東街 KIL11295 Koden 現場培訓及工地立項 (LT0001)', date: '2026-06-23', timeSlot: '09:00 - 16:00', dateTentative: false, jobNo: 'LT0001', site: 'Shantung Street / Thistle Street, Mong Kok', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian', 'Cheung Dickson'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: '於旺角山東街工地進行 Koden DM-604RR 現場實操培訓及 LT0001 立項準備。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-260708-mk-kd', type: 'site_test', tests: ['koden'], title: '旺角山東街 KIL11295 (Pile C1BP1) Koden 正式檢測 (KD-260001)', date: '2026-07-08', timeSlot: '08:30 - 17:00', dateTentative: false, jobNo: 'LT0001', site: 'Shantung Street / Thistle Street, Mong Kok', operators: ['Lin Chung Kit'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Chu Lap Man, Raymond'], notes: 'Everest Engineering 旺角山東街 C1BP1 鑽孔樁 Koden 檢測，即日完成並簽發 HOKLAS 報告。', status: 'done', attachments: [ATT_JOB_REG] },
  { id: 'ev-260727-hoklas-cert', type: 'hoklas', tests: ['koden', 'sonic', 'flowcone_bleeding', 'point_load'], title: 'HOKLAS 298 正式發出擴項認可範圍證書 (KD / SO / FC / BL / PO)', date: '2026-07-27', timeSlot: '09:00 - 18:00', dateTentative: false, site: 'Labtech 總部 (HOKLAS Reg. No. 298)', operators: ['Chu Lap Man, Raymond'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun', 'Chu Kar Wai, Peter'], notes: 'HKAS 正式更新 HOKLAS 298 Scope of Accreditation，涵蓋 5 大認可測試項目。', status: 'done', attachments: [ATT_HOKLAS_SCOPE] },
  { id: 'ev-260806-po-pt', type: 'hoklas', tests: ['point_load'], title: 'Point Load 岩石點荷載能力驗證測試 (PO-260003 Proficiency Test)', date: '2026-08-06', timeSlot: '09:30 - 17:00', dateTentative: false, site: 'Lai Chi Kok Testing Room', operators: ['Chu Kar Wai, Peter'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: '完成 HOKLAS 要求之 Point Load 能力驗證樣本測試 (PO-260003)。', status: 'done', attachments: [ATT_JOB_REG] },
];

SERVER_CALENDAR_EVENTS.push(
  // === October 2026 Server Events (Training Schedule 20261012 + LT0002 PolyU + Piling Meeting) ===
  { id: 'ev-261003-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓 (DGP0104)', date: '2026-10-03', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261005-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: 'PolyU DGP0104 現場測試 (FC/BL-260004~06) 及第 17 次部門會議', date: '2026-10-05', timeSlot: '09:00 - 17:30', dateTentative: false, jobNo: 'LT0002', site: 'PolyU Hung Hom (DGP0104) & Head Office', operators: ['Zoe Chiu', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '完成理大 DGP0104 首批水泥漿流錐與泌水報告 (20261005) 及召開第 17 次內部會議。', status: 'done', attachments: [ATT_DEPT_PDF, ATT_TRN_XLSX] },
  { id: 'ev-261010-po', type: 'training', tests: ['point_load'], title: 'Point Load 實操培訓 (Depot)', date: '2026-10-10', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim', 'Law Cheuk Yin'], helpers: ['Chu Kar Wai, Peter'], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Peter Chu ｜ Operator: Peter Chu, Kim, Law Cheuk Yin。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261012-job-reg', type: 'hoklas', tests: ['point_load'], title: '新工程立項 (LT0003 朗邊、LT0004 沙嶺、LT0005 古洞北) 及器材清單更新', date: '2026-10-12', timeSlot: '09:00 - 17:30', dateTentative: false, jobNo: 'LT0003', site: 'Labtech 總部及各工程工地', operators: ['Chu Lap Man, Raymond', 'Chu Kar Wai, Peter'], helpers: [], signatories: ['Lam Hoi Fan, James'], notes: '更新 Job Register (LT0003~LT0005)、Training Schedule (20261012) 及 Equipment Inventory List (261012)。', status: 'done', attachments: [ATT_TRN_XLSX, ATT_JOB_REG] },
  { id: 'ev-261013-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓及現場測試 (DGP0104)', date: '2026-10-13', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu', 'Winnie Lai', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu, Winnie Lai, Moon Chan（同日完成 FC/BL-260007~08）。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261016-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: 'PolyU DGP0104 現場測試 (FC/BL-260009~10)', date: '2026-10-16', timeSlot: '09:30 - 16:30', dateTentative: false, jobNo: 'LT0002', site: 'PolyU Hung Hom (DGP0104)', operators: ['Zoe Chiu', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '理大紅磡創新樓 Grout Curtain 持續現場抽樣流錐及泌水膨脹測試 (20261016 批次)。', status: 'done', attachments: [ATT_RPT_SUM_PDF] },
  { id: 'ev-261021-mtg', type: 'hoklas', tests: ['plate_load', 'koden', 'sonic'], title: 'Piling 部門會議、LT Progress 檢討及 750 kPa 反力架結構驗算', date: '2026-10-21', timeSlot: '10:00 - 17:30', dateTentative: false, jobNo: 'LT0006', site: 'Labtech 總部會議室', operators: ['Lai Tsz Hin, Jeff', 'Lau Shing Chi, Crimson', 'Shih Chak Lung, Ben'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: '匯報 10 月份工程與培訓進度、石硤尾 NKIL 6654 (LT0006) 立項，並完成 Plate Load Test 750 kPa 反力架驗算及 Inclinometer VCheck 籌備檢討。', status: 'done', attachments: [ATT_RPT_SUM_PDF, ATT_DEPT_PDF, ATT_PROG_XLSX, ATT_MTG_DOCX, ATT_PLT_CHK_PDF] },
  { id: 'ev-261022-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓及現場測試 (DGP0104)', date: '2026-10-22', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu', 'Winnie Lai', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu, Winnie Lai, Moon Chan（同日完成 FC/BL-260011~12）。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261024-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: 'PolyU DGP0104 現場測試 (FC/BL-260013~14)', date: '2026-10-24', timeSlot: '09:30 - 16:30', dateTentative: false, jobNo: 'LT0002', site: 'PolyU Hung Hom (DGP0104)', operators: ['Zoe Chiu', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '完成理大 DGP0104 20261024 批次 Grout Flow Cone & Bleeding 測試。', status: 'done', attachments: [ATT_RPT_SUM_PDF] },
  { id: 'ev-261028-fc', type: 'site_test', tests: ['flowcone_bleeding'], title: 'PolyU DGP0104 現場測試 (FC/BL-260015~16)', date: '2026-10-28', timeSlot: '09:30 - 16:30', dateTentative: false, jobNo: 'LT0002', site: 'PolyU Hung Hom (DGP0104)', operators: ['Zoe Chiu', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: '完成理大 DGP0104 20261028 批次 Grout Flow Cone & Bleeding 測試。', status: 'done', attachments: [ATT_RPT_SUM_PDF] },
  { id: 'ev-261029-so', type: 'training', tests: ['sonic'], title: 'Sonic 培訓及現場測試 (LCK Reception Centre)', date: '2026-10-29', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'SO-LCK', site: 'LCK Reception Centre', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: LCK Reception Centre ｜ Trainer: Ben ｜ Operator: Ben, Brian（SO-260005 EBP06）。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261030-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓及現場測試 (DGP0104)', date: '2026-10-30', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Moon Chan（同日完成 FC/BL-260017~18）。', status: 'done', attachments: [ATT_TRN_XLSX] }
);

SERVER_CALENDAR_EVENTS.push(
  // === November 2026 – January 2027 Server Events (Synced with Training Schedule - 20261012.xlsx All Test) ===
  { id: 'ev-261104-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓 (DGP0104)', date: '2026-11-04', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261105-po', type: 'site_test', tests: ['point_load'], title: '沙嶺數據中心 PO-260004 岩石測試 (17 組)', date: '2026-11-05', timeSlot: '09:30 - 17:00', dateTentative: false, jobNo: 'LT0004', site: 'Sandy Ridge / Lab Testing Room', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim'], helpers: [], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'DrilTech 沙嶺項目 17 個岩芯樣本 Point Load Is(50) 試驗。', status: 'done', attachments: [ATT_JOB_REG] },
  { id: 'ev-261106-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓 (DGP0104)', date: '2026-11-06', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu。', status: 'done', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261109-fc-trn', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓 (DGP0104)', date: '2026-11-09', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261111-plt', type: 'training', tests: ['plate_load'], title: 'Plate Load 培訓 (Lung Tin Tsuen / 樟木頭 / Depot)', date: '2026-11-11', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Lung Tin Tsuen / 樟木頭 / Depot', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Lung Tin Tsuen/ 樟木頭 / Depot ｜ Trainer: Ben ｜ Operator: Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX, ATT_PLT_CHK_PDF] },
  { id: 'ev-261112-so', type: 'training', tests: ['sonic'], title: 'Sonic 培訓 (LCK Reception Centre)', date: '2026-11-12', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'SO-LCK', site: 'LCK Reception Centre', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: LCK Reception Centre ｜ Trainer: Ben ｜ Operator: Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261114-po', type: 'training', tests: ['point_load'], title: 'Point Load 培訓 (Depot)', date: '2026-11-14', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim', 'Law Cheuk Yin'], helpers: ['Chu Kar Wai, Peter'], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Peter Chu ｜ Operator: Peter Chu, Kim, Law Cheuk Yin。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261120-fc', type: 'training', tests: ['flowcone_bleeding'], title: 'Flow Cone & Bleeding 培訓 (DGP0104)', date: '2026-11-20', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0002', site: 'DGP0104 (PolyU Hung Hom)', operators: ['Zoe Chiu', 'Winnie Lai', 'Chan Yuet Man, Moon'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: DGP0104 ｜ Trainer: Jeff Lai ｜ Operator: Zoe Chiu, Winnie Lai, Moon Chan。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261126-kd', type: 'training', tests: ['koden'], title: 'Koden 培訓 (大坑西)', date: '2026-11-26', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0006', site: '大坑西 (NKIL 6654)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Lin Chung Kit'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: 大坑西 ｜ Trainer: Lin Chung Kit ｜ Operator: Lin Chung Kit, Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261128-plt', type: 'training', tests: ['plate_load'], title: 'Plate Load 培訓 (Depot)', date: '2026-11-28', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Ben ｜ Operator: Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX, ATT_PLT_CHK_PDF] },
  { id: 'ev-261201-hoklas-prog', type: 'hoklas', tests: ['plate_load', 'verticality'], title: 'LT Progress 十二月里程碑 — Plate Load & VCheck 品質文件及 HOKLAS 申請檢視', date: '2026-12-01', timeSlot: '09:30 - 17:30', dateTentative: false, site: 'Labtech 總部及 Depot', operators: ['Shih Chak Lung, Ben', 'Chu Kar Wai, Peter', 'Chu Lap Man, Raymond'], helpers: ['Lai Tsz Hin, Jeff'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Yue Wai Chun'], notes: '按 LT Progress - 20261021.xlsx 檢視 Plate Load Test 及 Verticality Check (Inclinometer) 之委託單、品質文件、設備校準、內部培訓及實驗室間比對進度。', status: 'planned', attachments: [ATT_PROG_XLSX, ATT_MTG_DOCX] },
  { id: 'ev-261205-cal', type: 'hoklas', tests: ['koden', 'sonic', 'point_load'], title: 'FQS38 十二月批次儀器外送校準 (共 11 件)', date: '2026-12-05', timeSlot: '09:00 - 17:00', dateTentative: false, site: 'HOKLAS Calibration Lab', operators: ['Chu Lap Man, Raymond'], helpers: [], signatories: ['Lam Hoi Fan, James'], notes: '12月18至23日到期儀器送校：LT-LV-01、LT-TM-01、LT-DC-01/03、LT-MT-06/09/10、LT-DM-01、LT-SR-10~13。', status: 'planned', attachments: [ATT_FQS38_PDF] },
  { id: 'ev-261212-po', type: 'training', tests: ['point_load'], title: 'Point Load 培訓 (Depot)', date: '2026-12-12', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim', 'Law Cheuk Yin'], helpers: ['Chu Kar Wai, Peter'], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Peter Chu ｜ Operator: Peter Chu, Kim, Law Cheuk Yin。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261219-plt', type: 'training', tests: ['plate_load'], title: 'Plate Load 培訓 (Depot)', date: '2026-12-19', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Ben ｜ Operator: Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX, ATT_PLT_CHK_PDF] },
  { id: 'ev-261224-kd', type: 'training', tests: ['koden'], title: 'Koden 培訓 (大坑西)', date: '2026-12-24', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0006', site: '大坑西 (NKIL 6654)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Lin Chung Kit'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: 大坑西 ｜ Trainer: Lin Chung Kit ｜ Operator: Lin Chung Kit, Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-261231-kd', type: 'training', tests: ['koden'], title: 'Koden 培訓 (大坑西)', date: '2026-12-31', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0006', site: '大坑西 (NKIL 6654)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Lin Chung Kit'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: 大坑西 ｜ Trainer: Lin Chung Kit ｜ Operator: Lin Chung Kit, Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-270107-kd', type: 'training', tests: ['koden'], title: 'Koden 培訓 (大坑西)', date: '2027-01-07', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0006', site: '大坑西 (NKIL 6654)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Lin Chung Kit'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: 大坑西 ｜ Trainer: Lin Chung Kit ｜ Operator: Lin Chung Kit, Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-270109-plt', type: 'training', tests: ['plate_load'], title: 'Plate Load 培訓 (Depot)', date: '2027-01-09', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Ben ｜ Operator: Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX, ATT_PROG_XLSX] },
  { id: 'ev-270116-po', type: 'training', tests: ['point_load'], title: 'Point Load 培訓 (Depot)', date: '2027-01-16', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim', 'Law Cheuk Yin'], helpers: ['Chu Kar Wai, Peter'], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Peter Chu ｜ Operator: Peter Chu, Kim, Law Cheuk Yin。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-270121-kd', type: 'training', tests: ['koden'], title: 'Koden 培訓 (大坑西)', date: '2027-01-21', timeSlot: '09:00 - 12:00', dateTentative: false, jobNo: 'LT0006', site: '大坑西 (NKIL 6654)', operators: ['Lin Chung Kit', 'Shih Chak Lung, Ben', 'Li Chun Yin, Brian'], helpers: ['Lin Chung Kit'], signatories: ['Lam Hoi Fan, James', 'Tang Man Fu', 'Chu Lap Man, Raymond'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: 大坑西 ｜ Trainer: Lin Chung Kit ｜ Operator: Lin Chung Kit, Ben, Brian。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-270123-po', type: 'training', tests: ['point_load'], title: 'Point Load 培訓 (Depot)', date: '2027-01-23', timeSlot: '09:00 - 12:00', dateTentative: false, site: 'Depot', operators: ['Chu Kar Wai, Peter', 'Yam Tsz Kin, Kim', 'Law Cheuk Yin'], helpers: ['Shih Chak Lung, Ben'], signatories: ['Lam Hoi Fan, James', 'Chu Kar Wai, Peter'], notes: 'Training Schedule (All Test)：0900-1200 Training ｜ Site: Depot ｜ Trainer: Ben ｜ Operator: Peter Chu, Kim, Law Cheuk Yin。', status: 'planned', attachments: [ATT_TRN_XLSX] },
  { id: 'ev-270128-cal', type: 'hoklas', tests: ['point_load', 'plate_load'], title: 'FQS38 一月／二月初批次儀器外送校準 (Load Cell、Dial Gauge、Point Load Tester)', date: '2027-01-28', timeSlot: '09:00 - 17:00', dateTentative: false, site: 'HOKLAS Calibration Lab', operators: ['Chu Lap Man, Raymond', 'Chu Kar Wai, Peter'], helpers: [], signatories: ['Lam Hoi Fan, James'], notes: '1月底至2月初到期器材送校：LT-LC-01 (1/28)、LT-DG-01 (2/01)、LT-PO-02 及 LT-PL-01~04 (2/05)。', status: 'planned', attachments: [ATT_FQS38_PDF] }
);
