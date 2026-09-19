export const STAFF_ROLES = ['operations_supervisor', 'designer', 'production_operator', 'quality_control', 'dispatch'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export type Role = 'admin' | StaffRole;
export const PERMISSIONS = ['operations.read', 'jobs.release', 'jobs.assign', 'jobs.note', 'jobs.artwork', 'jobs.production', 'jobs.qc', 'jobs.dispatch', 'jobs.supervise'] as const;
export type Permission = typeof PERMISSIONS[number];

const rolePermissions: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  operations_supervisor: PERMISSIONS,
  designer: ['operations.read', 'jobs.note', 'jobs.artwork'],
  production_operator: ['operations.read', 'jobs.note', 'jobs.production'],
  quality_control: ['operations.read', 'jobs.note', 'jobs.qc'],
  dispatch: ['operations.read', 'jobs.note', 'jobs.dispatch'],
};
export function isRole(role: string): role is Role {
  return Object.prototype.hasOwnProperty.call(rolePermissions, role);
}
export function permissionsForRole(role: string): readonly Permission[] {
  return isRole(role) ? [...rolePermissions[role]] : [];
}
export function hasPermission(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
