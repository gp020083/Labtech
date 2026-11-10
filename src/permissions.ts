import { useApp } from './store';
import type { UserRole } from './types';

/**
 * Role-based visibility for the LabTech platform.
 *
 * Operators keep everything they need on site: viewing / downloading documents,
 * running calculators, saving test records, attaching site photos and completed
 * worksheets, equipment checkout / return and QR scanning.
 *
 * Management actions that change controlled data are limited to supervisors
 * (AS) or the quality / admin team.
 */
export interface Permissions {
  role: UserRole;
  /** Add STP, upload controlled STP PDFs, upload cal certs, batch Drive upload */
  canManageDocs: boolean;
  /** Add equipment, print QR labels, upload cal certs against equipment */
  canManageEquipment: boolean;
  /** Add / edit project sites */
  canManageSites: boolean;
  /** Add / edit schedule events and send WhatsApp dispatch */
  canManageSchedule: boolean;
  /** Delete saved test records */
  canDeleteRecords: boolean;
  /** Reset demo data */
  canResetDemo: boolean;
}

export function getPermissions(role: UserRole | undefined): Permissions {
  const r: UserRole = role || 'operator';
  const isQualityTeam = r === 'quality' || r === 'admin';
  const isSupervisor = isQualityTeam || r === 'as';
  return {
    role: r,
    canManageDocs: isQualityTeam,
    canManageEquipment: isQualityTeam,
    canManageSites: isSupervisor,
    canManageSchedule: isSupervisor,
    canDeleteRecords: isQualityTeam,
    canResetDemo: r === 'admin',
  };
}

export function usePermissions(): Permissions {
  const { user } = useApp();
  return getPermissions(user?.role);
}
