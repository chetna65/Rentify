import request from 'supertest';
import { app } from '../src/app.js';
import { loginAs, closeConnections } from './helpers.js';
import { RECOMMENDATION_WEIGHTS } from '../src/services/recommendation.service.js';

describe('Customer Personalized Recommendations API (GET /api/listings/recommended)', () => {
  let customer;
  let vendor;
  let admin;

  beforeAll(async () => {
    customer = await loginAs('+910000000001'); // Aarav Sharma (customer)
    vendor = await loginAs('+910000000002');   // Rajesh M. Sharma (vendor)
    admin = await loginAs('+910000000003');    // Arvind Mehta (admin)
  });

  afterAll(async () => {
    await closeConnections();
  });

  describe('Role-Based Access Control', () => {
    it('returns 401 Unauthorized when not logged in', async () => {
      const res = await request(app).get('/api/listings/recommended');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication required|unauthorized/i);
    });

    it('returns 403 Forbidden for vendor role', async () => {
      const res = await request(app)
        .get('/api/listings/recommended')
        .set('Cookie', vendor.cookie);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/forbidden|customer role/i);
    });

    it('returns 403 Forbidden for admin role', async () => {
      const res = await request(app)
        .get('/api/listings/recommended')
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(403);
    });

    it('returns 200 OK for authenticated customer', async () => {
      const res = await request(app)
        .get('/api/listings/recommended')
        .set('Cookie', customer.cookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });
  });

  describe('Recommendation Scoring & Response Contract', () => {
    it('exposes the documented weights constant summing to 1.0', () => {
      expect(RECOMMENDATION_WEIGHTS).toBeDefined();
      expect(RECOMMENDATION_WEIGHTS.BUDGET_FIT).toBe(0.3);
      expect(RECOMMENDATION_WEIGHTS.LOCALITY_MATCH).toBe(0.25);
      expect(RECOMMENDATION_WEIGHTS.SAFETY_SCORE).toBe(0.2);
      expect(RECOMMENDATION_WEIGHTS.CREDIBILITY_SCORE).toBe(0.15);
      expect(RECOMMENDATION_WEIGHTS.RATING_AVERAGE).toBe(0.1);

      const sum = Object.values(RECOMMENDATION_WEIGHTS).reduce((acc, w) => acc + w, 0);
      expect(Math.round(sum * 100) / 100).toBe(1.0);
    });

    it('returns at most 10 verified listings sorted by descending score with plain-English reasons', async () => {
      const res = await request(app)
        .get('/api/listings/recommended')
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.weights).toEqual(RECOMMENDATION_WEIGHTS);
      expect(res.body.count).toBeLessThanOrEqual(10);
      expect(res.body.recommendations.length).toBeLessThanOrEqual(10);

      const recs = res.body.recommendations;

      // Assert descending score ordering
      for (let i = 0; i < recs.length - 1; i++) {
        expect(recs[i].matchScore).toBeGreaterThanOrEqual(recs[i + 1].matchScore);
      }

      // Assert verified status and reasons structure
      for (const item of recs) {
        expect(item.status).toBe('verified');
        expect(item.verificationSealId).toBeDefined();
        expect(typeof item.matchScore).toBe('number');
        expect(Array.isArray(item.reasons)).toBe(true);
        expect(item.reasons.length).toBeGreaterThan(0);

        for (const reason of item.reasons) {
          expect(typeof reason).toBe('string');
        }
      }
    });

    it('boosts listings matching custom budget and preferred localities with explicit reasons', async () => {
      const res = await request(app)
        .get('/api/listings/recommended?minRent=10000&maxRent=35000&localities=Kothrud,Dharampeth')
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      const recs = res.body.recommendations;
      expect(recs.length).toBeGreaterThan(0);

      // Top recommendation should have budget reason
      const topRec = recs[0];
      const hasBudgetReason = topRec.reasons.some((r) => r.includes('budget'));
      expect(hasBudgetReason).toBe(true);

      // Check if any matching preferred locality displays the reason
      const localityRec = recs.find(
        (r) => r.locality && (r.locality.includes('Kothrud') || r.locality.includes('Dharampeth'))
      );
      if (localityRec) {
        const hasLocalityReason = localityRec.reasons.some((r) =>
          r.includes('In your preferred locality')
        );
        expect(hasLocalityReason).toBe(true);
      }
    });
  });
});
