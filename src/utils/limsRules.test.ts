import test from 'node:test';
import assert from 'node:assert/strict';
import { getHkTodayIso } from '../utils';
import {
  getLoanOverdueStatus,
  evaluateCheckoutCompliance,
  checkFqs49AndConflicts,
  detectCalcPassStatus,
} from './limsRules';
import { mergeUnsyncedLocalIntoRemote, AppPersistedState } from '../cloudMerge';
import {
  inferFileTargetFromName,
  formatFileSize,
  extractBase64Payload,
  collectExistingDriveFiles,
  detectBatchCollisions,
  applyCollisionResolutions,
  buildFileProgressEntry,
  createInitialFileProgressMap,
  markInFlightFilesCancelled,
  applyBatchUndoRollback,
  computeOverallBatchProgress,
  parseFileSizeToBytes,
  formatSessionDuration,
  computeSessionBatchSummary,
} from './batchUpload';
import { classifyAssetWorkboxStrategy, buildOfflineCacheSummary } from './pwaConfig';
import {
  buildHoklasFieldWorksheetData,
  generateDeterministicQrMatrix,
  matchEquipmentByQrOrQuery,
  buildCalibrationForecast,
  buildCalibrationRenewalCsv,
  buildWhatsAppDispatchBriefing,
  addDaysIso,
  buildEquipmentCertStatusPath,
  buildEquipmentQrUrl,
  parseEquipmentCodeFromUrl,
  generateEquipmentQrCode,
  generateAllEquipmentQrCodes,
} from './limsProcessTools';
import { EquipmentItem, CalendarEvent } from '../types';
import {
  TARGET_DRIVE_UPLOADS_FOLDER_ID,
  computeScaledDimensions,
  estimateDataUrlBytes,
  computeCompressionSavedPct,
  buildSitePhotoDriveTarget,
  buildFieldCalcRecordDriveBundle,
  mergeAttachedSitePhotos,
} from './sitePhotoUtils';
import {
  getOfficialTemplateMeta,
  buildCompletedExcelWorkbookXml,
} from './completedWorksheetGenerator';
import {
  buildOfficialTemplateSheetCellMaps,
  injectCellsIntoSheetXml,
} from './xlsxTemplateFiller';

const sampleEq = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
  code: 'LT-FC-01',
  name: 'Flow Cone Set',
  model: 'C939',
  serial: 'FC-101',
  maker: 'Humboldt',
  inUse: 'Y',
  tests: 'FC',
  testTags: ['FC'],
  req: 'External Cal',
  last: '2026-01-10',
  due: '2027-01-10',
  store: 'Lab',
  loc: 'Lab',
  remark: '',
  currentLoan: null,
  ...overrides,
});

test('getHkTodayIso formats date in YYYY-MM-DD', () => {
  const fixed = new Date('2026-11-08T02:00:00Z');
  const iso = getHkTodayIso(fixed);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(iso, '2026-11-08');
});

test('getLoanOverdueStatus detects overdue active loans accurately', () => {
  const eqOverdue = sampleEq({
    currentLoan: {
      loanId: 'LN-1',
      borrowerName: 'Ben',
      borrowerStaffId: 'BS',
      jobNo: 'LT0002',
      siteLocation: 'PolyU',
      checkoutAt: '2026-11-01 09:00',
      expectedReturn: '2026-11-03',
    },
  });
  const res = getLoanOverdueStatus(eqOverdue, '2026-11-07');
  assert.equal(res.isOverdue, true);
  assert.equal(res.overdueDays, 4);

  const resNotOverdue = getLoanOverdueStatus(eqOverdue, '2026-11-02');
  assert.equal(resNotOverdue.isOverdue, false);
  assert.equal(resNotOverdue.overdueDays, 0);
});

test('evaluateCheckoutCompliance blocks overdue or disposed equipment and warns when return > cal due', () => {
  const validEq = sampleEq({ due: '2027-06-01' });
  const okRes = evaluateCheckoutCompliance(validEq, '2026-11-20', '2026-11-07');
  assert.equal(okRes.level, 'ok');
  assert.equal(okRes.requiresOverride, false);

  const returnExceedsRes = evaluateCheckoutCompliance(validEq, '2027-06-15', '2026-11-07');
  assert.equal(returnExceedsRes.level, 'warn');
  assert.equal(returnExceedsRes.returnExceedsCalDue, true);

  const overdueCalEq = sampleEq({ due: '2026-10-01' });
  const blockedRes = evaluateCheckoutCompliance(overdueCalEq, '2026-11-12', '2026-11-07');
  assert.equal(blockedRes.level, 'blocked');
  assert.equal(blockedRes.requiresOverride, true);
});

