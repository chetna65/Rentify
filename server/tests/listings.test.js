import request from 'supertest';
import { app } from '../src/app.js';
import { closeConnections } from './helpers.js';

describe('Public Listings Search & Filter API (/api/listings)', () => {
  afterAll(async () => {
    await closeConnections();
  });

  describe('GET /api/listings', () => {
    it('returns a paginated list of properties with default pagination', async () => {
      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.listings)).toBe(true);
      expect(res.body.listings.length).toBeLessThanOrEqual(50);

      const first = res.body.listings[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('rent');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('city');
    });

    it('filters listings strictly by city', async () => {
      const res = await request(app).get('/api/listings?city=Nagpur');

      expect(res.status).toBe(200);
      expect(res.body.listings.length).toBeGreaterThan(0);
      for (const item of res.body.listings) {
        expect(item.city).toBe('Nagpur');
      }
    });

    it('filters listings by multiple property types (e.g. 1RK, 1BHK)', async () => {
      const res = await request(app).get('/api/listings?types=1RK,1BHK');

      expect(res.status).toBe(200);
      for (const item of res.body.listings) {
        expect(['1RK', '1BHK']).toContain(item.propertyType);
      }
    });

    it('filters listings by maximum rent threshold', async () => {
      const maxRent = 22000;
      const res = await request(app).get(`/api/listings?maxRent=${maxRent}`);

      expect(res.status).toBe(200);
      for (const item of res.body.listings) {
        expect(item.rent).toBeLessThanOrEqual(maxRent);
      }
    });

    it('filters only verified listings when verifiedOnly=true is specified', async () => {
      const res = await request(app).get('/api/listings?verifiedOnly=true');

      expect(res.status).toBe(200);
      expect(res.body.listings.length).toBeGreaterThan(0);
      for (const item of res.body.listings) {
        expect(item.status).toBe('verified');
        expect(item.verificationSealId).toBeTruthy();
      }
    });

    it('sorts listings by price ascending (price-asc)', async () => {
      const res = await request(app).get('/api/listings?sort=price-asc&limit=10');

      expect(res.status).toBe(200);
      const rents = res.body.listings.map((l) => l.rent);
      for (let i = 1; i < rents.length; i++) {
        expect(rents[i]).toBeGreaterThanOrEqual(rents[i - 1]);
      }
    });

    it('sorts listings by price descending (price-desc)', async () => {
      const res = await request(app).get('/api/listings?sort=price-desc&limit=10');

      expect(res.status).toBe(200);
      const rents = res.body.listings.map((l) => l.rent);
      for (let i = 1; i < rents.length; i++) {
        expect(rents[i]).toBeLessThanOrEqual(rents[i - 1]);
      }
    });

    it('sorts listings using recommender priority (verified first, then credibility, then price)', async () => {
      const res = await request(app).get('/api/listings?sort=recommender&limit=10');

      expect(res.status).toBe(200);
      // All verified listings appear before pending/flagged listings
      let seenUnverified = false;
      for (const item of res.body.listings) {
        if (item.status !== 'verified') {
          seenUnverified = true;
        } else if (seenUnverified) {
          // If we see a verified listing after an unverified one, the sort failed
          expect('verified listing should not appear after unverified').toBe('');
        }
      }
    });

    it('respects limit and offset pagination parameters', async () => {
      const res1 = await request(app).get('/api/listings?limit=2&offset=0');
      const res2 = await request(app).get('/api/listings?limit=2&offset=2');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.listings.length).toBeLessThanOrEqual(2);
      expect(res2.body.listings.length).toBeLessThanOrEqual(2);

      if (res1.body.listings.length > 0 && res2.body.listings.length > 0) {
        expect(res1.body.listings[0].id).not.toBe(res2.body.listings[0].id);
      }
    });
  });

  describe('GET /api/listings/:id', () => {
    it('returns a specific listing with complete joined data and MongoDB details', async () => {
      const listRes = await request(app).get('/api/listings?limit=1');
      const sampleId = listRes.body.listings[0].id;

      const res = await request(app).get(`/api/listings/${sampleId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(sampleId);
      expect(res.body.title).toBeDefined();
      expect(res.body.description).toBeDefined();
      expect(Array.isArray(res.body.amenities)).toBe(true);
      expect(Array.isArray(res.body.documents)).toBe(true);
    });

    it('returns 404 Not Found for a non-existent UUID', async () => {
      const nonExistentUuid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const res = await request(app).get(`/api/listings/${nonExistentUuid}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 Bad Request for an invalid non-UUID identifier', async () => {
      const res = await request(app).get('/api/listings/invalid-id-1234');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
