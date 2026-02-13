/**
 * Permission checking utilities
 */
import { ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../constants';

/**
 * Check if a role has permission for a given action.
 * @param {string} role - User role (admin, manager, tech, viewer, member)
 * @param {string} action - Permission key (e.g. 'nav.settings', 'edit.quote')
 * @returns {boolean}
 */
export function hasPermission(role, action) {
  const r = role === 'member' ? 'viewer' : (role || 'viewer');
  const allowed = ROLE_PERMISSIONS[action];
  return allowed ? allowed.includes(r) : false;
}

/**
 * Filter an array of items by role permission.
 * Items with a `permission` property are checked; items without are always included.
 * @param {string} role
 * @param {Array<{permission?: string}>} items
 * @returns {Array}
 */
export function filterByPermission(role, items) {
  return items.filter((item) => !item.permission || hasPermission(role, item.permission));
}

/**
 * Check if roleA is at or above roleB in the hierarchy.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export function isRoleAtLeast(roleA, roleB) {
  const norm = (r) => r === 'member' ? 'viewer' : (r || 'viewer');
  const idxA = ROLE_HIERARCHY.indexOf(norm(roleA));
  const idxB = ROLE_HIERARCHY.indexOf(norm(roleB));
  return idxA !== -1 && idxB !== -1 && idxA <= idxB;
}
