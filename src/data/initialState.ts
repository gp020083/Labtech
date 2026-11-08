import s1 from './seed1.json';
import s4b from './seed4b.json';
import {
  UserAccount,
  EquipmentItem,
  EquipmentLoanRecord,
  JobItem,
  TestMethodItem,
  CalendarEvent,
} from '../types';
import { buildRealEquipment } from './realEquipmentSeed';
import { buildRealJobs, buildRealEvents } from './realJobsAndEvents';
import { buildRealTests } from './realTestsSeed';

export const MS_ACCOUNTS: UserAccount[] = [
  { id: 'usr-bs', staffId: 'BS', email: 'benshih@lab-tech.com.hk', name: 'Shih Chak Lung, Ben', zh: '施澤龍', title: 'Qualified Operator (KD/SO/FC/BL)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-jl', staffId: 'JL', email: 'jameslam@lab-tech.com.hk', name: 'Lam Hoi Fan, James', zh: '林凱帆', title: 'Laboratory Manager / Approved Signatory (AS)', role: 'as', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-rc', staffId: 'RC', email: 'raymondchu@lab-tech.com.hk', name: 'Chu Lap Man, Raymond', zh: '朱立文', title: 'Quality Manager / Equipment Coordinator / AS (KD)', role: 'quality', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-mft', staffId: 'MFT', email: 'mftang@lab-tech.com.hk', name: 'Tang Man Fu', zh: '鄧文富', title: 'Approved Signatory (SO / FC / BL / PLT)', role: 'as', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-wcy', staffId: 'WCY', email: 'wcyue@lab-tech.com.hk', name: 'Yue Wai Chun', zh: '余惠俊', title: 'Approved Signatory (SO)', role: 'as', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-pc', staffId: 'PC', email: 'peterchu@lab-tech.com.hk', name: 'Chu Kar Wai, Peter', zh: '朱家偉', title: 'Approved Signatory & Operator (PO / VC)', role: 'as', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-ckl', staffId: 'CKL', email: 'cklin@lab-tech.com.hk', name: 'Lin Chung Kit', zh: '連仲傑', title: 'Senior Qualified Operator (KD)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-bl', staffId: 'BL', email: 'brianli@lab-tech.com.hk', name: 'Li Chun Yin, Brian', zh: '李俊賢', title: 'Qualified Operator (KD/SO/FC/BL)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-dc', staffId: 'DC', email: 'dicksoncheung@lab-tech.com.hk', name: 'Cheung Dickson', zh: '張迪生', title: 'Qualified Operator (KD/SO/FC/BL)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-ky', staffId: 'KY', email: 'kimyam@lab-tech.com.hk', name: 'Yam Tsz Kin, Kim', zh: '任子健', title: 'Qualified Operator / Site Engineer (PO/VC)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-mc', staffId: 'MC', email: 'moonchan@lab-tech.com.hk', name: 'Chan Yuet Man, Moon', zh: '陳悅敏', title: 'Senior Environmental Officer / Operator (FC/BL/PLT)', role: 'operator', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-jlt', staffId: 'JLT', email: 'jefflai@lab-tech.com.hk', name: 'Lai Tsz Hin, Jeff', zh: '黎梓軒', title: 'Department in Charge (Admin)', role: 'admin', msTenant: 'Labtech Testing Ltd' },
  { id: 'usr-cl', staffId: 'CL', email: 'crimsonlau@lab-tech.com.hk', name: 'Lau Shing Chi, Crimson', zh: '劉承志', title: 'Design & Department Manager (Admin)', role: 'admin', msTenant: 'Labtech Testing Ltd' },
];

export function buildInitialJobs(): JobItem[] {
  return buildRealJobs();
}

export function buildInitialLoans(): EquipmentLoanRecord[] {
  return [
    { id: 'LN-261101', equipmentCode: 'LT-FC-02', borrowerName: 'Chan Yuet Man, Moon', borrowerStaffId: 'MC', jobNo: 'LT0002', siteLocation: 'PolyU Hung Hom (DGP0104)', checkoutAt: '2026-11-05 08:30', expectedReturn: '2026-11-09', remark: '帶往理大 DGP0104 工地執行 Grout Flow Cone 測試' },
    { id: 'LN-261102', equipmentCode: 'LT-PMC-01', borrowerName: 'Zoe Chiu', borrowerStaffId: 'ZC', jobNo: 'LT0002', siteLocation: 'PolyU Hung Hom (DGP0104)', checkoutAt: '2026-11-05 08:30', expectedReturn: '2026-11-09', remark: 'Grout Bleeding & Expansion 現場量筒' },
    { id: 'LN-261029', equipmentCode: 'LT-CA-01', borrowerName: 'Shih Chak Lung, Ben', borrowerStaffId: 'BS', jobNo: 'SO-LCK', siteLocation: 'Lai Chi Kok Reception Centre', checkoutAt: '2026-10-29 08:15', expectedReturn: '2026-10-30', returnedAt: '2026-10-29 18:10', returnedBy: 'Shih Chak Lung, Ben', returnStore: 'Office', returnCondition: 'good', remark: 'EBP06 Sonic Logging (SO-260005) 測試及培訓', returnRemark: '已完成測試並清潔探頭線組歸還儀器櫃' },
    { id: 'LN-261104', equipmentCode: 'LT-PO-02', borrowerName: 'Chu Kar Wai, Peter', borrowerStaffId: 'PC', jobNo: 'LT0004', siteLocation: 'Sandy Ridge / Lab Room', checkoutAt: '2026-11-04 14:00', expectedReturn: '2026-11-06', returnedAt: '2026-11-05 17:45', returnedBy: 'Yam Tsz Kin, Kim', returnStore: 'Office', returnCondition: 'good', remark: '沙嶺數據中心 PO-260004 (17 組岩芯) 點荷載測試', returnRemark: '測試完成，已核對圓錐壓頭無損並歸還' },
    { id: 'LN-261031', equipmentCode: 'LT-LC-01', borrowerName: 'Shih Chak Lung, Ben', borrowerStaffId: 'BS', jobNo: 'PLT-TRN', siteLocation: 'Depot 試驗場', checkoutAt: '2026-10-31 08:30', expectedReturn: '2026-10-31', returnedAt: '2026-10-31 13:00', returnedBy: 'Shih Chak Lung, Ben', returnStore: 'Office', returnCondition: 'good', remark: 'Plate Load Test 反力架組裝及首次培訓演練', returnRemark: '運作正常，已歸還 Office 儀器室' },
  ];
}

export function buildInitialEquipment(loans: EquipmentLoanRecord[]): EquipmentItem[] {
  return buildRealEquipment(loans);
}

export function buildInitialTests(): TestMethodItem[] {
  return buildRealTests();
}

export function buildInitialEvents(): CalendarEvent[] {
  return buildRealEvents();
}

export const STATIC_DATA = {
  staff: (s1 as any).te || [],
  holidays: (s4b as any).holidays || [],
};