test('checkFqs49AndConflicts identifies FQS49 roles and same-day double-booking', () => {
  const events: CalendarEvent[] = [
    {
      id: 'ev-1',
      type: 'site_test',
      tests: ['SO'],
      title: 'Morning Sonic Test',
      date: '2026-11-12',
      timeSlot: '09:00 - 12:00',
      dateTentative: false,
      site: 'Lai Chi Kok',
      operators: ['Shih Chak Lung, Ben'],
      helpers: [],
      signatories: ['Lam Hoi Fan, James'],
      notes: '',
      status: 'planned',
    },
  ];
  const eqList: EquipmentItem[] = [
    sampleEq({ code: 'LT-CA-01', testTags: ['SO'], due: '2027-05-01', currentLoan: null }),
  ];

  const check = checkFqs49AndConflicts({
    testCodes: ['SO'],
    date: '2026-11-12',
    selectedOperators: ['Shih Chak Lung, Ben', 'Zoe Chiu'],
    allEvents: events,
    allEquipment: eqList,
    allStaffNames: ['Lam Hoi Fan, James', 'Shih Chak Lung, Ben', 'Zoe Chiu'],
    today: '2026-11-07',
  });

  assert.equal(check.staffRoles['Lam Hoi Fan, James'], 'as');
  assert.equal(check.staffRoles['Shih Chak Lung, Ben'], 'op');
  assert.equal(check.hasQualifiedLead, true);
  assert.equal(check.doubleBookedStaff.length, 1);
  assert.equal(check.doubleBookedStaff[0].name, 'Shih Chak Lung, Ben');
  assert.equal(check.equipmentSummary[0].availableCalibrated, 1);
});

test('mergeUnsyncedLocalIntoRemote preserves newer local edits and calcRecords', () => {
  const remoteState: AppPersistedState = {
    jobs: [
      {
        no: 'LT0002',
        companyProjNo: 'DGP0104',
        shortName: 'PolyU Old Remark',
        date: '2026-10-01',
        project: 'PolyU',
        scope: 'FC + BL',
        client: 'PolyU',
        site: 'Hung Hom',
        status: 'active',
        remark: 'Old remark',
        updatedAt: '2026-11-05 10:00',
      },
    ],
    loans: [],
    equipment: [sampleEq()],
    tests: [],
    events: [],
    pinnedStps: ['KD'],
    calcRecords: [],
    driveFiles: [],
  };

  const localState: AppPersistedState = {
    ...remoteState,
    jobs: [
      {
        ...remoteState.jobs[0],
        remark: 'Updated offline remark at Gate 2',
        updatedAt: '2026-11-07 14:30',
      },
    ],
    calcRecords: [
      {
        id: 'calc-101',
        jobNo: 'LT0002',
        stpCode: 'FC',
        title: 'Flow Cone Efflux Test',
        summary: 'Mean = 16.6 s (PASS)',
        pass: true,
        testedAt: '2026-11-07 14:35',
        operatorName: 'Shih Chak Lung, Ben',
      },
    ],
    driveFiles: [
      {
        id: 'drv-1',
        fileName: 'LT-FC-01_CalCert.pdf',
        fileSize: '120 KB',
        targetKind: 'equipment',
        targetCode: 'LT-FC-01',
        docType: 'Cal Cert PDF',
        uploadedBy: 'Ben',
        uploadedAt: '2026-11-07 14:40',
        serverPath: 'GoogleDrive/05_User_Uploads/LT-FC-01_CalCert.pdf',
      },
    ],
  };

  const { merged, hasLocalAdditions } = mergeUnsyncedLocalIntoRemote(localState, remoteState);
  assert.equal(hasLocalAdditions, true);
  assert.equal(merged.jobs[0].remark, 'Updated offline remark at Gate 2');
  assert.equal(merged.calcRecords?.length, 1);
  assert.equal(merged.calcRecords?.[0].id, 'calc-101');
  assert.equal(merged.driveFiles?.length, 1);
  assert.equal(detectCalcPassStatus('Mean = 16.6 s (PASS)'), true);
  assert.equal(detectCalcPassStatus('Verticality = 1:60 -> EXCEED'), false);
});

