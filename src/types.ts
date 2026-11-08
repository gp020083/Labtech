export type UserRole = 'operator' | 'as' | 'quality' | 'admin';

export interface UserAccount {
  id: string;
  staffId: string;
  email: string;
  name: string;
  zh: string;
  title: string;
  role: UserRole;
  msTenant: string;
}

export interface SharedDocAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  docType?: string;
  uploadedBy: string;
  uploadedAt: string;
  serverPath: string;
  dataUrl?: string;
}

export interface EquipmentLoanRecord {
  id: string;
  equipmentCode: string;
  borrowerName: string;
  borrowerStaffId: string;
  jobNo: string;
  siteLocation: string;
  checkoutAt: string;
  expectedReturn: string;
  returnedAt?: string;
  returnedBy?: string;
  returnStore?: string;
  returnCondition?: 'good' | 'needs_check' | 'damaged';
  returnRemark?: string;
  remark?: string;
  updatedAt?: string;
}

export interface CalCertAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  certNo?: string;
  calLab?: string;
  dueDate?: string;
  eqCode?: string;
  uploadedBy: string;
  uploadedAt: string;
  serverPath: string;
  dataUrl?: string;
}

export interface EquipmentItem {
  code: string;
  name: string;
  model: string;
  serial: string;
  maker: string;
  inUse: string;
  tests: string;
  testTags?: string[];
  req: string;
  last: string;
  due: string;
  store: string;
  loc: string;
  remark: string;
  certDue?: string;
  certFile?: string;
  certUrl?: string;
  monthlyCheck?: boolean;
  calCerts?: CalCertAttachment[];
  updatedAt?: string;
  currentLoan?: {
    loanId: string;
    borrowerName: string;
    borrowerStaffId: string;
    jobNo: string;
    siteLocation: string;
    checkoutAt: string;
    expectedReturn: string;
    remark?: string;
  } | null;
}

export interface JobItem {
  no: string;
  companyProjNo: string;
  shortName: string;
  date: string;
  project: string;
  scope: string;
  client: string;
  site: string;
  mapAddress?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  tender?: string;
  contract?: string;
  contractNo?: string;
  status: 'active' | 'completed';
  remark?: string;
  updatedAt?: string;
}

export interface StpVersionInfo {
  ver: string;
  date: string;
  status: 'current' | 'obsolete';
  note?: string;
}

export interface TestMethodItem {
  code: string;
  name: string;
  short: string;
  std: string;
  stp: string;
  stpDocCode: string;
  stpRev: string;
  stpEffectiveDate: string;
  worksheetCode: string;
  stpPdfUrl?: string;
  worksheetUrl?: string;
  worksheetPdfUrl?: string;
  orderFormUrl?: string;
  dailyRecordUrl?: string;
  muTemplateUrl?: string;
  approvedSignatories?: string[];
  qualifiedOperators?: string[];
  acc: boolean;
  cost: number | null;
  keyParams: string[];
  equipmentTypes: string[];
  versions: StpVersionInfo[];
  calCerts?: CalCertAttachment[];
  stpFiles?: SharedDocAttachment[];
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  type: 'training' | 'hoklas' | 'site_test';
  tests: string[];
  title: string;
  date: string;
  timeSlot?: string;
  dateTentative: boolean;
  jobNo?: string;
  site: string;
  operators: string[];
  helpers: string[];
  signatories: string[];
  notes: string;
  status: 'planned' | 'done' | 'cancelled';
  attachments?: SharedDocAttachment[];
  updatedAt?: string;
}

export interface FieldCalcPhoto {
  id: string;
  fileName: string;
  dataUrl: string;
  caption?: string;
  mimeType?: string;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
  width?: number;
  height?: number;
  source?: 'camera' | 'picker' | 'sketch';
  targetFolderId?: string;
  serverPath?: string;
  driveId?: string;
  driveViewUrl?: string;
  syncStatus?: 'pending' | 'uploading' | 'synced' | 'local_saved';
}

export interface FieldCalcRecord {
  id: string;
  jobNo: string;
  stpCode: string;
  title: string;
  locationNote?: string;
  summary: string;
  pass: boolean;
  testedAt: string;
  operatorName: string;
  signatureDataUrl?: string;
  signedBy?: string;
  signedRole?: string;
  signedAt?: string;
  sitePhotos?: FieldCalcPhoto[];
  structuredData?: import('./utils/completedWorksheetGenerator').StructuredCalcPayload;
  driveFolderId?: string;
  driveManifestPath?: string;
  driveSyncStatus?: 'synced' | 'uploading' | 'local_saved';
  updatedAt?: string;
}


export interface DriveVaultFile {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType?: string;
  targetKind: 'equipment' | 'stp' | 'vault';
  targetCode: string;
  docType: string;
  uploadedBy: string;
  uploadedAt: string;
  serverPath: string;
  dataUrl?: string;
  driveId?: string;
  updatedAt?: string;
}

