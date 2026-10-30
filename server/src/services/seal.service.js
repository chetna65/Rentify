import { mysqlPool } from '../config/mysql.js';

/**
 * Generate a candidate seal ID adhering to: MH-<city code>-<year>-<4 digits>.
 * E.g., MH-NGP-2026-4412
 *
 * @param {string} cityCode - 3-letter city code (e.g. NGP, PUN)
 * @param {number} [year] - Defaults to current year (e.g. 2026)
 * @returns {string}
 */
export function generateCandidateSeal(cityCode, year = new Date().getFullYear()) {
  const code = (cityCode || 'MH').slice(0, 3).toUpperCase();
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `MH-${code}-${year}-${random4}`;
}

/**
 * Ensures a unique verification seal ID by testing against existing listings.seal_id
 * and retrying up to maxRetries if a collision occurs.
 *
 * @param {import('mysql2/promise').PoolConnection} connection - Active transaction connection
 * @param {string} cityCode - 3-letter city code
 * @param {number} [maxRetries=5]
 * @returns {Promise<string>} Unique seal ID
 */
export async function generateUniqueSeal(connection, cityCode, maxRetries = 5) {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const candidate = generateCandidateSeal(cityCode, year);

    // Query inside transaction to check uniqueness
    const [rows] = await connection.query(
      'SELECT id FROM listings WHERE seal_id = ? LIMIT 1 FOR UPDATE',
      [candidate]
    );

    if (rows.length === 0) {
      return candidate;
    }
  }

  // Fallback with high-entropy timestamp if collisions persist
  const timestamp4 = Date.now().toString().slice(-4);
  return `MH-${(cityCode || 'MH').slice(0, 3).toUpperCase()}-${year}-${timestamp4}`;
}
