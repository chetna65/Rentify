import crypto from 'node:crypto';
import { mysqlPool } from '../config/mysql.js';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';
import { HttpError } from '../utils/httpError.js';
import { serializeUser } from '../serializers/user.serializer.js';

/**
 * Interface definition for OTP Provider.
 * Allows seamless swapping of the development OTP store with Firebase Phone Auth in the future.
 *
 * @interface IOtpProvider
 * @method sendOtp(phone: string): Promise<{ success: boolean }>
 * @method verifyOtp(phone: string, code: string): Promise<{ valid: boolean, error?: string }>
 */

/**
 * In-memory development OTP provider with 5-minute expiration and 5 max attempts.
 * @implements {IOtpProvider}
 */
export class DevOtpProvider {
  /**
   * @param {string} [defaultOtp='123456']
   * @param {number} [ttlMinutes=5]
   * @param {number} [maxAttempts=5]
   */
  constructor(defaultOtp = '123456', ttlMinutes = 5, maxAttempts = 5) {
    this.defaultOtp = defaultOtp;
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxAttempts = maxAttempts;
    this.store = new Map(); // phone -> { otp, expiresAt, attempts }
  }

  /**
   * Create and store an OTP for the phone number.
   * @param {string} phone - Normalized E.164 phone number
   * @returns {Promise<{ success: boolean }>}
   */
  async sendOtp(phone) {
    this.store.set(phone, {
      otp: this.defaultOtp,
      expiresAt: Date.now() + this.ttlMs,
      attempts: 0,
    });
    return { success: true };
  }

  /**
   * Validate the submitted OTP. Tracks and limits verification attempts.
   * @param {string} phone - Normalized E.164 phone number
   * @param {string} inputOtp - User-entered OTP string
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async verifyOtp(phone, inputOtp) {
    const record = this.store.get(phone);
    if (!record) {
      return { valid: false, error: 'OTP expired or not requested. Please request a new OTP.' };
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(phone);
      return { valid: false, error: 'OTP has expired. Please request a new OTP.' };
    }

    record.attempts += 1;
    if (record.attempts > this.maxAttempts) {
      this.store.delete(phone);
      return { valid: false, error: 'Too many failed verification attempts. Please request a new OTP.' };
    }

    if (record.otp !== inputOtp) {
      const remaining = this.maxAttempts - record.attempts;
      return {
        valid: false,
        error: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      };
    }

    // Correct OTP: consume it to prevent replay
    this.store.delete(phone);
    return { valid: true };
  }
}

// Active OTP provider instance (can be swapped with Firebase in production)
export const otpProvider = new DevOtpProvider(env.DEV_OTP || '123456', 5, 5);

/**
 * Handle OTP dispatch request.
 * Prevents account enumeration by returning the exact same response regardless of whether the user exists.
 *
 * @param {string} rawPhone
 * @returns {Promise<{ message: string }>}
 */
export async function sendOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);

  // Check if active user exists with this phone
  const [rows] = await mysqlPool.query(
    'SELECT id FROM users WHERE phone = ? AND is_active = 1 LIMIT 1',
    [phone]
  );

  if (rows.length > 0) {
    await otpProvider.sendOtp(phone);
  }

  // Always return the exact same generic message
  return {
    message: 'If this phone number is registered with Rentify, an OTP has been sent.',
  };
}

/**
 * Verify OTP, create session, and return session token + user details.
 *
 * @param {object} params
 * @param {string} params.rawPhone
 * @param {string} params.otp
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<{ rawToken: string, user: object, expiresAt: Date }>}
 */
export async function verifyOtpAndCreateSession({ rawPhone, otp, ipAddress = null, userAgent = null }) {
  const phone = normalizePhone(rawPhone);

  // 1. Verify OTP with provider
  const verifyResult = await otpProvider.verifyOtp(phone, otp);
  if (!verifyResult.valid) {
    throw HttpError.badRequest(verifyResult.error || 'Invalid OTP code');
  }

  // 2. Fetch user details from MySQL
  const [userRows] = await mysqlPool.query(
    `SELECT 
       u.id, 
       u.role, 
       u.full_name, 
       u.phone, 
       u.email, 
       u.designation, 
       u.is_active,
       c.name AS city_name,
       pp.badge_number,
       pp.zone
     FROM users u
     LEFT JOIN cities c ON c.id = u.city_id
     LEFT JOIN partner_profiles pp ON pp.user_id = u.id
     WHERE u.phone = ? AND u.is_active = 1
     LIMIT 1`,
    [phone]
  );

  if (userRows.length === 0) {
    throw HttpError.unauthorized('No active user account found matching this phone number.');
  }

  const user = userRows[0];

  // 3. Generate a cryptographically random 32-byte session token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 4. Calculate expiration timestamp from SESSION_TTL_HOURS
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
  const sessionId = crypto.randomUUID();

  // 5. Store session in MySQL (only SHA-256 hash is persisted)
  await mysqlPool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      user.id,
      tokenHash,
      expiresAt,
      ipAddress ? ipAddress.slice(0, 45) : null,
      userAgent ? userAgent.slice(0, 255) : null,
    ]
  );

  return {
    rawToken,
    user: serializeUser(user),
    expiresAt,
  };
}

/**
 * Look up a session by raw token string, ensuring it is neither revoked nor expired.
 * Also updates last_seen_at.
 *
 * @param {string} rawToken
 * @returns {Promise<{ user: object, session: object }|null>}
 */
export async function getSessionUser(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const [rows] = await mysqlPool.query(
    `SELECT 
       s.id AS session_id,
       s.expires_at,
       s.revoked_at,
       u.id, 
       u.role, 
       u.full_name, 
       u.phone, 
       u.email, 
       u.designation, 
       u.is_active,
       c.name AS city_name,
       pp.badge_number,
       pp.zone
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN cities c ON c.id = u.city_id
     LEFT JOIN partner_profiles pp ON pp.user_id = u.id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW(3)
       AND u.is_active = 1
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  // Update last_seen_at asynchronously
  mysqlPool
    .query('UPDATE sessions SET last_seen_at = NOW(3) WHERE id = ?', [row.session_id])
    .catch((err) => console.error('Failed to update last_seen_at:', err.message));

  return {
    session: {
      id: row.session_id,
      expiresAt: row.expires_at,
    },
    user: serializeUser(row),
  };
}

/**
 * Revoke an active session.
 *
 * @param {string} rawToken
 * @returns {Promise<boolean>}
 */
export async function logout(rawToken) {
  if (!rawToken) return false;

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const [result] = await mysqlPool.query(
    'UPDATE sessions SET revoked_at = NOW(3) WHERE token_hash = ? AND revoked_at IS NULL',
    [tokenHash]
  );

  return result.affectedRows > 0;
}
