import request from 'supertest';
import { app } from '../src/app.js';
import { loginAs, closeConnections } from './helpers.js';

describe('Role-Based Access Control Permissions', () => {
  let customer;
  let vendor;
  let admin;
  let partner;

  const DUMMY_UUID = '00000000-0000-4000-8000-000000000000';

  beforeAll(async () => {
    customer = await loginAs('+910000000001');
    vendor = await loginAs('+910000000002');
    admin = await loginAs('+910000000003');
    partner = await loginAs('+910000000004');
  });

  afterAll(async () => {
    await closeConnections();
  });

  describe('Unauthenticated Requests (Missing Session) -> 401 Unauthorized', () => {
    it('rejects unauthenticated requests to customer routes', async () => {
      const res = await request(app).get('/api/me/saved');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to vendor routes', async () => {
      const res = await request(app).get('/api/vendor/listings');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to admin routes', async () => {
      const res = await request(app).get('/api/admin/queue');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to partner routes', async () => {
      const res = await request(app).get('/api/partner/assignments');
      expect(res.status).toBe(401);
    });
  });

  describe('Customer Routes (Protected for Customer Role Only)', () => {
    it('blocks vendors from GET /api/me/saved with 403', async () => {
      const res = await request(app)
        .get('/api/me/saved')
        .set('Cookie', vendor.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks admins from POST /api/me/saved/:listingId with 403', async () => {
      const res = await request(app)
        .post(`/api/me/saved/${DUMMY_UUID}`)
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks partners from POST /api/listings/:id/feedback with 403', async () => {
      const res = await request(app)
        .post(`/api/listings/${DUMMY_UUID}/feedback`)
        .set('Cookie', partner.cookie)
        .send({ rating: 5, comment: 'Illegal partner feedback' });
      expect(res.status).toBe(403);
    });
  });

  describe('Vendor Routes (Protected for Vendor Role Only)', () => {
    it('blocks customers from GET /api/vendor/listings with 403', async () => {
      const res = await request(app)
        .get('/api/vendor/listings')
        .set('Cookie', customer.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks admins from POST /api/vendor/listings with 403', async () => {
      const res = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks partners from POST /api/vendor/listings/:id/resubmit with 403', async () => {
      const res = await request(app)
        .post(`/api/vendor/listings/${DUMMY_UUID}/resubmit`)
        .set('Cookie', partner.cookie);
      expect(res.status).toBe(403);
    });
  });

  describe('Admin Routes (Protected for Admin Role Only)', () => {
    it('blocks customers from GET /api/admin/queue with 403', async () => {
      const res = await request(app)
        .get('/api/admin/queue')
        .set('Cookie', customer.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks vendors from PATCH /api/admin/listings/:id/assign with 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${DUMMY_UUID}/assign`)
        .set('Cookie', vendor.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks partners from GET /api/admin/audit with 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', partner.cookie);
      expect(res.status).toBe(403);
    });
  });

  describe('Partner Routes (Protected for Partner Role Only)', () => {
    it('blocks customers from GET /api/partner/assignments with 403', async () => {
      const res = await request(app)
        .get('/api/partner/assignments')
        .set('Cookie', customer.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks vendors from POST /api/partner/assignments/:id/inspection with 403', async () => {
      const res = await request(app)
        .post('/api/partner/assignments/1/inspection')
        .set('Cookie', vendor.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks admins from POST /api/partner/assignments/:id/inspection with 403', async () => {
      const res = await request(app)
        .post('/api/partner/assignments/1/inspection')
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(403);
    });
  });
});
