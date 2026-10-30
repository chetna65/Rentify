import request from 'supertest';
import { app } from '../src/app.js';
import { closeMySQLPool, mysqlPool } from '../src/config/mysql.js';
import { closeMongo } from '../src/config/mongo.js';

/**
 * Log in a user by phone and return their authentication cookie and user object.
 *
 * @param {string} phone
 * @param {string} [otp='123456']
 * @returns {Promise<{ cookie: string, user: object }>}
 */
export async function loginAs(phone, otp = '123456') {
  await request(app)
    .post('/api/auth/send-otp')
    .send({ phone });

  const res = await request(app)
    .post('/api/auth/verify-otp')
    .send({ phone, otp });

  if (res.status !== 200) {
    throw new Error(`Failed to log in as ${phone}: ${JSON.stringify(res.body)}`);
  }

  const cookieHeader = res.headers['set-cookie'];
  const rawCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  const cookie = rawCookie?.split(';')[0];

  return {
    cookie,
    user: res.body.user,
  };
}

/**
 * Close open database connections after test execution.
 */
export async function closeConnections() {
  await closeMySQLPool().catch(() => {});
  await closeMongo().catch(() => {});
}
