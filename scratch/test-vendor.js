import { mysqlPool } from '../server/src/config/mysql.js';
import { getPropertyDetails } from '../server/src/config/mongo.js';

const base = 'http://localhost:5000/api';

async function testVendorFlow() {
  // 1. Log in as Vendor (Rajesh M. Sharma: +910000000002)
  await fetch(base + '/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+910000000002' }),
  });
  const vLoginRes = await fetch(base + '/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+910000000002', otp: '123456' }),
  });
  const vLoginData = await vLoginRes.json();
  const vCookie = vLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log('✓ Vendor Logged In:', vLoginData.user.name, `(${vLoginData.user.id})`);

  // 2. Log in as Customer (Aarav Sharma: +910000000001)
  await fetch(base + '/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+910000000001' }),
  });
  const cLoginRes = await fetch(base + '/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+910000000001', otp: '123456' }),
  });
  const cLoginData = await cLoginRes.json();
  const cCookie = cLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log('✓ Customer Logged In:', cLoginData.user.name, `(${cLoginData.user.id})`);

  console.log('\n======================================================');
  console.log('TEST 1: SUCCESSFUL MULTIPART SUBMISSION');
  console.log('======================================================');

  // Prepare multipart form with 1 PDF and 1 JPEG
  const pdfBytes = Buffer.from('%PDF-1.4 mock index II title deed content for testing');
  const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  const form = new FormData();
  form.append('title', 'Spacious 3 BHK in Civil Lines near High Court');
  form.append('city', 'Nagpur');
  form.append('locality', 'Civil Lines, High Court Road');
  form.append('propertyType', '3BHK');
  form.append('rent', '35000');
  form.append('deposit', '70000');
  form.append('furnishing', 'Semi-Furnished');
  form.append('carpetArea', '1600');
  form.append('floor', '2nd Floor');
  form.append('description', 'Elegant and well-ventilated 3 BHK flat with reserved stilt parking and scenic garden views.');
  form.append('docType', 'Index II Title Deed');
  form.append('docNumber', 'REG-CVL-8842/2023');
  form.append('amenities', JSON.stringify([
    { category: 'transit', name: 'High Court Metro Station', distance: '0.3 km' },
    { category: 'healthcare', name: 'Nagpur Care Hospital', distance: '1.0 km' },
    { category: 'education', name: 'St. Francis De Sales College', distance: '0.8 km' }
  ]));

  form.append('files', new Blob([pdfBytes], { type: 'application/pdf' }), 'deed.pdf');
  form.append('files', new Blob([jpgBytes], { type: 'image/jpeg' }), 'living_room.jpg');

  const createRes = await fetch(base + '/vendor/listings', {
    method: 'POST',
    headers: { Cookie: vCookie },
    body: form,
  });

  const createdListing = await createRes.json();
  console.log('Status:', createRes.status);
  console.log('Created Listing ID:', createdListing.id);
  console.log('Title:', createdListing.title);
  console.log('Status:', createdListing.status);
  console.log('Documents:', JSON.stringify(createdListing.documents));
  console.log('Amenities count:', createdListing.amenities?.length);
  console.log('Images count:', createdListing.images?.length);

  console.log('\n======================================================');
  console.log('TEST 2: RESULTING MYSQL ROWS AND MONGO DOCUMENT');
  console.log('======================================================');

  // MySQL rows
  const [listingRows] = await mysqlPool.query(
    'SELECT id, title, locality, status, rent_inr, is_synthetic, data_source FROM listings WHERE id = ?',
    [createdListing.id]
  );
  console.log('MySQL listings row:', listingRows[0]);

  const [docRows] = await mysqlPool.query(
    'SELECT id, listing_id, doc_type, doc_number_last4, review_status, storage_key, mime_type, size_bytes FROM listing_documents WHERE listing_id = ?',
    [createdListing.id]
  );
  console.log('MySQL listing_documents rows:');
  console.table(docRows);

  const [auditRows] = await mysqlPool.query(
    'SELECT id, action, actor_label, detail, idempotency_key FROM audit_logs WHERE listing_id = ?',
    [createdListing.id]
  );
  console.log('MySQL audit_logs row:');
  console.table(auditRows);

  // Mongo document
  const mongoDoc = await getPropertyDetails().findOne({ _id: createdListing.id });
  console.log('MongoDB property_details document:');
  console.log(JSON.stringify(mongoDoc, null, 2));

  console.log('\n======================================================');
  console.log('TEST 3: FILE-TYPE REJECTION (.txt file)');
  console.log('======================================================');
  const badFileForm = new FormData();
  badFileForm.append('title', 'Test Property Type Reject');
  badFileForm.append('city', 'Nagpur');
  badFileForm.append('locality', 'Dharampeth');
  badFileForm.append('propertyType', '2BHK');
  badFileForm.append('rent', '20000');
  badFileForm.append('deposit', '40000');
  badFileForm.append('furnishing', 'Unfurnished');
  badFileForm.append('description', 'Short description here for test.');
  badFileForm.append('files', new Blob(['plain text not allowed'], { type: 'text/plain' }), 'document.txt');

  const badTypeRes = await fetch(base + '/vendor/listings', {
    method: 'POST',
    headers: { Cookie: vCookie },
    body: badFileForm,
  });
  console.log('Status:', badTypeRes.status);
  console.log('Response:', await badTypeRes.json());

  console.log('\n======================================================');
  console.log('TEST 4: OVERSIZED FILE REJECTION (> 5MB)');
  console.log('======================================================');
  const bigBytes = Buffer.alloc(5.5 * 1024 * 1024);
  const bigFileForm = new FormData();
  bigFileForm.append('title', 'Test Property Oversized Reject');
  bigFileForm.append('city', 'Nagpur');
  bigFileForm.append('locality', 'Dharampeth');
  bigFileForm.append('propertyType', '2BHK');
  bigFileForm.append('rent', '20000');
  bigFileForm.append('deposit', '40000');
  bigFileForm.append('furnishing', 'Unfurnished');
  bigFileForm.append('description', 'Short description here for test.');
  bigFileForm.append('files', new Blob([bigBytes], { type: 'application/pdf' }), 'big_deed.pdf');

  const bigFileRes = await fetch(base + '/vendor/listings', {
    method: 'POST',
    headers: { Cookie: vCookie },
    body: bigFileForm,
  });
  console.log('Status:', bigFileRes.status);
  console.log('Response:', await bigFileRes.json());

  console.log('\n======================================================');
  console.log("TEST 5: VENDOR RESUBMITTING SOMEONE ELSE'S LISTING (404)");
  console.log('======================================================');
  const [flaggedRows] = await mysqlPool.query(
    "SELECT id, owner_id FROM listings WHERE legacy_ref = 'prop-flagged-01'"
  );
  const foreignFlaggedId = flaggedRows[0]?.id;

  const resubmitOtherRes = await fetch(base + `/vendor/listings/${foreignFlaggedId}/resubmit`, {
    method: 'POST',
    headers: { Cookie: vCookie },
  });
  console.log('Status:', resubmitOtherRes.status);
  console.log('Response:', await resubmitOtherRes.json());

  console.log('\n======================================================');
  console.log('TEST 6: CUSTOMER TRYING TO SUBMIT (403)');
  console.log('======================================================');
  const custSubmitRes = await fetch(base + '/vendor/listings', {
    method: 'POST',
    headers: { Cookie: cCookie },
    body: form,
  });
  console.log('Status:', custSubmitRes.status);
  console.log('Response:', await custSubmitRes.json());

  // Also test legitimate vendor resubmission of their own flagged listing!
  console.log('\n======================================================');
  console.log('BONUS TEST: VENDOR RESUBMITTING THEIR OWN FLAGGED LISTING');
  console.log('======================================================');
  // Flag the vendor's created listing temporarily to test resubmit
  await mysqlPool.query(
    `UPDATE listings SET 
       status = 'flagged', 
       flag_reason = 'Discrepancy in deed signature', 
       flagged_at = NOW(3), 
       flagged_by = (SELECT id FROM users WHERE role='admin' LIMIT 1) 
     WHERE id = ?`,
    [createdListing.id]
  );
  console.log(`Set listing ${createdListing.id} status to 'flagged'`);

  const ownResubmitRes = await fetch(base + `/vendor/listings/${createdListing.id}/resubmit`, {
    method: 'POST',
    headers: { Cookie: vCookie },
  });
  const resubmittedData = await ownResubmitRes.json();
  console.log('Status:', ownResubmitRes.status);
  console.log('New Status:', resubmittedData.status);
  console.log('Flag fields cleared:', resubmittedData.flagReason === undefined || resubmittedData.flagReason === null);

  const [resubmitAudit] = await mysqlPool.query(
    'SELECT action, detail FROM audit_logs WHERE listing_id = ? ORDER BY id DESC LIMIT 1',
    [createdListing.id]
  );
  console.log('Audit log entry for resubmit:', resubmitAudit[0]);

  process.exit(0);
}

testVendorFlow();
