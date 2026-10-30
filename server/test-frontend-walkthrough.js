const PROXY_URL = 'http://localhost:5173/api';

async function login(phone) {
  // Step 1: Send OTP
  const sendRes = await fetch(`${PROXY_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!sendRes.ok) throw new Error(`send-otp failed with ${sendRes.status}`);

  // Step 2: Verify OTP
  const verifyRes = await fetch(`${PROXY_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' }),
  });
  if (!verifyRes.ok) throw new Error(`verify-otp failed with ${verifyRes.status}`);

  const cookie = verifyRes.headers.get('set-cookie')?.split(';')[0];
  const data = await verifyRes.json();
  return { user: data.user, cookie };
}

async function walkThroughFlow() {
  console.log('================================================================');
  console.log('WALKTHROUGH: FULL REACT FRONTEND-TO-BACKEND WORKFLOW (VIA VITE PROXY)');
  console.log('================================================================\n');

  // STEP 1: LOGIN AS VENDOR
  console.log('--- Step 1: Login as Vendor (+91 00000 00002) ---');
  const vendor = await login('+910000000002');
  console.log(`✓ Vendor logged in: ${vendor.user.name} (${vendor.user.phone})`);

  // Verify /api/auth/me works through proxy
  const meRes = await fetch(`${PROXY_URL}/auth/me`, {
    headers: { Cookie: vendor.cookie },
  });
  const meData = await meRes.json();
  console.log(`✓ GET /api/auth/me session verified: ${meData.user.name} [Role: ${meData.user.role}]`);

  // STEP 2: VENDOR SUBMITS LISTING WITH MULTIPART DATA
  console.log('\n--- Step 2: Vendor Submits New Property Listing ---');
  const form = new FormData();
  form.append('title', 'Skyline Horizon 2BHK in Civil Lines');
  form.append('city', 'Nagpur');
  form.append('locality', 'Civil Lines, Near High Court');
  form.append('propertyType', '2BHK');
  form.append('rent', '25000');
  form.append('deposit', '50000');
  form.append('furnishing', 'Semi-Furnished');
  form.append('carpetArea', '920');
  form.append('floor', '4th of 10');
  form.append('description', 'Prestigious 2BHK flat with reserved covered parking and 24x7 security.');
  form.append('amenities', JSON.stringify(['Gated Security', 'Lift Access', 'Transit', 'Hospital']));
  form.append('docType', 'Index II Title Deed');
  form.append('docNumber', 'MH-NGP-REG-4491/2023');

  const pdfBytes = Buffer.from('%PDF-1.4 Mock Registered Index II Title Deed for Verification');
  form.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'index_ii_deed.pdf');

  const submitRes = await fetch(`${PROXY_URL}/vendor/listings`, {
    method: 'POST',
    headers: { Cookie: vendor.cookie },
    body: form,
  });
  const submitData = await submitRes.json();
  const listingId = submitData.id || submitData.data?.id;
  console.log(`✓ Property successfully submitted: ID = ${listingId}`);
  console.log(`   Initial Status: "${submitData.status}", Credibility Score: ${submitData.credibilityScore}`);

  // STEP 3: LOGIN AS ADMIN
  console.log('\n--- Step 3: Login as Admin Registrar (+91 00000 00003) ---');
  const admin = await login('+910000000003');
  console.log(`✓ Admin logged in: ${admin.user.name} (${admin.user.designation})`);

  // Admin checks pending queue
  const queueRes = await fetch(`${PROXY_URL}/admin/queue?status=pending`, {
    headers: { Cookie: admin.cookie },
  });
  const queueData = await queueRes.json();
  const pendingListing = queueData.data.listings.find((l) => l.id === listingId);
  console.log(`✓ Admin Queue: ${queueData.data.total} pending listings. Target listing found: ${Boolean(pendingListing)}`);

  // STEP 4: ADMIN ASSIGNS PARTNER
  console.log('\n--- Step 4: Admin Assigns Field Partner to Listing ---');
  const partnersRes = await fetch(`${PROXY_URL}/admin/partners`, {
    headers: { Cookie: admin.cookie },
  });
  const partnersData = await partnersRes.json();
  const partnerNagpur = partnersData.data.find((p) => p.cityName === 'Nagpur');
  console.log(`✓ Selected Partner for Nagpur: ${partnerNagpur.name} (Badge: ${partnerNagpur.badgeNumber})`);

  const assignRes = await fetch(`${PROXY_URL}/admin/listings/${listingId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      partnerId: partnerNagpur.id,
      scheduledFor: '2026-10-26',
      notes: 'Verify original Index II title deed on-site and confirm vacant possession.',
    }),
  });
  const assignData = await assignRes.json();
  console.log(`✓ Partner assigned successfully! Assignment ID: ${assignData.data.assignmentId}, Status: "${assignData.data.status}"`);

  // STEP 5: LOGIN AS PARTNER
  console.log('\n--- Step 5: Login as Field Partner (+91 00000 00004) ---');
  const partner = await login('+910000000004');
  console.log(`✓ Partner logged in: ${partner.user.name} (Badge: ${partner.user.badgeNumber})`);

  const pAssignmentsRes = await fetch(`${PROXY_URL}/partner/assignments`, {
    headers: { Cookie: partner.cookie },
  });
  const pAssignmentsData = await pAssignmentsRes.json();
  const myTask = pAssignmentsData.data.find((a) => a.id === listingId);
  console.log(`✓ Partner visits retrieved: ${pAssignmentsData.data.length} assigned visits.`);
  console.log(`   Task confirmed for "${myTask?.title}" (Assignment #${myTask?.assignment?.id})`);

  // STEP 6: PARTNER VERIFIES LISTING
  console.log('\n--- Step 6: Partner Conducts On-Site Physical Inspection ---');
  const inspectRes = await fetch(`${PROXY_URL}/partner/assignments/${myTask.assignment.id}/inspection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partner.cookie,
    },
    body: JSON.stringify({
      outcome: 'verified',
      gpsLat: 21.1441,
      gpsLng: 79.0688,
      physicalKeysVerified: true,
      ownerMetInPerson: true,
      unitVacantAvailable: true,
      notes: 'Physical on-site inspection completed. Door keys match, original title deed matched with Sub-Registrar watermark.',
    }),
  });
  const inspectData = await inspectRes.json();
  console.log(`✓ Inspection submitted: Status = "${inspectData.data.status}"`);
  console.log(`   Official Verification Seal Issued: "${inspectData.data.sealId}"`);
  console.log(`   Updated Credibility Score: ${inspectData.data.credibilityScore}/100`);

  // STEP 7: LOGIN AS CUSTOMER
  console.log('\n--- Step 7: Login as Customer / Renter (+91 00000 00001) ---');
  const customer = await login('+910000000001');
  console.log(`✓ Customer logged in: ${customer.user.name} (${customer.user.phone})`);

  // Customer searches listings
  console.log('\n--- Step 8: Customer Searches Verified Listings ---');
  const searchRes = await fetch(`${PROXY_URL}/listings?verifiedOnly=true&city=Nagpur`);
  const searchData = await searchRes.json();
  const verifiedMatch = searchData.listings.find((l) => l.id === listingId);
  console.log(`✓ Customer search returned ${searchData.total} verified units in Nagpur.`);
  console.log(`   Newly verified listing located: "${verifiedMatch.title}"`);
  console.log(`   Seal displayed: ${verifiedMatch.verificationSealId}`);
  console.log(`   Officer: ${verifiedMatch.fieldReport?.officer} (${verifiedMatch.fieldReport?.badgeNumber})`);

  // Customer saves listing
  console.log('\n--- Step 9: Customer Bookmarks / Saves Listing ---');
  const saveRes = await fetch(`${PROXY_URL}/me/saved/${listingId}`, {
    method: 'POST',
    headers: { Cookie: customer.cookie },
  });
  const saveData = await saveRes.json();
  console.log(`✓ Listing saved to Customer profile:`, saveData.data);

  // Customer reviews listing
  console.log('\n--- Step 10: Customer Leaves Move-In Feedback ---');
  const feedbackRes = await fetch(`${PROXY_URL}/listings/${listingId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customer.cookie,
    },
    body: JSON.stringify({
      rating: 5,
      comment: 'Outstanding transparency! Verification seal and field report were spot on. Highly recommended.',
    }),
  });
  const feedbackData = await feedbackRes.json();
  console.log(`✓ Customer Feedback submitted:`, feedbackData.data);

  // Verify listing shows feedback
  const detailRes = await fetch(`${PROXY_URL}/listings/${listingId}`);
  const detailData = await detailRes.json();
  console.log(`\n✓ Final Public Property Details:`);
  console.log(`   Status: ${detailData.status}`);
  console.log(`   Seal: ${detailData.verificationSealId}`);
  console.log(`   Rating Average: ${detailData.ratingAvg} (Total Reviews: ${detailData.ratingCount})`);
  console.log(`   Credibility Score: ${detailData.credibilityScore}`);
  console.log(`   Latest Review: "${detailData.ratings[0]?.comment}" by ${detailData.ratings[0]?.user}`);

  console.log('\n================================================================');
  console.log('COMPLETE FRONTEND-TO-BACKEND FLOW COMPLETED WITHOUT ERRORS!');
  console.log('================================================================');
}

walkThroughFlow().catch((err) => {
  console.error('Walkthrough failed:', err);
  process.exit(1);
});
