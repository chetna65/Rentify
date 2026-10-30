import { HttpError } from './httpError.js';

/**
 * Normalizes any Indian phone input into the standard E.164 format (+91 followed by 10 digits).
 * Handles formats like:
 *   "+91 98222 33410", "9822233410", "09822233410", "+919822233410", "+91 00000 00001"
 *
 * @param {string} raw - Raw input phone number
 * @returns {string} Normalized phone in format "+91XXXXXXXXXX"
 * @throws {HttpError} If the phone number is invalid
 */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') {
    throw HttpError.badRequest('Phone number must be a string');
  }

  // Remove spaces, dashes, dots, parentheses
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  let digits = '';
  if (/^\+91[0-9]{10}$/.test(cleaned)) {
    digits = cleaned.slice(3);
  } else if (/^0[0-9]{10}$/.test(cleaned)) {
    digits = cleaned.slice(1);
  } else if (/^91[0-9]{10}$/.test(cleaned)) {
    digits = cleaned.slice(2);
  } else if (/^[0-9]{10}$/.test(cleaned)) {
    digits = cleaned;
  } else {
    throw HttpError.badRequest(
      'Invalid Indian mobile phone number. Expected 10 digits (optionally prefixed with +91 or 0).'
    );
  }

  return `+91${digits}`;
}

/**
 * Helper to check if a phone string is a valid Indian phone number without throwing.
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidIndianPhone(raw) {
  try {
    normalizePhone(raw);
    return true;
  } catch {
    return false;
  }
}
