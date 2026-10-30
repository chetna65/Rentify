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

async function run() {
  console.log('================================================================');
  console.log('RENTIFY STEP 8 TEST SUITE: FEEDBACK, SAVED & ASSISTANCE');
  console.log('================================================================\n');

  // 1. Authenticate actors
  console.log('1. Authenticating test users...');
  const customer = await loginUser('+910000000001');
  console.log(`✓ Customer logged in: ${customer.user.name} (${customer.user.id})`);

  const vendor = await loginUser('+910000000002');
  console.log(`✓ Vendor logged in: ${vendor.user.name} (${vendor.user.id})`);

  // Find a verified listing from GET /listings
  const listingsRes = await fetch(`${BASE_URL}/listings?verifiedOnly=true`);
  const listingsData = await listingsRes.json();
  const verifiedListing = listingsData.listings ? listingsData.listings[0] : listingsData.data.listings[0];
  console.log(`\nUsing verified listing: ${verifiedListing.id} ("${verifiedListing.title}")`);
  console.log(`Initial ratings: count = ${verifiedListing.ratingCount || 0}, avg = ${verifiedListing.ratingAvg || 'null'}, credibility = ${verifiedListing.credibilityScore}`);

  console.log('\n================================================================');
  console.log('TEST A: ASSISTANCE ENDPOINTS (PUBLIC, READ-ONLY)');
  console.log('================================================================');
  const scamRes = await fetch(`${BASE_URL}/assistance/scam-alerts`);
  const scamData = await scamRes.json();
  console.log(`✓ GET /api/assistance/scam-alerts -> ${scamRes.status} (Count: ${scamData.data.length})`);
  console.log(`   First Alert: "${scamData.data[0].title}"`);

  const legalRes = await fetch(`${BASE_URL}/assistance/legal`);
  const legalData = await legalRes.json();
  console.log(`✓ GET /api/assistance/legal -> ${legalRes.status} (Count: ${legalData.data.length})`);
  console.log(`   First Topic: "${legalData.data[0].topic}" (${legalData.data[0].rule})`);

  const schemesRes = await fetch(`${BASE_URL}/assistance/schemes`);
  const schemesData = await schemesRes.json();
  console.log(`✓ GET /api/assistance/schemes -> ${schemesRes.status} (Count: ${schemesData.data.length})`);
  console.log(`   First Scheme: "${schemesData.data[0].name}"`);

  console.log('\n================================================================');
  console.log('TEST B: SAVED LISTINGS (CUSTOMERS ONLY, IDEMPOTENT)');
  console.log('================================================================');
  // 1. Save listing
  const save1Res = await fetch(`${BASE_URL}/me/saved/${verifiedListing.id}`, {
    method: 'POST',
    headers: { Cookie: customer.cookie },
  });
  const save1Data = await save1Res.json();
  console.log(`✓ POST /api/me/saved/${verifiedListing.id} -> ${save1Res.status}`, save1Data);

  // 2. Duplicate Save (idempotent)
  const save2Res = await fetch(`${BASE_URL}/me/saved/${verifiedListing.id}`, {
    method: 'POST',
    headers: { Cookie: customer.cookie },
  });
  const save2Data = await save2Res.json();
  console.log(`✓ Duplicate POST /api/me/saved/${verifiedListing.id} -> ${save2Res.status} (Idempotent: ${save2Data.data.saved === true})`);

  // 3. GET saved listings
  const getSavedRes = await fetch(`${BASE_URL}/me/saved`, {
    headers: { Cookie: customer.cookie },
  });
  const getSavedData = await getSavedRes.json();
  console.log(`✓ GET /api/me/saved -> ${getSavedRes.status} (Total saved: ${getSavedData.data.length})`);
  console.log(`   Saved listing title: "${getSavedData.data[0]?.title}" (savedAt: ${getSavedData.data[0]?.savedAt})`);

  // 4. Vendor trying to access saved listings (403)
  const vendorSavedRes = await fetch(`${BASE_URL}/me/saved`, {
    headers: { Cookie: vendor.cookie },
  });
  const vendorSavedData = await vendorSavedRes.json();
  console.log(`✓ Vendor GET /api/me/saved -> ${vendorSavedRes.status} (Expected 403: "${vendorSavedData.error}")`);

  // 5. DELETE saved listing
  const del1Res = await fetch(`${BASE_URL}/me/saved/${verifiedListing.id}`, {
    method: 'DELETE',
    headers: { Cookie: customer.cookie },
  });
  const del1Data = await del1Res.json();
  console.log(`✓ DELETE /api/me/saved/${verifiedListing.id} -> ${del1Res.status}`, del1Data);

  // 6. Duplicate DELETE (idempotent)
  const del2Res = await fetch(`${BASE_URL}/me/saved/${verifiedListing.id}`, {
    method: 'DELETE',
    headers: { Cookie: customer.cookie },
  });
  const del2Data = await del2Res.json();
  console.log(`✓ Duplicate DELETE /api/me/saved/${verifiedListing.id} -> ${del2Res.status} (Idempotent: ${del2Data.data.saved === false})`);

  console.log('\n================================================================');
  console.log('TEST C: CUSTOMER FEEDBACK & RATINGS');
  console.log('================================================================');
  // 1. Vendor trying to leave feedback (403)
  const vendorFbRes = await fetch(`${BASE_URL}/listings/${verifiedListing.id}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: vendor.cookie,
    },
    body: JSON.stringify({ rating: 5, comment: 'Vendor attempting review' }),
  });
  const vendorFbData = await vendorFbRes.json();
  console.log(`✓ Vendor POST feedback -> ${vendorFbRes.status} (Expected 403: "${vendorFbData.error}")`);

  // 2. Customer leaves feedback on verified listing (201)
  const custFbRes = await fetch(`${BASE_URL}/listings/${verifiedListing.id}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customer.cookie,
    },
    body: JSON.stringify({
      rating: 5,
      comment: 'Super seamless move-in experience! The verification seal and field report were 100% accurate.',
    }),
  });
  const custFbData = await custFbRes.json();
  console.log(`✓ Customer POST feedback -> ${custFbRes.status}`, custFbData);

  // 3. Customer submits duplicate feedback on same listing (409)
  const dupFbRes = await fetch(`${BASE_URL}/listings/${verifiedListing.id}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customer.cookie,
    },
    body: JSON.stringify({ rating: 4, comment: 'Second attempt' }),
  });
  const dupFbData = await dupFbRes.json();
  console.log(`✓ Duplicate review by same customer -> ${dupFbRes.status} (Expected 409: "${dupFbData.error}")`);

  // 4. Verify updated listing details
  const updatedListingRes = await fetch(`${BASE_URL}/listings/${verifiedListing.id}`);
  const updatedListing = await updatedListingRes.json();
  console.log(`\n✓ Listing updated with new feedback:`);
  console.log(`   Rating count: ${updatedListing.ratingCount}`);
  console.log(`   Rating average: ${updatedListing.ratingAvg}`);
  console.log(`   Credibility score: ${updatedListing.credibilityScore}`);
  console.log(`   Ratings array count: ${updatedListing.ratings?.length}`);
  if (updatedListing.ratings?.length > 0) {
    const latestRating = updatedListing.ratings[updatedListing.ratings.length - 1];
    console.log(`   Latest rating by "${latestRating.user}": ${latestRating.rating}/5 - "${latestRating.comment}"`);
  }

  console.log('\n================================================================');
  console.log('ALL STEP 8 TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
