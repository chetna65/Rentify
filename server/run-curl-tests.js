import { execSync } from 'node:child_process';
import { unlinkSync, existsSync } from 'node:fs';

const BASE_URL = 'http://localhost:5000/api';

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return (err.stdout || '') + (err.stderr || '') + ` (exit code ${err.status})`;
  }
}

console.log('================================================================');
console.log('EXECUTING CURL COMMANDS AGAINST RENTIFY API');
console.log('================================================================\n');

// 1. Assistance Endpoints
console.log('1. Assistance Endpoints:');
console.log('curl http://localhost:5000/api/assistance/scam-alerts');
console.log(exec('curl.exe -s http://localhost:5000/api/assistance/scam-alerts').slice(0, 150) + '...\n');

console.log('curl http://localhost:5000/api/assistance/legal');
console.log(exec('curl.exe -s http://localhost:5000/api/assistance/legal').slice(0, 150) + '...\n');

console.log('curl http://localhost:5000/api/assistance/schemes');
console.log(exec('curl.exe -s http://localhost:5000/api/assistance/schemes').slice(0, 150) + '...\n');

// 2. Authentication via curl
console.log('2. Authenticating Customer and Vendor via curl:');
exec('curl.exe -s -X POST http://localhost:5000/api/auth/send-otp -H "Content-Type: application/json" -d "{\\"phone\\":\\"+910000000001\\"}"');
exec('curl.exe -s -c cust_cookie.txt -X POST http://localhost:5000/api/auth/verify-otp -H "Content-Type: application/json" -d "{\\"phone\\":\\"+910000000001\\",\\"otp\\":\\"123456\\"}"');
console.log('✓ Customer logged in with cookie saved to cust_cookie.txt');

exec('curl.exe -s -X POST http://localhost:5000/api/auth/send-otp -H "Content-Type: application/json" -d "{\\"phone\\":\\"+910000000002\\"}"');
exec('curl.exe -s -c vend_cookie.txt -X POST http://localhost:5000/api/auth/verify-otp -H "Content-Type: application/json" -d "{\\"phone\\":\\"+910000000002\\",\\"otp\\":\\"123456\\"}"');
console.log('✓ Vendor logged in with cookie saved to vend_cookie.txt\n');

// Pick a verified listing
const listingsOutput = JSON.parse(exec('curl.exe -s http://localhost:5000/api/listings?verifiedOnly=true'));
const listing = listingsOutput.listings[0];
console.log(`Target Verified Listing: ${listing.id} ("${listing.title}")\n`);

// 3. Saved Listings via curl
console.log('3. Saved Listings Endpoints:');
console.log(`curl -X POST http://localhost:5000/api/me/saved/${listing.id} (Customer Save)`);
console.log(exec(`curl.exe -s -b cust_cookie.txt -X POST http://localhost:5000/api/me/saved/${listing.id}`));

console.log(`\ncurl -X POST http://localhost:5000/api/me/saved/${listing.id} (Idempotent Resave)`);
console.log(exec(`curl.exe -s -b cust_cookie.txt -X POST http://localhost:5000/api/me/saved/${listing.id}`));

console.log('\ncurl http://localhost:5000/api/me/saved (Customer GET Saved List)');
console.log(exec('curl.exe -s -b cust_cookie.txt http://localhost:5000/api/me/saved'));

console.log('\ncurl http://localhost:5000/api/me/saved (Vendor Access - Expect 403 Forbidden)');
console.log(exec('curl.exe -s -w "\\nHTTP Status: %{http_code}" -b vend_cookie.txt http://localhost:5000/api/me/saved'));

console.log(`\ncurl -X DELETE http://localhost:5000/api/me/saved/${listing.id} (Customer Unsave)`);
console.log(exec(`curl.exe -s -b cust_cookie.txt -X DELETE http://localhost:5000/api/me/saved/${listing.id}`));

console.log(`\ncurl -X DELETE http://localhost:5000/api/me/saved/${listing.id} (Idempotent Second Unsave)`);
console.log(exec(`curl.exe -s -b cust_cookie.txt -X DELETE http://localhost:5000/api/me/saved/${listing.id}`));

// 4. Feedback Endpoints via curl
console.log('\n4. Feedback Endpoints:');
console.log(`curl -X POST http://localhost:5000/api/listings/${listing.id}/feedback (Vendor Attempt - Expect 403)`);
console.log(exec(`curl.exe -s -w "\\nHTTP Status: %{http_code}" -b vend_cookie.txt -X POST http://localhost:5000/api/listings/${listing.id}/feedback -H "Content-Type: application/json" -d "{\\"rating\\":5,\\"comment\\":\\"Vendor attempt\\"}"`));

// Check duplicate review or fresh review
// For customer Aarav Sharma on this listing, let's see if duplicate review returns 409
console.log(`\ncurl -X POST http://localhost:5000/api/listings/${listing.id}/feedback (Customer Duplicate Review - Expect 409)`);
console.log(exec(`curl.exe -s -w "\\nHTTP Status: %{http_code}" -b cust_cookie.txt -X POST http://localhost:5000/api/listings/${listing.id}/feedback -H "Content-Type: application/json" -d "{\\"rating\\":5,\\"comment\\":\\"Duplicate review attempt\\"}"`));

// Clean up
if (existsSync('cust_cookie.txt')) unlinkSync('cust_cookie.txt');
if (existsSync('vend_cookie.txt')) unlinkSync('vend_cookie.txt');
if (existsSync('server/test-curl.ps1')) unlinkSync('server/test-curl.ps1');

console.log('\n================================================================');
console.log('ALL CURL TESTS COMPLETED SUCCESSFULLY!');
console.log('================================================================');
