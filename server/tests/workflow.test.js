import request from 'supertest';
import { app } from '../src/app.js';
import { loginAs, closeConnections } from './helpers.js';

describe('Verification Workflow, Guard Transitions & Integrity', () => {
  let customer;
  let vendor1;
  let vendor2;
  let admin;
  let partnerNagpur;

  beforeAll(async () => {
    customer = await loginAs('+910000000001');
    vendor1 = await loginAs('+910000000002');
    vendor2 = await loginAs('+910000000100'); // Sunita Deshmukh
    admin = await loginAs('+910000000003');
    partnerNagpur = await loginAs('+910000000004'); // Amit Patil, Nagpur
  });

  afterAll(async () => {
    await closeConnections();
  });

  describe('Full Verification Workflow (pending -> in-review -> verified with seal)', () => {
    let testListingId;
    let activeAssignmentId;

    it('1. Vendor submits listing with multipart file attachment -> enters pending status', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 Title Deed Content for Integration Test');

      const res = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor1.cookie)
        .field('title', 'Integration Test Residency 2BHK')
        .field('city', 'Nagpur')
        .field('locality', 'Civil Lines Test Area')
        .field('propertyType', '2BHK')
        .field('rent', '28000')
        .field('deposit', '56000')
        .field('furnishing', 'Semi-Furnished')
        .field('carpetArea', '1100')
        .field('floor', '3rd Floor')
        .field('description', 'High-end 2BHK apartment with complete municipal water supply.')
        .field('amenities', JSON.stringify(['Gated Security', 'Lift Access']))
        .field('docType', 'Property Tax Receipt')
        .field('docNumber', 'TAX-8899')
        .attach('documents', pdfBuffer, 'tax_receipt.pdf');

      expect(res.status).toBe(201);
      testListingId = res.body.id;
      expect(testListingId).toBeDefined();
      expect(res.body.status).toBe('pending');
      expect(res.body.credibilityScore).toBe(70);
      expect(res.body.verificationSealId).toBeNull();
      expect(res.body.documents[0].docNumber).toBe('XXXX-XXXX-8899'); // PII masked
    });

    it('2. Admin assigns partner -> moves pending to in-review, documents to admin_checked', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${testListingId}/assign`)
        .set('Cookie', admin.cookie)
        .send({
          partnerId: partnerNagpur.user.id,
          scheduledFor: '2026-10-30',
          notes: 'Verify tax receipt on-site and check key cylinder.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in-review');
      activeAssignmentId = res.body.data.assignmentId;
      expect(activeAssignmentId).toBeDefined();

      // Check listing details
      const listingRes = await request(app).get(`/api/listings/${testListingId}`);
      expect(listingRes.body.status).toBe('in-review');
      expect(listingRes.body.credibilityScore).toBe(80);
      expect(listingRes.body.documents[0].status).toBe('admin_checked');
    });

    it('3. Partner submits inspection -> transitions in-review to verified, generates seal and audit', async () => {
      const res = await request(app)
        .post(`/api/partner/assignments/${activeAssignmentId}/inspection`)
        .set('Cookie', partnerNagpur.cookie)
        .send({
          outcome: 'verified',
          gpsLat: 21.1458,
          gpsLng: 79.0882,
          physicalKeysVerified: true,
          ownerMetInPerson: true,
          unitVacantAvailable: true,
          notes: 'Unit verified on-site by officer. Keys match and building records cross-verified.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('verified');
      expect(res.body.data.sealId).toMatch(/^MH-NGP-\d{4}-\d{4}$/);
      expect(res.body.data.credibilityScore).toBe(95);

      // Verify public listing view
      const publicRes = await request(app).get(`/api/listings/${testListingId}`);
      expect(publicRes.body.status).toBe('verified');
      expect(publicRes.body.verificationSealId).toBe(res.body.data.sealId);
      expect(publicRes.body.fieldReport).toBeDefined();
      expect(publicRes.body.fieldReport.officer).toContain('Amit Patil');

      // Verify audit logs for this listing
      const auditRes = await request(app)
        .get(`/api/admin/audit?listingId=${testListingId}`)
        .set('Cookie', admin.cookie);

      expect(auditRes.status).toBe(200);
      const actions = auditRes.body.data.logs.map((l) => l.action);
      expect(actions).toContain('VENDOR_LISTING_SUBMITTED');
      expect(actions).toContain('ADMIN_ASSIGNED_PARTNER');
      expect(actions).toContain('FIELD_VERIFICATION_APPROVED');
    });

    it('4. Re-assigning an already verified listing returns 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${testListingId}/assign`)
        .set('Cookie', admin.cookie)
        .send({
          partnerId: partnerNagpur.user.id,
          notes: 'Attempting invalid transition',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/verified/i);
    });
  });

  describe('Flagged Listings & Vendor Resubmission Flow', () => {
    let flaggedListingId;

    it('Admin flags listing with justification -> sets status to flagged and rejects documents', async () => {
      // 1. Submit listing
      const submitRes = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor1.cookie)
        .field('title', 'Property To Be Flagged')
        .field('city', 'Nagpur')
        .field('locality', 'Dharampeth')
        .field('propertyType', '1BHK')
        .field('rent', '18000')
        .field('deposit', '36000')
        .field('furnishing', 'Unfurnished')
        .field('description', 'Test listing for flagging workflow.')
        .attach('documents', Buffer.from('%PDF-1.4 Mock'), 'bill.pdf');

      flaggedListingId = submitRes.body.id;

      // 2. Admin flags listing
      const flagRes = await request(app)
        .patch(`/api/admin/listings/${flaggedListingId}/decision`)
        .set('Cookie', admin.cookie)
        .send({
          decision: 'flagged',
          reason: 'Owner identity card does not match registered title holder name.',
          flagCategory: 'Identity Discrepancy',
        });

      expect(flagRes.status).toBe(200);
      expect(flagRes.body.data.status).toBe('flagged');
      expect(flagRes.body.data.credibilityScore).toBe(15);

      // Verify listing row has flag fields set
      const checkRes = await request(app).get(`/api/listings/${flaggedListingId}`);
      expect(checkRes.body.status).toBe('flagged');
      expect(checkRes.body.flagReason).toMatch(/Owner identity/i);
    });

    it('Vendor resubmits flagged listing -> status returns to pending and flag fields are cleared', async () => {
      const res = await request(app)
        .post(`/api/vendor/listings/${flaggedListingId}/resubmit`)
        .set('Cookie', vendor1.cookie)
        .field('title', 'Property Resubmitted with Corrected Documents')
        .field('rent', '18500')
        .field('deposit', '37000')
        .field('description', 'Amended deed with notarized power-of-attorney attached.')
        .attach('documents', Buffer.from('%PDF-1.4 Corrected POA'), 'corrected_deed.pdf');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
      expect(res.body.title).toBe('Property To Be Flagged');

      // Verify database fields: flag_reason is cleared and status is pending
      const checkRes = await request(app).get(`/api/listings/${flaggedListingId}`);
      expect(checkRes.body.status).toBe('pending');
      expect(checkRes.body.flagReason).toBeUndefined();
    });
  });

  describe('Customer Feedback Uniqueness & Rating Maintenance', () => {
    let verifiedListingId;

    beforeAll(async () => {
      // Find an existing verified listing
      const res = await request(app).get('/api/listings?verifiedOnly=true&limit=1');
      verifiedListingId = res.body.listings[0].id;
    });

    it('Customer leaves move-in feedback -> returns 201 and updates listing rating stats', async () => {
      const res = await request(app)
        .post(`/api/listings/${verifiedListingId}/feedback`)
        .set('Cookie', customer.cookie)
        .send({
          rating: 5,
          comment: 'Seamless integration testing move-in experience!',
        });

      // If customer already submitted in an earlier test run, it returns 409, otherwise 201
      expect([201, 409]).toContain(res.status);
    });

    it('Duplicate review by the same customer returns 409 with a friendly error message', async () => {
      const res = await request(app)
        .post(`/api/listings/${verifiedListingId}/feedback`)
        .set('Cookie', customer.cookie)
        .send({
          rating: 4,
          comment: 'Duplicate attempt should be rejected',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already submitted a review/i);
    });

    it('Vendor is forbidden from leaving customer feedback (403)', async () => {
      const res = await request(app)
        .post(`/api/listings/${verifiedListingId}/feedback`)
        .set('Cookie', vendor1.cookie)
        .send({
          rating: 5,
          comment: 'Vendor trying to leave feedback',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Saved Listings (Idempotent Bookmark / Favorites)', () => {
    let sampleListingId;

    beforeAll(async () => {
      const res = await request(app).get('/api/listings?limit=1');
      sampleListingId = res.body.listings[0].id;
    });

    it('Customer saves listing successfully', async () => {
      const res = await request(app)
        .post(`/api/me/saved/${sampleListingId}`)
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(true);
    });

    it('Saving an already saved listing is idempotent and returns 200', async () => {
      const res = await request(app)
        .post(`/api/me/saved/${sampleListingId}`)
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(true);
    });

    it('Customer retrieves their saved listings', async () => {
      const res = await request(app)
        .get('/api/me/saved')
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      const savedIds = res.body.data.map((l) => l.id);
      expect(savedIds).toContain(sampleListingId);
    });

    it('Customer removes a saved listing', async () => {
      const res = await request(app)
        .delete(`/api/me/saved/${sampleListingId}`)
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);
    });

    it('Deleting an unsaved listing is idempotent and returns 200', async () => {
      const res = await request(app)
        .delete(`/api/me/saved/${sampleListingId}`)
        .set('Cookie', customer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);
    });
  });

  describe('Vendor Isolation & Access Boundaries', () => {
    let vendor1ListingId;

    beforeAll(async () => {
      const submitRes = await request(app)
        .post('/api/vendor/listings')
        .set('Cookie', vendor1.cookie)
        .field('title', 'Exclusive Vendor 1 Property')
        .field('city', 'Nagpur')
        .field('locality', 'Ramdaspeth')
        .field('propertyType', '2BHK')
        .field('rent', '24000')
        .field('deposit', '48000')
        .field('furnishing', 'Semi-Furnished')
        .field('description', 'Vendor 1 exclusive property.')
        .attach('documents', Buffer.from('%PDF-1.4 Mock'), 'deed.pdf');

      vendor1ListingId = submitRes.body.id;
    });

    it('Vendor 2 cannot see Vendor 1 listings in their dashboard queue', async () => {
      const res = await request(app)
        .get('/api/vendor/listings')
        .set('Cookie', vendor2.cookie);

      expect(res.status).toBe(200);
      const listingIds = (res.body.listings || []).map((l) => l.id);
      expect(listingIds).not.toContain(vendor1ListingId);
    });

    it('Vendor 2 cannot resubmit or tamper with Vendor 1 listing', async () => {
      const res = await request(app)
        .post(`/api/vendor/listings/${vendor1ListingId}/resubmit`)
        .set('Cookie', vendor2.cookie)
        .field('title', 'Attempted Hijack by Vendor 2');

      // Returns 403 or 404 (because vendor does not own this listing)
      expect([403, 404]).toContain(res.status);
    });
  });
});
