import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { env } from './env.js';

function resolveSslCa(caValue) {
  if (!caValue) return undefined;
  const trimmed = caValue.trim();
  if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
    return trimmed;
  }
  try {
    if (fs.existsSync(trimmed)) {
      return fs.readFileSync(trimmed, 'utf8');
    }
  } catch {
    // If not a readable file path, return trimmed as fallback
  }
  return trimmed;
}

let ssl;
if (env.MYSQL_SSL) {
  ssl = { rejectUnauthorized: true };
  if (env.MYSQL_SSL_CA) {
    const ca = resolveSslCa(env.MYSQL_SSL_CA);
    if (ca) ssl.ca = ca;
  }
}

export const mysqlPool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  database: env.MYSQL_DATABASE,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4',
  ...(ssl ? { ssl } : {}),
});

/**
 * Execute a unit of work inside a managed MySQL transaction.
 * Automatically commits on return, rolls back on error, and releases connection.
 *
 * @template T
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr);
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeMySQLPool() {
  await mysqlPool.end();
}
