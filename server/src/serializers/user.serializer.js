/**
 * Serializes a user record to standard user JSON representation.
 * @param {object} row - User database row
 * @returns {object} Serialized user object
 */
export function serializeUser(row) {
  const user = {
    id: row.id,
    role: row.role,
    name: row.full_name || row.name,
    email: row.email || null,
    phone: row.phone,
    designation: row.designation || null,
    city: row.city_name || row.city || null,
  };

  if (row.role === 'partner') {
    user.badgeNumber = row.badgeNumber || row.badge_number || null;
    user.zone = row.zone || null;
  }

  return user;
}
