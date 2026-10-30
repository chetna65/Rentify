import request from 'supertest';
import { app } from '../src/app.js';
import { loginAs, closeConnections } from './helpers.js';

describe('Authentication & Sessions API (/api/auth)', () => {
  afterAll(async () => {
    await closeConnections();
  });

  describe('POST /api/auth/send-otp', () => {
    it('returns a generic success message for valid registered phone numbers without disclosing existence', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '+910000000001' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/OTP has been sent/i);
      expect(res.body.otp).toBeUndefined(); // Never expose OTP in response
    });

    it('returns the same generic response for non-registered phone numbers (prevents account enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '+919999999999' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/OTP has been sent/i);
    });

    it('rejects invalid or malformed phone formats with 400', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('successfully verifies correct OTP, sets httpOnly session cookie, and returns user profile', async () => {
      await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '+910000000001' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '+910000000001', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user.name).toBe('Aarav Sharma');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('rentify_session='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('rejects an incorrect OTP with 400 Bad Request', async () => {
      await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '+910000000001' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '+910000000001', otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/incorrect|invalid/i);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns authenticated user details when a valid session cookie is provided', async () => {
      const { cookie, user } = await loginAs('+910000000002'); // Vendor

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.role).toBe('vendor');
      expect(res.body.user.name).toBe(user.name);
    });

    it('returns 401 Unauthorized when no cookie or token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication required/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the session and clears the cookie, invalidating subsequent requests', async () => {
      const { cookie } = await loginAs('+910000000001');

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);

      // Verify that subsequent request using the same session cookie is rejected
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(401);
    });
  });
});