test('inferFileTargetFromName auto-routes equipment codes, STP codes, and vault files', () => {
  const eqCodes = ['LT-FC-01', 'LT-FC-10', 'LT-KD-02'];
  const stpCodes = ['KD', 'SO', 'FC', 'BL', 'PO', 'PLT'];

  const eqMatch = inferFileTargetFromName('Cert_LT-FC-10_2026.pdf', eqCodes, stpCodes);
  assert.equal(eqMatch.kind, 'equipment');
  assert.equal(eqMatch.code, 'LT-FC-10');
  assert.equal(eqMatch.targetFileName, 'LT-FC-10_Cert_LT-FC-10_2026.pdf');

  const stpMatch = inferFileTargetFromName('SO_Sonic_Method_Rev2.pdf', eqCodes, stpCodes);
  assert.equal(stpMatch.kind, 'stp');
  assert.equal(stpMatch.code, 'SO');
  assert.equal(stpMatch.targetFileName, 'SO_Sonic_Method_Rev2.pdf');

  const stpDocMatch = inferFileTargetFromName(
    'STP02-FDT-TM3_rev7_260206.pdf',
    eqCodes,
    [{ code: 'KD', stpDocCode: 'STP02-FDT-TM3' }, { code: 'SO', stpDocCode: 'STP03-FDT-D6760' }]
  );
  assert.equal(stpDocMatch.kind, 'stp');
  assert.equal(stpDocMatch.code, 'KD');
  assert.equal(stpDocMatch.targetFileName, 'STP02-FDT-TM3_rev7_260206.pdf');

  const vaultMatch = inferFileTargetFromName('Site_Safety_Briefing.pdf', eqCodes, stpCodes);
  assert.equal(vaultMatch.kind, 'vault');
  assert.equal(vaultMatch.code, '05_User_Uploads');

  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2.0 MB');
  assert.deepEqual(extractBase64Payload('data:application/pdf;base64,SGVsbG8='), {
    mimeType: 'application/pdf',
    base64Data: 'SGVsbG8=',
  });
});

test('classifyAssetWorkboxStrategy and buildOfflineCacheSummary verify Workbox offline rules', () => {
  assert.deepEqual(classifyAssetWorkboxStrategy('/api/db'), {
    strategy: 'NetworkFirst',
    cacheName: 'labtech-api-db-cache',
  });
  assert.deepEqual(classifyAssetWorkboxStrategy('/server-docs/stp/STP02-FDT-TM3_rev7_260206.pdf'), {
    strategy: 'CacheFirst',
    cacheName: 'labtech-server-docs-cache',
  });
  assert.deepEqual(classifyAssetWorkboxStrategy('/labtech-logo.png'), {
    strategy: 'StaleWhileRevalidate',
    cacheName: 'labtech-static-images-cache',
  });
  assert.deepEqual(classifyAssetWorkboxStrategy('/assets/index-abc123.js'), {
    strategy: 'Precache',
    cacheName: 'workbox-precache-v2',
  });

  const offlineSummary = buildOfflineCacheSummary({
    isOnline: false,
    swReady: true,
    sitesCount: 9,
    equipmentCount: 51,
    stpCount: 7,
  });
  assert.equal(offlineSummary.isOnline, false);
  assert.equal(offlineSummary.swReady, true);
  assert.ok(offlineSummary.statusHeadlineZh.includes('離線模式'));
  assert.ok(offlineSummary.statusHeadlineEn.includes('Offline Mode'));
});

