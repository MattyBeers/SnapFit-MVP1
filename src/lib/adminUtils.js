/**
 * Admin Utilities for SnapFit
 * Centralized admin checks and permissions for managing multiple admins
 */

// Founder/Super Admin (user1) - has ability to add/remove other admins
const FOUNDER_ID = 'user1';
const FOUNDER_EMAIL = 'beersmi7@outlook.com';

/**
 * Get list of admin users from localStorage
 * @returns {Array} Array of admin user objects
 */
function getAdminList() {
  try {
    const stored = localStorage.getItem('snapfit_admins');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading admin list:', error);
  }
  
  // Default: user1 is always admin
  return [{
    id: '1',
    username: 'user1',
    email: 'user1@example.com',
    role: 'founder',
    addedDate: new Date().toISOString()
  }];
}

/**
 * Save admin list to localStorage
 * @param {Array} admins - Array of admin user objects
 */
function saveAdminList(admins) {
  try {
    localStorage.setItem('snapfit_admins', JSON.stringify(admins));
    return true;
  } catch (error) {
    console.error('Error saving admin list:', error);
    return false;
  }
}

/**
 * Check if a user is the founder (user1)
 * @param {Object} user - User object from auth context
 * @returns {boolean} True if user is founder
 */
export function isFounder(user) {
  if (!user) return false;
  
  // Primary check: email (most reliable)
  if (user.email === FOUNDER_EMAIL) return true;
  
  // Fallback checks
  return (
    user.username === FOUNDER_ID ||
    user.id === '1' ||
    user.id === FOUNDER_ID
  );
}

/**
 * Check if a user is an admin (founder or added admin)
 * @param {Object} user - User object from auth context
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  if (!user) return false;
  
  console.log('🔍 isAdmin check - user:', user);
  
  // Founder is always admin
  if (isFounder(user)) {
    console.log('✅ User is founder');
    return true;
  }
  
  // Check admin list (prioritize email)
  const admins = getAdminList();
  const isInAdminList = admins.some(admin => 
    (user.email && admin.email === user.email) ||
    (user.username && admin.username === user.username) ||
    (user.id && admin.id === user.id)
  );
  
  console.log(isInAdminList ? '✅ User in admin list' : '❌ User not in admin list');
  return isInAdminList;
}

/**
 * Add a new admin (founder only)
 * @param {Object} currentUser - Current user (must be founder)
 * @param {Object} newAdmin - User to add as admin
 * @returns {Object} Result with success and message
 */
export function addAdmin(currentUser, newAdmin) {
  if (!isFounder(currentUser)) {
    return { success: false, message: 'Only the founder can add admins' };
  }
  
  if (!newAdmin || !newAdmin.id) {
    return { success: false, message: 'Invalid user data' };
  }
  
  const admins = getAdminList();
  
  // Check if already admin
  if (admins.some(a => a.id === newAdmin.id || a.email === newAdmin.email)) {
    return { success: false, message: 'User is already an admin' };
  }
  
  // Add new admin
  const adminRecord = {
    id: newAdmin.id,
    username: newAdmin.username,
    email: newAdmin.email,
    role: 'admin',
    addedBy: currentUser.id,
    addedDate: new Date().toISOString()
  };
  
  admins.push(adminRecord);
  saveAdminList(admins);
  
  return { success: true, message: `${newAdmin.username} added as admin`, admin: adminRecord };
}

/**
 * Remove an admin (founder only, cannot remove founder)
 * @param {Object} currentUser - Current user (must be founder)
 * @param {string} adminId - ID of admin to remove
 * @returns {Object} Result with success and message
 */
export function removeAdmin(currentUser, adminId) {
  if (!isFounder(currentUser)) {
    return { success: false, message: 'Only the founder can remove admins' };
  }
  
  const admins = getAdminList();
  
  // Find admin to remove
  const adminToRemove = admins.find(a => a.id === adminId);
  
  if (!adminToRemove) {
    return { success: false, message: 'Admin not found' };
  }
  
  // Cannot remove founder
  if (adminToRemove.role === 'founder') {
    return { success: false, message: 'Cannot remove founder' };
  }
  
  // Remove admin
  const updatedAdmins = admins.filter(a => a.id !== adminId);
  saveAdminList(updatedAdmins);
  
  return { success: true, message: `${adminToRemove.username} removed from admins` };
}

/**
 * Get all current admins
 * @returns {Array} Array of admin user objects
 */
export function getAllAdmins() {
  return getAdminList();
}

/**
 * Check if user can delete an outfit (owner or admin)
 * @param {Object} user - Current user
 * @param {Object} outfit - Outfit object
 * @returns {boolean} True if user can delete
 */
export function canDeleteOutfit(user, outfit) {
  if (!user || !outfit) return false;
  
  // Check if user is admin
  if (isAdmin(user)) return true;
  
  // Check if user is owner (check multiple possible ID fields)
  const isOwner = 
    outfit.user_id === user.id ||
    outfit.userId === user.id ||
    outfit.user?.id === user.id;
  
  return isOwner;
}

/**
 * Check if user can moderate content (admin only)
 * @param {Object} user - Current user
 * @returns {boolean} True if user can moderate
 */
export function canModerateContent(user) {
  return isAdmin(user);
}

/**
 * Check if user can access admin features
 * @param {Object} user - Current user
 * @returns {boolean} True if user has admin access
 */
export function hasAdminAccess(user) {
  return isAdmin(user);
}

/**
 * Get admin badge component props
 * @param {Object} user - Current user
 * @returns {Object|null} Badge props or null if not admin
 */
export function getAdminBadge(user) {
  if (!isAdmin(user)) return null;
  
  return {
    text: '🛡️ Admin',
    style: {
      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      color: 'white',
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
    }
  };
}

/**
 * Admin permission levels
 */
export const ADMIN_PERMISSIONS = {
  DELETE_ANY_POST: 'delete_any_post',
  MODERATE_COMMENTS: 'moderate_comments',
  BAN_USERS: 'ban_users',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_USERS: 'manage_users',
  ACCESS_ALL_DATA: 'access_all_data'
};

/**
 * Check if user has specific admin permission
 * @param {Object} user - Current user
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(user, permission) {
  // user1 has all permissions
  return isAdmin(user);
}
