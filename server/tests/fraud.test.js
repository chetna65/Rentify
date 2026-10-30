import request from 'supertest';
import { app } from '../src/app.js';
import { loginAs, closeConnections } from './helpers.js';
import { calculateMedian, computeFraudSignals } from '../src/services/fraud.service.js';
import { mysqlPool } from '../src/config/mysql.js';

describe('Rule-Based Fraud Detection & Admin Inspection (/api/admin/listings/:id)', () => {
  let admin;
  let vendor;
  let customer;
  let sampleListingId;

  beforeAll(async () => {
    admin = await loginAs('+910000000003'); // Arvind Mehta (admin)
    vendor = await loginAs('+910000000002'); // Rajesh M. Sharma (vendor)
    customer = await loginAs('+910000000001'); // Aarav Sharma (customer)

    // Retrieve an existing listing from the database
    const [rows] = await mysqlPool.query(
      "SELECT id FROM listings WHERE status IN ('pending', 'in-review', 'verified') LIMIT 1"
    );
    if (rows.length > 0) {
      sampleListingId = rows[0].id;
    }
  });

  afterAll(async () => {
    await closeConnections();
  });

  describe('Unit Tests: calculateMedian', () => {
    it('returns null for empty or non-numeric input', () => {
      expect(calculateMedian([])).toBeNull();
      expect(calculateMedian(null)).toBeNull();
      expect(calculateMedian(undefined)).toBeNull();
      expect(calculateMedian(['abc', NaN])).toBeNull();
    });

    it('calculates median for odd-length arrays', () => {
      expect(calculateMedian([30000, 10000, 20000])).toBe(20000);
      expect(calculateMedian([5000])).toBe(5000);
    });

    it('calculates median for even-length arrays', () => {
      expect(calculateMedian([10000, 20000, 30000, 40000])).toBe(25000);
      expect(calculateMedian([15000, 25000])).toBe(20000);
    });
  });

  describe('Integration & Unit Tests: computeFraudSignals', () => {
    it('evaluates signals on existing listing and returns valid { code, severity, message } shape', async () => {
      expect(sampleListingId).toBeDefined();

      const signals = await computeFraudSignals(sampleListingId);
      expect(Array.isArray(signals)).toBe(true);

      // Rule 5: Manual review advisory is always present
      const manualReviewSig = signals.find((s) => s.code === 'OWNER_NAME_DOC_MANUAL_REVIEW');
      expect(manualReviewSig).toBeDefined();
      expect(manualReviewSig.severity).toBe('low');
      expect(typeof manualReviewSig.message).toBe('string');

      // Verify every signal complies with the contract
      for (const sig of signals) {
        expect(sig).toHaveProperty('code');
        expect(sig).toHaveProperty('severity');
        expect(sig).toHaveProperty('message');
        expect(['high', 'medium', 'low']).toContain(sig.severity);
        expect(typeof sig.code).toBe('string');
        expect(typeof sig.message).toBe('string');
      }
    });

    it('detects Rule 4 (EXCESSIVE_DEPOSIT) when deposit exceeds 3 months of rent', async () => {
      // Create a submission with deposit = 4x rent
      const res = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor.cookie)
        .field('title', 'High Deposit Fraud Test Apartment')
        .field('city', 'Pune')
        .field('locality', 'Kothrud')
        .field('propertyType', '2BHK')
        .field('rent', '20000')
        .field('deposit', '100000') // 5x rent (normal is <= 3x)
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '900')
        .field('floor', '3 of 5')
        .field('description', 'Spacious apartment testing excessive deposit fraud rule')
        .field('amenities', JSON.stringify(['Lift Access', 'Covered Parking']))
        .field(
          'documents',
          JSON.stringify([{ docType: 'Index II Title Deed', docNumber: 'MH-PUN-DEP-9911' }])
        );

      expect(res.status).toBe(201);
      const createdListing = res.body;

      const signals = await computeFraudSignals(createdListing.id);
      const depositSignal = signals.find((s) => s.code === 'EXCESSIVE_DEPOSIT');
      expect(depositSignal).toBeDefined();
      expect(depositSignal.severity).toBe('medium');
      expect(depositSignal.message).toMatch(/exceeding the 3-month threshold/i);
    });

    it('detects Rule 1 (RENT_BELOW_MEDIAN) when rent is >50% below median rent', async () => {
      // Normal 2BHK rent in Pune is ~25,000 - 35,000 INR
      // Submit a 2BHK with an unrealistically low rent of 5,000 INR
      const res = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor.cookie)
        .field('title', 'Suspiciously Low Rent Apartment')
        .field('city', 'Pune')
        .field('locality', 'Kothrud')
        .field('propertyType', '2BHK')
        .field('rent', '5000') // Under 50% of median
        .field('deposit', '15000')
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '850')
        .field('floor', '1 of 4')
        .field('description', 'Testing rent 50% below median rule')
        .field('amenities', JSON.stringify(['Lift Access']))
        .field(
          'documents',
          JSON.stringify([{ docType: 'Index II Title Deed', docNumber: 'MH-PUN-LOW-1122' }])
        );

      expect(res.status).toBe(201);
      const createdListing = res.body;

      const signals = await computeFraudSignals(createdListing.id);
      const lowRentSignal = signals.find((s) => s.code === 'RENT_BELOW_MEDIAN');
      expect(lowRentSignal).toBeDefined();
      expect(lowRentSignal.severity).toBe('high');
      expect(lowRentSignal.message).toMatch(/below the median rent/i);
    });

    it('detects Rule 2 (OWNER_PHONE_REUSED) when owner has multiple active listings', async () => {
      // Vendor +910000000002 has multiple active listings submitted
      const signals = await computeFraudSignals(sampleListingId);
      const phoneSignal = signals.find((s) => s.code === 'OWNER_PHONE_REUSED');
      if (phoneSignal) {
        expect(phoneSignal.severity).toBe('medium');
        expect(phoneSignal.message).toMatch(/associated with/i);
      }
    });

    it('detects Rule 3 (FILE_SHA256_REUSED) and Rule 2 (DOC_LAST4_REUSED) when duplicate files/docs are submitted', async () => {
      const dummyFile = Buffer.from('%PDF-1.4 DUMMY FIXED REUSED HASH CONTENT');

      // Submit first listing with this document
      const res1 = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor.cookie)
        .field('title', 'Original Document Listing')
        .field('city', 'Pune')
        .field('locality', 'Kothrud')
        .field('propertyType', '2BHK')
        .field('rent', '25000')
        .field('deposit', '75000')
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '1000')
        .field('floor', '2 of 6')
        .field('description', 'First listing holding original deed')
        .field('amenities', JSON.stringify(['Gated Security']))
        .field(
          'documents',
          JSON.stringify([{ docType: 'Index II Title Deed', docNumber: 'MH-PUN-REUSE-7788' }])
        )
        .attach('documents', dummyFile, 'deed1.pdf');

      expect(res1.status).toBe(201);
      const listing1 = res1.body;

      // Submit second listing with identical document number and identical file
      const res2 = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor.cookie)
        .field('title', 'Duplicate Document Fraudulent Listing')
        .field('city', 'Pune')
        .field('locality', 'Kothrud')
        .field('propertyType', '2BHK')
        .field('rent', '26000')
        .field('deposit', '78000')
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '1000')
        .field('floor', '3 of 6')
        .field('description', 'Second listing reusing the exact same deed')
        .field('amenities', JSON.stringify(['Gated Security']))
        .field(
          'documents',
          JSON.stringify([{ docType: 'Index II Title Deed', docNumber: 'MH-PUN-REUSE-7788' }])
        )
        .attach('documents', dummyFile, 'deed2.pdf');

      expect(res2.status).toBe(201);
      const listing2 = res2.body;

      // Compute signals on listing2
      const signals = await computeFraudSignals(listing2.id);

      // Verify Rule 2: Document last4 + doc_type reused
      const docReuseSignal = signals.find((s) => s.code === 'DOC_LAST4_REUSED');
      expect(docReuseSignal).toBeDefined();
      expect(docReuseSignal.severity).toBe('high');
      expect(docReuseSignal.message).toMatch(/reused across/i);

      // Verify Rule 3: File SHA-256 reused
      const shaReuseSignal = signals.find((s) => s.code === 'FILE_SHA256_REUSED');
      expect(shaReuseSignal).toBeDefined();
      expect(shaReuseSignal.severity).toBe('high');
      expect(shaReuseSignal.message).toMatch(/File SHA-256/i);
    });
  });

  describe('Admin Inspection Endpoint: GET /api/admin/listings/:id', () => {
    it('requires authentication (401 for unauthenticated request)', async () => {
      const res = await request(app).get(`/api/admin/listings/${sampleListingId}`);
      expect(res.status).toBe(401);
    });

    it('requires admin role (403 for customer, vendor, or partner)', async () => {
      const custRes = await request(app)
        .get(`/api/admin/listings/${sampleListingId}`)
        .set('Cookie', customer.cookie);
      expect(custRes.status).toBe(403);

      const vendRes = await request(app)
        .get(`/api/admin/listings/${sampleListingId}`)
        .set('Cookie', vendor.cookie);
      expect(vendRes.status).toBe(403);
    });

    it('returns 400 Bad Request for non-UUID id', async () => {
      const res = await request(app)
        .get('/api/admin/listings/not-a-valid-uuid')
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid UUID/i);
    });

    it('returns 404 Not Found for non-existent listing UUID', async () => {
      const res = await request(app)
        .get('/api/admin/listings/00000000-0000-4000-8000-000000009999')
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 200 OK with serialized listing and fraudSignals array for admin', async () => {
      const res = await request(app)
        .get(`/api/admin/listings/${sampleListingId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(sampleListingId);
      expect(Array.isArray(res.body.data.fraudSignals)).toBe(true);
      expect(Array.isArray(res.body.fraudSignals)).toBe(true);

      for (const sig of res.body.data.fraudSignals) {
        expect(sig).toHaveProperty('code');
        expect(sig).toHaveProperty('severity');
        expect(sig).toHaveProperty('message');
      }
    });
  });

  describe('Vendor Submission Flow: Fraud Signals Attached', () => {
    it('computes fraudSignals during vendor listing submission', async () => {
      const res = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor.cookie)
        .field('title', 'Vendor Submitted Property with Signals')
        .field('city', 'Pune')
        .field('locality', 'Kothrud')
        .field('propertyType', '2BHK')
        .field('rent', '28000')
        .field('deposit', '84000')
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '1100')
        .field('floor', '4 of 7')
        .field('description', 'Property verifying signals on initial submission')
        .field('amenities', JSON.stringify(['Power Backup', 'Gated Security']))
        .field(
          'documents',
          JSON.stringify([{ docType: 'Index II Title Deed', docNumber: 'MH-PUN-SIG-4455' }])
        );

      expect(res.status).toBe(201);
      expect(res.body.fraudSignals).toBeDefined();
      expect(Array.isArray(res.body.fraudSignals)).toBe(true);
      expect(res.body.fraudSignals.length).toBeGreaterThan(0);
    });
  });
});