test('collectExistingDriveFiles, detectBatchCollisions, and applyCollisionResolutions handle Overwrite, Keep Both, and Skip', () => {
  const existingMap = collectExistingDriveFiles({
    driveFiles: [
      {
        id: 'drv-existing-1',
        fileName: 'KDM1_CalCert_2026.pdf',
        fileSize: '120 KB',
        targetKind: 'vault',
        targetCode: '05_User_Uploads',
        docType: 'Drive Vault File',
        uploadedBy: 'Ben',
        uploadedAt: '2026-11-07 10:00',
        serverPath: 'GoogleDrive/05_User_Uploads/KDM1_CalCert_2026.pdf',
      },
    ],
    driveFileMap: {
      '/server-docs/stp/STP02-FDT-TM3_rev7_260206.pdf': '1HLX8c3Q4wcVpvmNhvIPOJWnlvSmFcAYF',
    },
  });

  const staged = [
    {
      id: 'stg-1',
      fileName: 'KDM1_CalCert_2026.pdf',
      fileSize: '125 KB',
      mimeType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,AAAA',
      targetKind: 'vault' as const,
      targetCode: '05_User_Uploads',
      docType: 'Drive Vault File',
    },
    {
      id: 'stg-2',
      fileName: 'STP02-FDT-TM3_rev7_260206.pdf',
      fileSize: '980 KB',
      mimeType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,BBBB',
      targetKind: 'stp' as const,
      targetCode: 'KD',
      docType: 'Controlled STP PDF',
    },
    {
      id: 'stg-3',
      fileName: 'Brand_New_Field_Log.pdf',
      fileSize: '45 KB',
      mimeType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,CCCC',
      targetKind: 'vault' as const,
      targetCode: '05_User_Uploads',
      docType: 'Drive Vault File',
    },
  ];

  const collisions = detectBatchCollisions(staged, existingMap);
  assert.equal(collisions.length, 2);
  assert.equal(collisions[0].stagedId, 'stg-1');
  assert.equal(collisions[0].keepBothFileName, 'KDM1_CalCert_2026 (1).pdf');
  assert.equal(collisions[1].stagedId, 'stg-2');
  assert.equal(collisions[1].keepBothFileName, 'STP02-FDT-TM3_rev7_260206 (1).pdf');

  // Resolve stg-1 as 'keep_both', stg-2 as 'overwrite'
  const res1 = applyCollisionResolutions(staged, collisions, {
    'stg-1': 'keep_both',
    'stg-2': 'overwrite',
  });
  assert.equal(res1.resolvedItems.length, 3);
  assert.equal(res1.keptBothCount, 1);
  assert.equal(res1.overwrittenCount, 1);
  assert.equal(res1.skippedCount, 0);
  assert.equal(res1.resolvedItems[0].fileName, 'KDM1_CalCert_2026 (1).pdf');
  assert.equal(res1.resolvedItems[0].collisionAction, 'keep_both');
  assert.equal(res1.resolvedItems[1].fileName, 'STP02-FDT-TM3_rev7_260206.pdf');
  assert.equal(res1.resolvedItems[1].collisionAction, 'overwrite');

  // Resolve stg-1 and stg-2 as 'skip'
  const res2 = applyCollisionResolutions(staged, collisions, {
    'stg-1': 'skip',
    'stg-2': 'skip',
  });
  assert.equal(res2.resolvedItems.length, 1);
  assert.equal(res2.skippedCount, 2);
  assert.equal(res2.resolvedItems[0].fileName, 'Brand_New_Field_Log.pdf');

  // Granular per-file progress tracking
  const progMap = createInitialFileProgressMap(staged, new Set(['stg-2']));
  assert.equal(progMap['stg-1'].status, 'queued');
  assert.equal(progMap['stg-1'].percent, 0);
  assert.equal(progMap['stg-2'].status, 'skipped');
  assert.equal(progMap['stg-2'].percent, 100);

  progMap['stg-1'] = buildFileProgressEntry('stg-1', 'KDM1_CalCert_2026.pdf', 'uploading', 50);
  progMap['stg-3'] = buildFileProgressEntry('stg-3', 'Brand_New_Field_Log.pdf', 'synced', 100);

  const overall = computeOverallBatchProgress(progMap, ['stg-1', 'stg-2', 'stg-3']);
  assert.equal(overall.totalCount, 3);
  assert.equal(overall.completedCount, 2); // stg-2 skipped + stg-3 synced
  assert.equal(overall.uploadingCount, 1);
  assert.equal(overall.overallPercent, 83); // (50 + 100 + 100) / 3 = 83.33 -> 83

  // Cancel ongoing upload marks queued/uploading files as cancelled while preserving completed/skipped
  const cancelledProg = markInFlightFilesCancelled(progMap, staged);
  assert.equal(cancelledProg['stg-1'].status, 'cancelled');
  assert.equal(cancelledProg['stg-1'].percent, 0);
  assert.equal(cancelledProg['stg-2'].status, 'skipped');
  assert.equal(cancelledProg['stg-3'].status, 'synced');

  // Undo batch upload rollback restores previous driveFiles, equipment, and tests
  const oldFile = {
    id: 'drv-old-1',
    fileName: 'Old_Cert.pdf',
    fileSize: '100 KB',
    targetKind: 'vault' as const,
    targetCode: '05_User_Uploads',
    docType: 'Drive Vault File',
    uploadedBy: 'Ben',
    uploadedAt: '2026-11-01 10:00',
    serverPath: 'GoogleDrive/05_User_Uploads/Old_Cert.pdf',
  };
  const batchFile1 = { ...oldFile, id: 'drv-batch-1', fileName: 'Batch_1.pdf' };
  const batchFile2 = { ...oldFile, id: 'drv-batch-2', fileName: 'Batch_2.pdf' };
  const prevEq = [sampleEq({ code: 'LT-FC-01', certFile: 'Orig_FC01.pdf' })];
  const mutatedEq = [sampleEq({ code: 'LT-FC-01', certFile: 'Batch_1.pdf' })];

  const undoResult = applyBatchUndoRollback({
    currentDriveFiles: [batchFile1, batchFile2],
    currentEquipment: mutatedEq,
    currentTests: [],
    snapshot: {
      batchId: 'batch-100',
      uploadedFileIds: ['drv-batch-1', 'drv-batch-2'],
      uploadedFileNames: ['Batch_1.pdf', 'Batch_2.pdf'],
      previousDriveFiles: [oldFile],
      previousEquipment: prevEq,
      previousTests: [],
      createdAt: '2026-11-07 15:00',
    },
  });
  assert.equal(undoResult.revertedCount, 2);
  assert.equal(undoResult.driveFiles.length, 1);
  assert.equal(undoResult.driveFiles[0].id, 'drv-old-1');
  assert.equal(undoResult.equipment[0].certFile, 'Orig_FC01.pdf');

  // Session Batch Summary dashboard metrics
  assert.equal(parseFileSizeToBytes('120 KB'), 120 * 1024);
  assert.equal(parseFileSizeToBytes('2.5 MB'), Math.round(2.5 * 1024 * 1024));
  assert.equal(formatSessionDuration(850), '0.8s');
  assert.equal(formatSessionDuration(65_000), '1m 5s');

  const summary = computeSessionBatchSummary({
    sessionBatches: [
      {
        batchId: 'sb-1',
        filesSynced: 3,
        totalBytes: 300 * 1024,
        durationMs: 1200,
        equipmentCount: 1,
        stpCount: 1,
        vaultCount: 1,
        timestamp: '2026-11-08T00:00:00Z',
      },
      {
        batchId: 'sb-2',
        filesSynced: 1,
        totalBytes: 200 * 1024,
        durationMs: 800,
        equipmentCount: 1,
        stpCount: 0,
        vaultCount: 0,
        timestamp: '2026-11-08T00:01:00Z',
      },
    ],
    stagedFiles: [{ fileSize: '50 KB', targetKind: 'vault' }],
    activeElapsedMs: 0,
  });

  assert.equal(summary.totalFilesSynced, 4);
  assert.equal(summary.batchesCount, 2);
  assert.equal(summary.totalSizeFormatted, '500 KB');
  assert.equal(summary.durationFormatted, '2.0s');
  assert.equal(summary.equipmentCount, 2);
  assert.equal(summary.stpCount, 1);
  assert.equal(summary.vaultCount, 1);
  assert.equal(summary.equipmentPct, 50);
  assert.equal(summary.stpPct, 25);
  assert.equal(summary.vaultPct, 25);
  assert.equal(summary.stagedCount, 1);
  assert.equal(summary.stagedSizeFormatted, '50 KB');
});

