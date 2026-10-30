// Read-only verification (constraint probes run inside a transaction that is always rolled back).
// Exits non-zero if any check fails.
import { randomUUID } from 'node:crypto';
import { mysqlConnect, mongoConnect } from './lib/db.js';
import { COLLECTION, validator, indexes } from '../mongo/schema/property_details.js';

let failed = 0;
const pass = (name) => console.log(`  ok    ${name}`);
const fail = (name, why) => { failed++; console.log(`  FAIL  ${name} -> ${why}`); };
const check = (name, cond, why = 'condition false') => (cond ? pass(name) : fail(name, why));

// expect a MySQL statement to be rejected with a specific errno
const expectErr = async (conn, name, errno, sql, params = []) => {
  try { await conn.query(sql, params); fail(name, 'statement succeeded but should have been rejected'); }
  catch (e) { e.errno === errno ? pass(name) : fail(name, `got errno ${e.errno} (${e.message.slice(0, 90)})`); }
};
const expectOk = async (conn, name, sql, params = []) => {
  try { const [r] = await conn.query(sql, params); pass(name); return r; }
  catch (e) { fail(name, e.message.slice(0, 120)); return null; }
};
const CHECK = 3819, FK = 1452, DUP = 1062, SIGNAL = 1644;
const insert = (table, row) => [
  `INSERT INTO \`${table}\` (${Object.keys(row).map((c) => `\`${c}\``).join(',')}) VALUES (${Object.keys(row).map(() => '?').join(',')})`,
  Object.values(row),
];
const PROBE = { is_synthetic: 1, data_source: 'synthetic_probe' };

const conn = await mysqlConnect();
const { client, db } = await mongoConnect();
try {
  // ---------- 1. MySQL structure ----------
  console.log('MySQL structure');
  const expected = ['cities', 'users', 'partner_profiles', 'sessions', 'listings', 'listing_documents',
    'partner_assignments', 'field_audits', 'feedback', 'audit_logs', 'saved_listings', 'schema_migrations'];
  const [tables] = await conn.query('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()');
  const have = new Set(tables.map((r) => r.t));
  for (const t of expected) check(`table ${t}`, have.has(t), 'missing');
  const [[{ n: fks }]] = await conn.query("SELECT COUNT(*) n FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()");
  const [[{ n: checks }]] = await conn.query("SELECT COUNT(*) n FROM information_schema.check_constraints WHERE constraint_schema = DATABASE()");
  const [[{ n: trig }]] = await conn.query("SELECT COUNT(*) n FROM information_schema.triggers WHERE trigger_schema = DATABASE()");
  check(`foreign keys present (${fks}, expected 20)`, fks === 20);
  check(`check constraints present (${checks}, expected 37)`, checks === 37);
  check(`triggers present (${trig})`, trig === 3);

  // ---------- 2. Data and invariants ----------
  console.log('Data and invariants');
  const [cities] = await conn.query('SELECT name FROM cities WHERE is_active = 1 ORDER BY name');
  check('cities are exactly Nagpur and Pune', cities.map((c) => c.name).join() === 'Nagpur,Pune', cities.map((c) => c.name).join());
  const [byCity] = await conn.query('SELECT c.name city, COUNT(*) n FROM listings l JOIN cities c ON c.id = l.city_id GROUP BY c.name');
  check('listings exist for both Nagpur and Pune', byCity.length === 2, JSON.stringify(byCity));
  const [byStatus] = await conn.query('SELECT status, COUNT(*) n FROM listings GROUP BY status');
  console.log('        listings by status:', byStatus.map((r) => `${r.status}=${r.n}`).join(', '));
  const [[bad1]] = await conn.query(`SELECT COUNT(*) n FROM listings l WHERE l.status = 'in-review'
    AND (SELECT COUNT(*) FROM partner_assignments a WHERE a.listing_id = l.id AND a.status = 'active') <> 1`);
  check('every in-review listing has exactly one active assignment', bad1.n === 0, `${bad1.n} violations`);
  const [[bad2]] = await conn.query(`SELECT COUNT(*) n FROM partner_assignments a JOIN listings l ON l.id = a.listing_id
    WHERE a.status = 'active' AND l.status <> 'in-review'`);
  check('active assignments only on in-review listings', bad2.n === 0, `${bad2.n} violations`);
  const [[bad3]] = await conn.query(`SELECT COUNT(*) n FROM listings l WHERE l.is_synthetic = 1 AND l.data_source NOT LIKE 'synthetic%'`);
  check('synthetic labelling consistent on listings', bad3.n === 0);
  const [[bad4]] = await conn.query("SELECT COUNT(*) n FROM listing_documents WHERE storage_key IS NOT NULL AND (storage_key LIKE '/%' OR storage_key LIKE 'http%')");
  check('no document stored under a public path/URL', bad4.n === 0);
  const [[lbl]] = await conn.query(`SELECT
    (SELECT COUNT(*) FROM users WHERE is_synthetic = 1) su, (SELECT COUNT(*) FROM users WHERE is_synthetic = 0) ru,
    (SELECT COUNT(*) FROM listings WHERE is_synthetic = 1) sl, (SELECT COUNT(*) FROM listings WHERE is_synthetic = 0) rl`);
  console.log(`        synthetic/real users ${lbl.su}/${lbl.ru}, listings ${lbl.sl}/${lbl.rl}`);

  // ---------- 3. MySQL constraint probes (rolled back) ----------
  console.log('MySQL constraint probes (rolled back)');
  const [[ids]] = await conn.query(`SELECT
    (SELECT id FROM users WHERE role='vendor' LIMIT 1) vendor, (SELECT id FROM users WHERE role='customer' LIMIT 1) customer,
    (SELECT id FROM users WHERE role='admin' LIMIT 1) admin, (SELECT id FROM users WHERE phone='+910000000004') amit,
    (SELECT id FROM users WHERE phone='+910000000005') pooja, (SELECT id FROM cities WHERE code='NGP') ngp`);
  if (!ids.vendor || !ids.customer || !ids.admin || !ids.amit || !ids.pooja) throw new Error('Seed data missing: run npm run db:seed first');
  await conn.beginTransaction();
  try {
    const user = (o) => ({ id: randomUUID(), role: 'customer', full_name: 'Probe', phone: '+919000000001', ...PROBE, ...o });
    await expectErr(conn, 'user: malformed phone rejected', CHECK, ...insert('users', user({ phone: '+91123' })));
    await expectErr(conn, 'user: uppercase UUID rejected', CHECK, ...insert('users', user({ id: randomUUID().toUpperCase() })));
    await expectErr(conn, 'user: synthetic flag without synthetic source rejected', CHECK, ...insert('users', user({ data_source: 'app' })));
    await expectErr(conn, 'user: duplicate phone rejected', DUP, ...insert('users', user({ phone: '+910000000001' })));

    const lid = randomUUID();
    const listing = (o = {}) => ({
      id: lid, owner_id: ids.vendor, city_id: ids.ngp, locality: 'Probe Locality', title: 'Probe listing', property_type: '2BHK',
      rent_inr: 10000, deposit_inr: 20000, furnishing: 'Semi-Furnished', ...PROBE, ...o,
    });
    await expectErr(conn, 'listing: customer cannot be owner', FK, ...insert('listings', listing({ owner_id: ids.customer })));
    await expectErr(conn, 'listing: unknown city rejected', FK, ...insert('listings', listing({ city_id: 999 })));
    await expectErr(conn, 'listing: rent 0 rejected', CHECK, ...insert('listings', listing({ rent_inr: 0 })));
    await expectErr(conn, 'listing: verified without seal rejected', CHECK, ...insert('listings', listing({ status: 'verified' })));
    await expectOk(conn, 'listing: valid pending insert', ...insert('listings', listing()));
    await expectErr(conn, 'listing: shared UUID is immutable', SIGNAL, 'UPDATE listings SET id = ? WHERE id = ?', [randomUUID(), lid]);
    await expectOk(conn, 'listing: pending -> verified (admin direct path)', `UPDATE listings SET status='verified', seal_id='MH-TST-0001',
      verified_at=NOW(3), verified_by=? WHERE id=?`, [ids.admin, lid]);
    await expectErr(conn, 'listing: verified -> pending rejected', SIGNAL, "UPDATE listings SET status='pending' WHERE id=?", [lid]);
    await expectErr(conn, 'listing: verified -> in-review rejected', SIGNAL, "UPDATE listings SET status='in-review' WHERE id=?", [lid]);
    await expectErr(conn, 'listing: flagged without reason rejected', CHECK, "UPDATE listings SET status='flagged' WHERE id=?", [lid]);
    await expectOk(conn, 'listing: verified -> flagged with reason', "UPDATE listings SET status='flagged', flag_reason='probe', flagged_at=NOW(3), flagged_by=? WHERE id=?", [ids.admin, lid]);

    const asg = (o = {}) => ({ listing_id: lid, partner_id: ids.amit, assigned_by: ids.admin, ...PROBE, ...o });
    await expectErr(conn, 'assignment: admin cannot be the partner', FK, ...insert('partner_assignments', asg({ partner_id: ids.admin })));
    await expectErr(conn, 'assignment: partner cannot be the assigner', FK, ...insert('partner_assignments', asg({ assigned_by: ids.amit })));
    await expectErr(conn, 'assignment: completed without completed_at rejected', CHECK, ...insert('partner_assignments', asg({ status: 'completed' })));
    const [a1] = await conn.query(...insert('partner_assignments', asg()));
    pass('assignment: first active assignment');
    await expectErr(conn, 'assignment: second active assignment for same listing rejected', DUP, ...insert('partner_assignments', asg({ partner_id: ids.pooja })));

    const audit = (o = {}) => ({
      assignment_id: a1.insertId, listing_id: lid, partner_id: ids.amit, outcome: 'verified', inspected_on: '2026-10-01', notes: 'probe', ...PROBE, ...o,
    });
    await expectErr(conn, 'field audit: partner must match assignment', FK, ...insert('field_audits', audit({ partner_id: ids.pooja })));
    await expectErr(conn, 'field audit: flagged outcome needs discrepancy', CHECK, ...insert('field_audits', audit({ outcome: 'flagged' })));
    await expectErr(conn, 'field audit: GPS outside India rejected', CHECK, ...insert('field_audits', audit({ gps_lat: 51.5, gps_lng: -0.12 })));
    await expectOk(conn, 'field audit: valid audit', ...insert('field_audits', audit({ gps_lat: 21.1458, gps_lng: 79.0882 })));
    await expectErr(conn, 'field audit: one audit per assignment', DUP, ...insert('field_audits', audit()));

    const fb = (o = {}) => ({ listing_id: lid, user_id: ids.customer, rating: 4, ...PROBE, ...o });
    await expectErr(conn, 'feedback: rating 6 rejected', CHECK, ...insert('feedback', fb({ rating: 6 })));
    await expectErr(conn, 'feedback: vendor cannot leave feedback', FK, ...insert('feedback', fb({ user_id: ids.vendor })));
    await expectOk(conn, 'feedback: valid feedback', ...insert('feedback', fb()));
    await expectErr(conn, 'feedback: one review per user per listing', DUP, ...insert('feedback', fb()));

    const sl = (o = {}) => ({ listing_id: lid, user_id: ids.customer, ...PROBE, ...o });
    await expectErr(conn, 'saved_listings: vendor cannot save listing', FK, ...insert('saved_listings', sl({ user_id: ids.vendor })));
    await expectOk(conn, 'saved_listings: valid save', ...insert('saved_listings', sl()));
    await expectErr(conn, 'saved_listings: duplicate save rejected', DUP, ...insert('saved_listings', sl()));

    const doc = (o = {}) => ({ listing_id: lid, doc_type: 'Probe doc', ...PROBE, ...o });
    await expectErr(conn, 'document: storage_key without hash/mime/size rejected', CHECK, ...insert('listing_documents', doc({ storage_key: 'docs/a.pdf' })));
    await expectErr(conn, 'document: absolute-path storage_key rejected', CHECK, ...insert('listing_documents', doc({
      storage_key: '/etc/passwd', file_sha256: 'a'.repeat(64), mime_type: 'application/pdf', size_bytes: 10 })));
    await expectErr(conn, 'document: reviewed status needs reviewer', CHECK, ...insert('listing_documents', doc({ review_status: 'accepted' })));
    await expectErr(conn, 'document: doc number longer than 4 chars rejected', 1406, ...insert('listing_documents', doc({ doc_number_last4: 'ABCDEFGH' })));
    await expectOk(conn, 'document: valid private-file metadata', ...insert('listing_documents', doc({
      storage_key: `private/${lid}/deed.pdf`, file_sha256: 'b'.repeat(64), mime_type: 'application/pdf', size_bytes: 1234 })));

    const [[{ id: someLog }]] = await conn.query('SELECT id FROM audit_logs LIMIT 1');
    await expectErr(conn, 'audit_logs: UPDATE blocked (append-only)', SIGNAL, "UPDATE audit_logs SET detail='x' WHERE id=?", [someLog]);
    await expectErr(conn, 'audit_logs: DELETE blocked (append-only)', SIGNAL, 'DELETE FROM audit_logs WHERE id=?', [someLog]);
    await expectErr(conn, 'audit_logs: lowercase action rejected', CHECK, ...insert('audit_logs', { actor_label: 'probe', action: 'bad action', ...PROBE }));
    await expectErr(conn, 'sessions: malformed token hash rejected', CHECK, ...insert('sessions', {
      id: randomUUID(), user_id: ids.customer, token_hash: 'plaintext-token', expires_at: new Date(Date.now() + 3600e3) }));
  } finally {
    await conn.rollback();
  }
  const [[leak]] = await conn.query("SELECT COUNT(*) n FROM listings WHERE data_source = 'synthetic_probe'");
  check('probes rolled back (no leftover rows)', leak.n === 0);

  // ---------- 4. MongoDB ----------
  console.log('MongoDB');
  const col = db.collection(COLLECTION);
  const [info] = await db.listCollections({ name: COLLECTION }, { nameOnly: false }).toArray();
  check(`collection ${COLLECTION} exists with validator`, !!info?.options?.validator?.$jsonSchema);
  const idx = new Set((await col.indexes()).map((i) => i.name));
  for (const i of indexes) check(`index ${i.name}`, idx.has(i.name), 'missing');

  const mongoDocs = await col.find({}, { projection: { 'metadata.isSynthetic': 1 } }).toArray();
  const [listingRows] = await conn.query('SELECT id, is_synthetic FROM listings');
  const mIds = new Set(mongoDocs.map((d) => d._id)), sIds = new Set(listingRows.map((r) => r.id));
  const missingInMongo = [...sIds].filter((i) => !mIds.has(i)), orphans = [...mIds].filter((i) => !sIds.has(i));
  check(`every MySQL listing has a MongoDB document (${sIds.size}/${mIds.size})`, missingInMongo.length === 0, `${missingInMongo.length} missing`);
  check('no orphan MongoDB documents', orphans.length === 0, `${orphans.length} orphans`);
  const flagMap = new Map(listingRows.map((r) => [r.id, !!r.is_synthetic]));
  const mismatched = mongoDocs.filter((d) => flagMap.has(d._id) && flagMap.get(d._id) !== d.metadata.isSynthetic);
  check('synthetic flag agrees across MySQL and MongoDB', mismatched.length === 0, `${mismatched.length} mismatched`);
  const invalid = await col.countDocuments({ $nor: [validator] });
  check('all stored documents satisfy the validator', invalid === 0, `${invalid} invalid`);

  const base = () => ({ _id: randomUUID(), schemaVersion: 1, metadata: { isSynthetic: true, dataSource: 'synthetic_probe', createdAt: new Date() } });
  const mongoRejects = async (name, doc) => {
    try { await col.insertOne(doc); await col.deleteOne({ _id: doc._id }); fail(name, 'document was accepted'); }
    catch (e) { e.code === 121 ? pass(name) : fail(name, `unexpected error ${e.code}: ${e.message.slice(0, 80)}`); }
  };
  await mongoRejects('mongo: core field "status" rejected', { ...base(), status: 'verified' });
  await mongoRejects('mongo: core field "rent" rejected', { ...base(), rent: 5000 });
  await mongoRejects('mongo: non-UUID _id rejected', { ...base(), _id: 'prop-ngp-01' });
  await mongoRejects('mongo: missing metadata rejected', { _id: randomUUID(), schemaVersion: 1 });
  await mongoRejects('mongo: image without url/storageKey rejected', { ...base(), images: [{ caption: 'x' }] });
  await mongoRejects('mongo: http image url rejected', { ...base(), images: [{ url: 'http://example.test/a.jpg' }] });
  await mongoRejects('mongo: unknown amenity category rejected', { ...base(), amenities: [{ category: 'spa', name: 'x' }] });
  const okDoc = base();
  try { await col.insertOne(okDoc); pass('mongo: minimal valid document accepted'); } catch (e) { fail('mongo: minimal valid document accepted', e.message.slice(0, 100)); }
  await col.deleteOne({ _id: okDoc._id });
} finally {
  await conn.end();
  await client.close();
}
console.log(failed === 0 ? '\nVERIFY PASSED' : `\nVERIFY FAILED (${failed} failing checks)`);
process.exit(failed === 0 ? 0 : 1);
