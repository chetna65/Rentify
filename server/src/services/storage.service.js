import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root server directory containing uploads/
const SERVER_ROOT = path.resolve(__dirname, '../../');
export const UPLOADS_DIR = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.join(SERVER_ROOT, 'uploads');

const MIME_EXTENSION_MAP = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/**
 * Save an uploaded file buffer to private disk storage under uploads/<listingId>/<random>.<ext>.
 * Computes SHA-256 digest and returns metadata.
 *
 * @param {object} file - Multer file object with buffer, mimetype, size
 * @param {string} listingId - UUID of the listing
 * @returns {Promise<{ storageKey: string, sha256: string, mimeType: string, sizeBytes: number }>}
 */
export async function saveFile(file, listingId) {
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const ext = MIME_EXTENSION_MAP[file.mimetype] || 'bin';
  const randomName = crypto.randomBytes(16).toString('hex');
  const filename = `${randomName}.${ext}`;

  // Target directory on disk: server/uploads/<listingId>
  const targetDir = path.join(UPLOADS_DIR, listingId);
  await fs.mkdir(targetDir, { recursive: true });

  const absolutePath = path.join(targetDir, filename);
  await fs.writeFile(absolutePath, file.buffer);

  // Relative storage key (relative to server root, avoiding absolute paths or URLs)
  const storageKey = `uploads/${listingId}/${filename}`;

  return {
    storageKey,
    sha256,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}

/**
 * Remove all uploaded files associated with a listing (used for rollback/compensation).
 *
 * @param {string} listingId
 */
export async function deleteListingUploads(listingId) {
  try {
    const targetDir = path.join(UPLOADS_DIR, listingId);
    await fs.rm(targetDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to clean up uploads for listing ${listingId}:`, err.message);
  }
}
