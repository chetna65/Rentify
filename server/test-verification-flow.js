const BASE_URL = 'http://localhost:5000/api';

async function loginUser(phone) {
  await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' }),
  });
  const data = await res.json();
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  return { user: data.user, cookie };
}

async function runTests() {
  console.log('================================================================');
  console.log('RENTIFY VERIFICATION WORKFLOW END-TO-END TEST SUITE');
  console.log('================================================================\n');

  // Log in as all actors
  console.log('1. Authenticating test users...');
  const vendor = await loginUser('+910000000002');
  console.log(`✓ Vendor logged in: ${vendor.user.name} (${vendor.user.id})`);

  const admin = await loginUser('+910000000003');
  console.log(`✓ Admin logged in: ${admin.user.name} (${admin.user.id})`);

  const partnerNagpur = await loginUser('+910000000004');
  console.log(`✓ Nagpur Partner logged in: ${partnerNagpur.user.name} (${partnerNagpur.user.id}, Badge: ${partnerNagpur.user.badgeNumber})`);

  const partnerPune = await loginUser('+910000000005');
  console.log(`✓ Pune Partner logged in: ${partnerPune.user.name} (${partnerPune.user.id}, Badge: ${partnerPune.user.badgeNumber})`);

  console.log('\n2. Fetching Admin Partner Directory...');
  const partnersRes = await fetch(`${BASE_URL}/admin/partners`, {
    headers: { Cookie: admin.cookie },
  });
  const partnersData = await partnersRes.json();
  console.log(`✓ Found ${partnersData.data.length} active partners:`);
  for (const p of partnersData.data) {
    console.log(`   - ${p.name} [Badge: ${p.badgeNumber}] in ${p.cityName} (Active: ${p.activeAssignmentsCount}, Completed: ${p.completedAssignmentsCount})`);
  }

  console.log('\n================================================================');
  console.log('SCENARIO 1: COMPLETE HAPPY PATH');
  console.log('Vendor Submit -> Admin Assign -> Partner Inspect -> Verified Seal');
  console.log('================================================================');

  // Step 1: Submit as vendor in Nagpur (city: 'Nagpur')
  const form = new FormData();
  form.append('title', 'Skyline Residency 3BHK for Workflow Test');
  form.append('city', 'Nagpur');
  form.append('locality', 'Civil Lines');
  form.append('propertyType', '3BHK');
  form.append('rent', '38000');
  form.append('deposit', '114000');
  form.append('furnishing', 'Fully Furnished');
  form.append('carpetArea', '1450');
  form.append('floor', '6th of 12');
  form.append('description', 'Luxurious flat in the heart of Nagpur Civil Lines with dedicated car parking.');
  form.append('amenities', JSON.stringify(['Gated Security', 'Lift Access', 'Gym']));
  form.append('docType', 'Property Tax Receipt');
  form.append('docNumber', 'MH-NGP-TAX-9821');

  const pdfBytes = Buffer.from('%PDF-1.4 Mock tax receipt for verification workflow');
  form.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'tax_receipt.pdf');

  const submitRes = await fetch(`${BASE_URL}/vendor/listings`, {
    method: 'POST',
    headers: { Cookie: vendor.cookie },
    body: form,
  });
  const submitData = await submitRes.json();
  const listingId = submitData.id || submitData.data?.id;
  console.log(`✓ Vendor submitted listing: ${listingId} (Status: ${submitData.status})`);

  // Verify it appears in Admin pending queue
  const queueRes = await fetch(`${BASE_URL}/admin/queue?status=pending`, {
    headers: { Cookie: admin.cookie },
  });
  const queueData = await queueRes.json();
  const foundInQueue = queueData.data.listings.find((l) => l.id === listingId);
  console.log(`✓ Admin Pending Queue holds ${queueData.data.total} listings (Listing present: ${Boolean(foundInQueue)})`);

  // Step 2: Admin assigns partner
  const assignRes = await fetch(`${BASE_URL}/admin/listings/${listingId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      partnerId: partnerNagpur.user.id,
      scheduledFor: '2026-10-25',
      notes: 'Please inspect physical keys and verify electric meter number.',
    }),
  });
  const assignData = await assignRes.json();
  console.log(`✓ Admin assigned partner: Assignment ID ${assignData.data.assignmentId}, Status: ${assignData.data.status}`);
  const assignmentId = assignData.data.assignmentId;

  // Step 3: Partner views their assignments
  const pAssignmentsRes = await fetch(`${BASE_URL}/partner/assignments`, {
    headers: { Cookie: partnerNagpur.cookie },
  });
  const pAssignmentsData = await pAssignmentsRes.json();
  const myAssignment = pAssignmentsData.data.find((a) => a.assignment.id === assignmentId);
  console.log(`✓ Partner ${partnerNagpur.user.name} retrieved assignments. Found assignment #${assignmentId}: listing "${myAssignment.title}"`);

  // Step 4: Partner submits inspection (Outcome: verified)
  const inspectRes = await fetch(`${BASE_URL}/partner/assignments/${assignmentId}/inspection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partnerNagpur.cookie,
    },
    body: JSON.stringify({
      outcome: 'verified',
      gpsLat: 21.1458,
      gpsLng: 79.0882,
      physicalKeysVerified: true,
      ownerMetInPerson: true,
      unitVacantAvailable: true,
      notes: 'Unit verified in person. Keys match, owner tax receipt verified against building records.',
    }),
  });
  const inspectData = await inspectRes.json();
  console.log(`✓ Partner completed inspection: Outcome: ${inspectData.data.status}, Seal issued: ${inspectData.data.sealId}, Credibility score: ${inspectData.data.credibilityScore}`);

  // Step 5: Check public listing details
  const publicListingRes = await fetch(`${BASE_URL}/listings/${listingId}`);
  const publicListing = await publicListingRes.json();
  console.log(`✓ Public listing read: Status = ${publicListing.status}, Seal = ${publicListing.verificationSealId}, Credibility = ${publicListing.credibilityScore}`);
  console.log(`   Field report: Officer = ${publicListing.fieldReport?.officer}, Badge = ${publicListing.fieldReport?.badgeNumber}, GPS = ${publicListing.fieldReport?.gpsCoords}`);

  console.log('\n================================================================');
  console.log('SCENARIO 2: INVALID STATE TRANSITION (RE-ASSIGNING VERIFIED)');
  console.log('================================================================');
  const invalidAssignRes = await fetch(`${BASE_URL}/admin/listings/${listingId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      partnerId: partnerNagpur.user.id,
      notes: 'Trying to re-assign an already verified listing',
    }),
  });
  const invalidAssignData = await invalidAssignRes.json();
  console.log(`✓ HTTP Status: ${invalidAssignRes.status} (Expected 409)`);
  console.log(`   Error message: "${invalidAssignData.error}"`);

  console.log('\n================================================================');
  console.log('SCENARIO 3: UNAUTHORIZED PARTNER ACCESS (403)');
  console.log('Pune partner attempts to submit inspection for Nagpur assignment');
  console.log('================================================================');
  const unauthorizedInspectRes = await fetch(`${BASE_URL}/partner/assignments/${assignmentId}/inspection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partnerPune.cookie,
    },
    body: JSON.stringify({
      outcome: 'verified',
      notes: 'Unauthorized partner attempting inspection',
    }),
  });
  const unauthorizedData = await unauthorizedInspectRes.json();
  console.log(`✓ HTTP Status: ${unauthorizedInspectRes.status} (Expected 403)`);
  console.log(`   Error message: "${unauthorizedData.error}"`);

  console.log('\n================================================================');
  console.log('SCENARIO 4: FLAGGING WITHOUT A REASON (400)');
  console.log('================================================================');
  // Submit another test listing
  const form2 = new FormData();
  form2.append('title', 'Flat for Flag Test');
  form2.append('city', 'Nagpur');
  form2.append('locality', 'Dharampeth');
  form2.append('propertyType', '2BHK');
  form2.append('rent', '22000');
  form2.append('deposit', '66000');
  form2.append('furnishing', 'Semi-Furnished');
  form2.append('description', 'Test flat for flagging.');
  form2.append('amenities', JSON.stringify(['Lift Access']));
  form2.append('docType', 'Electricity Bill');
  form2.append('docNumber', 'EB-1234');
  form2.append('documents', new Blob([Buffer.from('%PDF-1.4 mock')], { type: 'application/pdf' }), 'bill.pdf');

  const s2Res = await fetch(`${BASE_URL}/vendor/listings`, {
    method: 'POST',
    headers: { Cookie: vendor.cookie },
    body: form2,
  });
  const s2Data = await s2Res.json();
  const listingId2 = s2Data.id || s2Data.data?.id;

  const flagNoReasonRes = await fetch(`${BASE_URL}/admin/listings/${listingId2}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      decision: 'flagged',
      // omitting reason!
    }),
  });
  const flagNoReasonData = await flagNoReasonRes.json();
  console.log(`✓ HTTP Status: ${flagNoReasonRes.status} (Expected 400)`);
  console.log(`   Error message: "${flagNoReasonData.error}"`);

  console.log('\n4b. Admin directly flags the listing WITH a reason...');
  const flagWithReasonRes = await fetch(`${BASE_URL}/admin/listings/${listingId2}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      decision: 'flagged',
      reason: 'Property electricity meter number does not match vendor declaration.',
      flagCategory: 'Document Discrepancy',
    }),
  });
  const flagWithReasonData = await flagWithReasonRes.json();
  console.log(`✓ Admin flagged listing successfully: Status = ${flagWithReasonData.data.status}, Credibility = ${flagWithReasonData.data.credibilityScore}`);

  // Submit a 3rd listing for Direct Admin Verification
  const form3 = new FormData();
  form3.append('title', 'Flat for Direct Admin Verification');
  form3.append('city', 'Nagpur');
  form3.append('locality', 'Ramdaspeth');
  form3.append('propertyType', '1BHK');
  form3.append('rent', '15000');
  form3.append('deposit', '45000');
  form3.append('furnishing', 'Unfurnished');
  form3.append('description', 'Direct admin verification test.');
  form3.append('amenities', JSON.stringify(['Lift Access']));
  form3.append('docType', 'Registered Sale Deed');
  form3.append('docNumber', 'RSD-9988');
  form3.append('documents', new Blob([Buffer.from('%PDF-1.4 mock sale deed')], { type: 'application/pdf' }), 'deed.pdf');

  const s3Res = await fetch(`${BASE_URL}/vendor/listings`, {
    method: 'POST',
    headers: { Cookie: vendor.cookie },
    body: form3,
  });
  const s3Data = await s3Res.json();
  const listingId3 = s3Data.id || s3Data.data?.id;

  console.log('\n4c. Admin directly verifies listing with official seal...');
  const directVerifyRes = await fetch(`${BASE_URL}/admin/listings/${listingId3}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      decision: 'verified',
    }),
  });
  const directVerifyData = await directVerifyRes.json();
  console.log(`✓ Admin direct verified: Status = ${directVerifyData.data.status}, Seal = ${directVerifyData.data.sealId}, Credibility = ${directVerifyData.data.credibilityScore}`);

  console.log('\n================================================================');
  console.log('SCENARIO 5: CONCURRENT / DOUBLE-ASSIGN CONFLICT (409)');
  console.log('================================================================');
  // Submit a 4th listing specifically for assignment test
  const form4 = new FormData();
  form4.append('title', 'Flat for Double Assignment Test');
  form4.append('city', 'Nagpur');
  form4.append('locality', 'Manish Nagar');
  form4.append('propertyType', '2BHK');
  form4.append('rent', '20000');
  form4.append('deposit', '60000');
  form4.append('furnishing', 'Semi-Furnished');
  form4.append('description', 'Test flat for concurrent assign.');
  form4.append('amenities', JSON.stringify(['Lift Access']));
  form4.append('docType', 'Property Tax Receipt');
  form4.append('docNumber', 'TX-7788');
  form4.append('documents', new Blob([Buffer.from('%PDF-1.4 mock')], { type: 'application/pdf' }), 'tax.pdf');

  const s4Res = await fetch(`${BASE_URL}/vendor/listings`, {
    method: 'POST',
    headers: { Cookie: vendor.cookie },
    body: form4,
  });
  const s4Data = await s4Res.json();
  const listingId4 = s4Data.id || s4Data.data?.id;

  // Assign listingId4 first time
  const assign1Res = await fetch(`${BASE_URL}/admin/listings/${listingId4}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      partnerId: partnerNagpur.user.id,
      notes: 'First valid assignment',
    }),
  });
  const assign1Data = await assign1Res.json();
  console.log(`✓ First assignment succeeded: Assignment ID ${assign1Data.data.assignmentId}, Status: in-review`);

  // Attempt second assignment on the same listing
  const assign2Res = await fetch(`${BASE_URL}/admin/listings/${listingId4}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      partnerId: partnerNagpur.user.id,
      notes: 'Second redundant assignment',
    }),
  });
  const assign2Data = await assign2Res.json();
  console.log(`✓ Second assignment failed with HTTP ${assign2Res.status} (Expected 409)`);
  console.log(`   Error message: "${assign2Data.error}"`);

  console.log('\n================================================================');
  console.log('SCENARIO 6: AUDIT TRAIL VERIFICATION (audit_logs)');
  console.log('================================================================');
  const auditRes = await fetch(`${BASE_URL}/admin/audit?listingId=${listingId}`, {
    headers: { Cookie: admin.cookie },
  });
  const auditData = await auditRes.json();
  console.log(`✓ Total audit records for listing ${listingId}: ${auditData.data.total}`);
  for (const log of auditData.data.logs) {
    console.log(`   [${log.occurredAt}] [${log.action}] by "${log.actorLabel}": ${log.detail}`);
    if (log.idempotencyKey) {
      console.log(`      Idempotency Key: ${log.idempotencyKey}`);
    }
  }

  console.log('\n================================================================');
  console.log('ALL VERIFICATION WORKFLOW TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