test('buildHoklasFieldWorksheetData, QR code matrix/lookup, 30/60/90d calibration forecast, and WhatsApp dispatch briefing', () => {
  const eq1 = sampleEq({
    code: 'LT-KM-04',
    name: 'Koden Ultrasonic Drilling Monitor',
    serial: 'KM-9004',
    tests: 'KD',
    testTags: ['KD'],
    due: '2026-11-25',
    certDue: '2026-11-25',
    currentLoan: {
      loanId: 'LN-99',
      borrowerName: 'Shih Chak Lung, Ben',
      borrowerStaffId: 'BS',
      jobNo: 'LT0001',
      siteLocation: 'Kai Tak Sports Park',
      checkoutAt: '2026-11-05 09:00',
      expectedReturn: '2026-11-15',
    },
  });
  const eq2 = sampleEq({
    code: 'LT-FC-01',
    name: 'Flow Cone Apparatus',
    serial: 'FC-101',
    tests: 'FC',
    testTags: ['FC'],
    due: '2026-12-20',
    certDue: '2026-12-20',
    currentLoan: null,
  });

  const ws = buildHoklasFieldWorksheetData({
    record: {
      id: 'KD-1024',
      jobNo: 'LT0001',
      stpCode: 'KD',
      title: 'Koden Ultrasonic Verticality Test',
      locationNote: 'Pile P18 (Depth 42.0m)',
      summary: '[Labtech Calc — Koden Test]\nDepth D = 42.0 m ｜ Offset e = 120 mm\nVerticality = 1:350 (Spec <= 1:100 -> PASS)',
      pass: true,
      testedAt: '2026-11-08 10:30',
      operatorName: 'Shih Chak Lung, Ben',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      signedBy: 'Ir. C.W. Lam',
      signedRole: 'Resident Site Staff',
      signedAt: '2026-11-08 10:35',
      sitePhotos: [
        {
          id: 'ph-1',
          fileName: 'Koden_Setup_P18.jpg',
          dataUrl: 'data:image/jpeg;base64,AAAA',
          caption: 'Pile P18 Koden Winch Setup',
        },
      ],
    },
    job: {
      no: 'LT0001',
      companyProjNo: 'CMP-26-001',
      shortName: 'Kai Tak Sports Park',
      date: '2026-10-01',
      project: 'Kai Tak Main Stadium Foundation',
      scope: 'KD + SO',
      client: 'CEDD / Hip Hing',
      site: 'Kai Tak Shing Kai Road',
      status: 'active',
    },
    equipment: [eq1, eq2],
    tests: [
      {
        code: 'KD',
        name: 'Koden Ultrasonic Echo Sounding',
        short: 'Koden',
        std: 'CS1 / TM3',
        stp: 'STP02',
        stpDocCode: 'STP02-FDT-TM3',
        stpRev: 'Rev.7',
        stpEffectiveDate: '2026-02-06',
        worksheetCode: 'FKD01',
        approvedSignatories: ['Shih Chak Lung, Ben (HOKLAS AS)'],
        acc: true,
        cost: null,
        keyParams: [],
        equipmentTypes: [],
        versions: [],
      },
    ],
  });

  assert.equal(ws.reportRefNo, 'HKL-LT0001-KD-1024');
  assert.equal(ws.worksheetCode, 'FKD01');
  assert.equal(ws.equipmentList.length, 1);
  assert.equal(ws.equipmentList[0].code, 'LT-KM-04');
  assert.equal(ws.equipmentList[0].source, 'on_site');
  assert.equal(ws.signedBy, 'Ir. C.W. Lam');
  assert.equal(ws.sitePhotos.length, 1);
  assert.ok(ws.rows.some((r) => r.parameter.includes('Verticality')));

  const matrix = generateDeterministicQrMatrix('LT-KM-04');
  assert.equal(matrix.length, 21);
  assert.equal(matrix[0].length, 21);
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][matrix.length - 1], true);
  assert.equal(matrix[matrix.length - 1][0], true);

  // Verify direct equipment detail & calibration certification status URL path & QR generation
  assert.equal(buildEquipmentCertStatusPath('lt-km-04'), '/equipment/LT-KM-04/cert');
  assert.equal(
    buildEquipmentQrUrl('LT-KM-04', 'https://labtech-nexus-lims.vercel.app'),
    'https://labtech-nexus-lims.vercel.app/equipment/LT-KM-04/cert'
  );
  assert.equal(
    parseEquipmentCodeFromUrl('https://labtech-nexus-lims.vercel.app/equipment/LT-KM-04/cert'),
    'LT-KM-04'
  );
  assert.equal(parseEquipmentCodeFromUrl('/equipment/LT-FC-01/cert'), 'LT-FC-01');
  assert.equal(parseEquipmentCodeFromUrl('/?eq=LT-SO-01'), 'LT-SO-01');

  const qrItem = generateEquipmentQrCode(eq1, { baseOrigin: 'https://labtech-nexus-lims.vercel.app' });
  assert.equal(qrItem.code, 'LT-KM-04');
  assert.equal(qrItem.path, '/equipment/LT-KM-04/cert');
  assert.equal(qrItem.url, 'https://labtech-nexus-lims.vercel.app/equipment/LT-KM-04/cert');
  assert.ok(qrItem.version >= 1);
  assert.equal(qrItem.matrix.length, qrItem.moduleCount);
  assert.ok(qrItem.svgMarkup.includes('<svg'));
  assert.ok(qrItem.svgDataUrl.startsWith('data:image/svg+xml;utf8,'));

  const batchQrs = generateAllEquipmentQrCodes([eq1, eq2], {
    baseOrigin: 'https://labtech-nexus-lims.vercel.app',
  });
  assert.equal(batchQrs.length, 2);
  assert.equal(batchQrs[0].path, '/equipment/LT-KM-04/cert');
  assert.equal(batchQrs[1].path, '/equipment/LT-FC-01/cert');

  const matchByDirectPath = matchEquipmentByQrOrQuery(
    [eq1, eq2],
    'https://labtech-nexus-lims.vercel.app/equipment/LT-KM-04/cert'
  );
  assert.equal(matchByDirectPath.length, 1);
  assert.equal(matchByDirectPath[0].code, 'LT-KM-04');

  const matchByUrl = matchEquipmentByQrOrQuery([eq1, eq2], 'https://labtech-nexus-lims.vercel.app/?eq=LT-KM-04');
  assert.equal(matchByUrl.length, 1);
  assert.equal(matchByUrl[0].code, 'LT-KM-04');

  const matchByShort = matchEquipmentByQrOrQuery([eq1, eq2], 'FC-01');
  assert.equal(matchByShort.length, 1);
  assert.equal(matchByShort[0].code, 'LT-FC-01');

  const calEvents: CalendarEvent[] = [
    {
      id: 'ev-kd-1',
      type: 'site_test',
      tests: ['KD'],
      title: 'Kai Tak Koden Test P19',
      date: '2026-11-28',
      timeSlot: '09:00 - 17:00',
      dateTentative: false,
      jobNo: 'LT0001',
      site: 'Kai Tak Sports Park',
      operators: ['Shih Chak Lung, Ben'],
      helpers: ['Zoe Chiu'],
      signatories: ['Lam Hoi Fan, James'],
      notes: 'Gate 3 entrance',
      status: 'planned',
    },
  ];

  const forecast = buildCalibrationForecast([eq1, eq2], calEvents, '2026-11-08');
  assert.equal(forecast.horizon30Date, '2026-12-08');
  assert.equal(forecast.horizon60Date, '2027-01-07');
  assert.equal(forecast.horizon90Date, '2027-02-06');
  assert.equal(forecast.counts.due30, 1);
  assert.equal(forecast.counts.due60, 1);
  assert.equal(forecast.counts.externalWithin90, 2);
  assert.equal(forecast.counts.withConflicts, 1);
  assert.equal(forecast.timelineClusters.length, 2);
  assert.equal(forecast.items[0].recommendedSendDate, '2026-11-11');
  assert.equal(forecast.items[0].isExternalCal, true);
  const csv = buildCalibrationRenewalCsv(forecast.items);
  assert.ok(csv.includes('LT-KM-04'));
  assert.ok(csv.includes('External Calibration (E)'));
  assert.ok(csv.includes('2026-11-11'));
  assert.ok(csv.includes('0-30 DAYS'));
  assert.ok(csv.includes('Kai Tak Sports Park'));

  assert.equal(addDaysIso('2026-11-08', 1), '2026-11-09');
  const dispatch = buildWhatsAppDispatchBriefing({
    targetDate: '2026-11-28',
    events: calEvents,
    jobs: [
      {
        no: 'LT0001',
        companyProjNo: 'CMP-26-001',
        shortName: 'Kai Tak Sports Park',
        date: '2026-10-01',
        project: 'Kai Tak Main Stadium',
        scope: 'KD + SO',
        client: 'CEDD',
        site: 'Kai Tak Shing Kai Road',
        status: 'active',
      },
    ],
    equipment: [eq1, eq2],
    lang: 'zh',
    refToday: '2026-11-08',
  });
  assert.equal(dispatch.eventCount, 1);
  assert.equal(dispatch.siteTestCount, 1);
  assert.ok(dispatch.text.includes('LT0001 (CMP-26-001)'));
  assert.ok(dispatch.text.includes('Shih Chak Lung, Ben'));
  assert.ok(dispatch.text.includes('LT-KM-04'));

  // Site Photo compression & Google Drive target folder bundling tests
  const scaled = computeScaledDimensions(3840, 2160, 960);
  assert.equal(scaled.width, 960);
  assert.equal(scaled.height, 540);
  assert.equal(computeCompressionSavedPct(400_000, 40_000), 90);

  const sampleJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
  assert.ok(estimateDataUrlBytes(sampleJpegDataUrl) > 10);

  const targetMeta = buildSitePhotoDriveTarget({
    jobNo: 'lt0002',
    stpCode: 'bl',
    recordId: 'BL-9988',
    index: 0,
    originalFileName: 'IMG_20261108_Rig.HEIC',
  });
  assert.equal(targetMeta.targetFolderId, TARGET_DRIVE_UPLOADS_FOLDER_ID);
  assert.equal(targetMeta.targetFileName, 'LT0002_BL-9988_P1_IMG_20261108_Rig.jpg');
  assert.equal(
    targetMeta.serverPath,
    'GoogleDrive/05_User_Uploads/LT0002_BL_Records/LT0002_BL-9988_P1_IMG_20261108_Rig.jpg'
  );

  const mergedPhotos = mergeAttachedSitePhotos(
    [{ id: 'p1', fileName: 'a.jpg', dataUrl: sampleJpegDataUrl }],
    [
      { id: 'p2', fileName: 'b.jpg', dataUrl: sampleJpegDataUrl },
      { id: 'p3', fileName: 'c.jpg', dataUrl: sampleJpegDataUrl },
    ]
  );
  assert.equal(mergedPhotos.length, 2);

  const driveBundle = buildFieldCalcRecordDriveBundle({
    record: {
      id: 'BL-9988',
      jobNo: 'LT0002',
      stpCode: 'BL',
      title: 'Grout Bleeding & Expansion',
      summary: 'Final Bleeding = 1.25% (PASS)',
      pass: true,
      testedAt: '2026-11-08 10:15',
      operatorName: 'Shih Chak Lung, Ben',
      sitePhotos: mergedPhotos,
    },
  });
  assert.equal(driveBundle.folderId, TARGET_DRIVE_UPLOADS_FOLDER_ID);
  assert.equal(driveBundle.photoPayloads.length, 2);
  assert.equal(driveBundle.allUploadPayloads.length, 3); // 2 compressed photos + 1 companion JSON manifest
  assert.equal(driveBundle.recordManifestPayload.fileName, 'LT0002_BL-9988_FieldCalcRecord.json');

  // Completed Excel Worksheet & Formal Report Generator tests (FC / BL / PLT)
  const fcMeta = getOfficialTemplateMeta('FC');
  assert.equal(fcMeta.templateFileCode, 'FST05-GTT-C939-2-260417_Worksheet_template.xlsx');
  assert.equal(fcMeta.accredited, true);

  const blMeta = getOfficialTemplateMeta('BL');
  assert.equal(blMeta.templateFileCode, 'FST04-GTT-C940-3-261001_Worksheet_template.xlsx');

  const pltMeta = getOfficialTemplateMeta('PLT');
  assert.equal(pltMeta.templateFileCode, 'STP07-PLT_Worksheet_template.xlsx');

  const blExcel = buildCompletedExcelWorkbookXml({
    stpCode: 'BL',
    reportRefNo: 'HKL-LT0002-BL-0018',
    testedAt: '2026-11-08 14:20',
    jobNo: 'LT0002',
    companyProjNo: 'DGP0104',
    projectTitle: 'Tung Chung New Town Extension',
    clientName: 'CEDD',
    siteLocation: 'Tung Chung East',
    locationNote: 'Batch #18',
    ambientTemp: '26.5 °C',
    weatherNote: 'Fine',
    operatorName: 'Shih Chak Lung, Ben',
    approvedSignatory: 'Lam Hoi Fan, James (HOKLAS AS)',
    pass: true,
    equipmentRows: [
      {
        code: 'LT-GC-04',
        name: '1000 mL Graduated Cylinder',
        model: '1000mL',
        serial: 'GC-04',
        calDue: '2026-12-30',
        source: 'on_site',
      },
    ],
    measurementRows: [
      { parameter: 'Initial Grout V1', value: '800 mL' },
      { parameter: 'Final Bleeding (%)', value: '1.38% (PASS)' },
    ],
    structured: {
      kind: 'BL',
      unit: 'mL',
      v1: 800,
      decantedVw: 11,
      specLimitPct: 2.0,
      finalBleedAmt: 11,
      finalBleedPct: 1.38,
      finalExpPct: 0.75,
      isPass: true,
      intervals: [
        { timeLabel: '15 min', v2: 802, vg: 800, bleedAmt: 2, bleedPct: 0.25, expPct: 0.25 },
        { timeLabel: '180 min (3hr)', v2: 806, vg: 795, bleedAmt: 11, bleedPct: 1.38, expPct: 0.75 },
      ],
    },
  });

  assert.ok(blExcel.fileName.startsWith('FST04-GTT-C940-3-261001'));
  assert.ok(blExcel.fileName.endsWith('_Completed.xlsx'));
  assert.deepEqual(blExcel.sheetNames, ['1_Completed_Worksheet', '2_Formal_Report']);
  assert.ok(blExcel.xmlContent.includes('Worksheet ss:Name="1_Completed_Worksheet"'));
  assert.ok(blExcel.xmlContent.includes('Worksheet ss:Name="2_Formal_Report"'));
  assert.ok(blExcel.xmlContent.includes('=MAX(0,RC[-2]-RC[-1])'));
  assert.ok(blExcel.xmlContent.includes('180 min (3hr)'));

  const kdMaps = buildOfficialTemplateSheetCellMaps({
    stpCode: 'KD',
    reportRefNo: 'HKL-LT0001-KD-0001',
    testedAt: '2026-11-08 10:00',
    jobNo: 'LT0001',
    companyProjNo: 'PRJ-01',
    projectTitle: 'Northern Metropolis Pile Works',
    clientName: 'CEDD',
    siteLocation: 'Kwu Tung North',
    locationNote: 'BP-12',
    ambientTemp: '26.5 °C',
    weatherNote: 'Fine',
    operatorName: 'Shih Chak Lung, Ben',
    approvedSignatory: 'Lam Hoi Fan, James',
    pass: true,
    equipmentRows: [],
    measurementRows: [],
  });
  assert.equal(kdMaps['xl/worksheets/sheet1.xml']?.H9, 'HKL-LT0001-KD-0001');
  assert.equal(kdMaps['xl/worksheets/sheet1.xml']?.H10, '2026-11-08');
  assert.equal(kdMaps['xl/worksheets/sheet4.xml']?.W27, 0);

  const sampleXml = '<sheetData><row r="7"><c r="H7" s="12"><f>Sheet1!H9</f><v>0</v></c><c r="C9" s="10"/></row></sheetData>';
  const injectedXml = injectCellsIntoSheetXml(sampleXml, { H7: 'LT0001', C9: 'CEDD' });
  assert.ok(injectedXml.includes('<f>Sheet1!H9</f><v>LT0001</v>'));
  assert.ok(injectedXml.includes('<is><t>CEDD</t></is>'));
});

