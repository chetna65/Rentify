// Idempotent seed. Reference data (cities) is real; everything else is SYNTHETIC and labelled
// is_synthetic=1 / data_source='synthetic_seed_v1' in MySQL and metadata.isSynthetic=true in MongoDB.
//
// Source: the prototype's mock data (../src/data). Records are only inserted when missing and never overwritten,
// so re-running is safe and will not undo later workflow changes. To re-baseline: `docker compose down -v`.
// Names and listings are fictional. Phone numbers are replaced with non-routable placeholders (+91 0000000xxx)
// and emails use the reserved example.test domain, so no real person or number is referenced.
//
// Usage: node --env-file=.env scripts/seed.js [--reference-only]
import { createHash } from 'node:crypto';
import { Int32 } from 'mongodb';
import { mysqlConnect, mongoConnect } from './lib/db.js';
import { COLLECTION, SCHEMA_VERSION } from '../mongo/schema/property_details.js';

const referenceOnly = process.argv.includes('--reference-only');
const SRC = 'synthetic_seed_v1';
const SYN = { is_synthetic: 1, data_source: SRC };
const CITIES = [
  { code: 'NGP', name: 'Nagpur', state: 'Maharashtra' },
  { code: 'PUN', name: 'Pune', state: 'Maharashtra' },
];

// ---------- deterministic UUIDv5 (same ids on every machine and every run) ----------
const NAMESPACE = Buffer.from('a3f1c2d45b6e4f708a910b2c3d4e5f60', 'hex');
const uuid5 = (name) => {
  const h = createHash('sha1').update(NAMESPACE).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
const phone = (n) => `+91${String(n).padStart(10, '0')}`;
const dt = (iso) => (iso ? new Date(iso) : null);
const plusDay = (iso) => new Date(new Date(iso).getTime() + 24 * 3600 * 1000);

// ---------- insert-if-absent helper ----------
const stats = {};
async function ensure(conn, table, where, row) {
  stats[table] ??= { inserted: 0, existing: 0 };
  const keys = Object.keys(where);
  const [found] = await conn.query(
    `SELECT * FROM \`${table}\` WHERE ${keys.map((k) => `\`${k}\` <=> ?`).join(' AND ')} LIMIT 1`,
    keys.map((k) => where[k]),
  );
  if (found.length) { stats[table].existing++; return { created: false, id: found[0].id }; }
  const cols = Object.keys(row);
  const [res] = await conn.query(
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    cols.map((c) => row[c]),
  );
  stats[table].inserted++;
  return { created: true, id: res.insertId };
}

const conn = await mysqlConnect();
try {
  await conn.beginTransaction();

  // ---------- reference data ----------
  const cityId = {};
  for (const c of CITIES) {
    const r = await ensure(conn, 'cities', { code: c.code }, { ...c, is_active: 1 });
    cityId[c.name] = r.id;
  }
  if (referenceOnly) {
    await conn.commit();
    console.log('Reference data seeded (cities only).');
    console.table(stats);
    process.exit(0);
  }

  const { initialListings } = await import(new URL('../../src/data/initialListings.js', import.meta.url));
  const { mockUsers } = await import(new URL('../../src/data/mockUsers.js', import.meta.url));

  // ---------- users ----------
  const users = {}; // mock id -> { id, ... }
  const demoAccounts = [];
  const addUser = async ({ mockId, role, name, phoneNo, designation, city, email }) => {
    const id = uuid5(`user:${mockId}`);
    await ensure(conn, 'users', { id }, {
      id, role, full_name: name, phone: phone(phoneNo), email, designation: designation ?? null,
      city_id: city ? cityId[city] : null, is_active: 1, ...SYN,
    });
    users[mockId] = { id, role, name, city };
    demoAccounts.push({ role, name, phone: phone(phoneNo), email });
    return id;
  };
  const cityOfZone = (z = '') => (z.includes('Pune') ? 'Pune' : 'Nagpur');

  const fixed = [
    ['customer', 'customer', 1], ['vendor', 'vendor', 2], ['admin', 'admin', 3],
    ['partner', 'partner', 4], ['partnerPune', 'partner', 5],
  ];
  for (const [key, role, n] of fixed) {
    const m = mockUsers[key];
    await addUser({
      mockId: m.id, role, name: m.name, phoneNo: n, designation: m.designation,
      city: m.city ?? (role === 'partner' ? cityOfZone(m.zone) : null), email: `${slug(m.name)}@example.test`,
    });
  }
  for (const key of ['partner', 'partnerPune']) {
    const m = mockUsers[key];
    await ensure(conn, 'partner_profiles', { user_id: users[m.id].id }, {
      user_id: users[m.id].id, badge_number: m.badgeNumber, zone: m.zone, city_id: cityId[cityOfZone(m.zone)],
    });
  }

  // listing owners (vendors) that are not the seeded vendor account
  const vendorByName = new Map([[mockUsers.vendor.name, mockUsers.vendor.id]]);
  let ownerN = 100;
  for (const l of initialListings) {
    if (vendorByName.has(l.ownerName)) continue;
    const mockId = `owner:${slug(l.ownerName)}`;
    await addUser({ mockId, role: 'vendor', name: l.ownerName, phoneNo: ownerN++, designation: 'Property Owner (synthetic)', city: l.city, email: `${slug(l.ownerName)}@example.test` });
    vendorByName.set(l.ownerName, mockId);
  }
  const adminId = users[mockUsers.admin.id].id;

  // ---------- listings and everything hanging off them ----------
  const mongoDocs = [];
  const gps = (s) => {
    const m = /([\d.]+)°\s*N,\s*([\d.]+)°\s*E/.exec(s || '');
    return m ? [Number(m[1]), Number(m[2])] : [null, null];
  };
  const category = (n) => (/school|college/i.test(n) ? 'education' : /hospital/i.test(n) ? 'healthcare'
    : /transit/i.test(n) ? 'transit' : /market|grocery/i.test(n) ? 'market' : 'other');

  for (const l of initialListings) {
    const id = uuid5(`listing:${l.id}`);
    const ownerId = users[vendorByName.get(l.ownerName)].id;
    const partner = l.assignedPartnerId ? users[l.assignedPartnerId] : null;
    const flaggerIsAdmin = /arvind|registrar/i.test(l.flaggedBy || '');
    const ratings = l.ratings || [];
    const ratingAvg = ratings.length ? Math.round((ratings.reduce((a, r) => a + r.rating, 0) / ratings.length) * 100) / 100 : null;

    await ensure(conn, 'listings', { id }, {
      id, legacy_ref: l.id, owner_id: ownerId, city_id: cityId[l.city], locality: l.locality, title: l.title,
      property_type: l.propertyType, rent_inr: l.rent, deposit_inr: l.deposit, furnishing: l.furnishing,
      carpet_area_sqft: parseInt(l.carpetArea, 10) || null, floor_label: l.floor ?? null, owner_capacity: l.ownerRole ?? null,
      status: l.status, seal_id: l.verificationSealId ?? null, submitted_at: dt(l.submittedAt),
      verified_at: l.status === 'verified' ? dt(l.verifiedAt) : null, verified_by: l.status === 'verified' ? partner?.id : null,
      flagged_at: l.status === 'flagged' ? dt(l.flaggedAt) : null,
      flagged_by: l.status === 'flagged' ? (flaggerIsAdmin ? adminId : partner?.id) : null,
      flag_category: l.flagCategory ?? null, flag_reason: l.flagReason ?? null,
      credibility_score: l.credibilityScore ?? null, rating_avg: ratingAvg, rating_count: ratings.length, ...SYN,
    });

    // document metadata (no files in seed data; numbers reduced to last 4 characters)
    const reviewedAt = dt(l.status === 'verified' ? l.verifiedAt : l.status === 'flagged' ? l.flaggedAt : l.assignedAt);
    for (const d of l.documents) {
      const status = l.status === 'verified' ? 'accepted' : l.status === 'in-review' ? 'admin_checked'
        : l.status === 'flagged' ? (/title|agreement/i.test(d.type) ? 'rejected' : 'suspended') : 'submitted';
      const alnum = String(d.docNumber || '').replace(/[^A-Za-z0-9]/g, '');
      await ensure(conn, 'listing_documents', { listing_id: id, doc_type: d.type }, {
        listing_id: id, doc_type: d.type, doc_number_last4: /none|unverified/i.test(d.docNumber || '') || !alnum ? null : alnum.slice(-4),
        review_status: status, review_note: `[synthetic] ${d.status}`.slice(0, 1000),
        reviewed_by: status === 'submitted' ? null : adminId, reviewed_at: status === 'submitted' ? null : reviewedAt,
        uploaded_at: dt(l.submittedAt), ...SYN,
      });
    }

    // partner assignment + field audit
    let assignmentId = null;
    let assignedAt = null;
    if (partner) {
      assignedAt = l.assignedAt ? dt(l.assignedAt) : plusDay(l.submittedAt);
      const done = l.status === 'verified' || l.status === 'flagged';
      const r = await ensure(conn, 'partner_assignments', { listing_id: id, partner_id: partner.id }, {
        listing_id: id, partner_id: partner.id, assigned_by: adminId, status: done ? 'completed' : 'active',
        admin_notes: 'Synthetic seed assignment for on-site audit.', assigned_at: assignedAt,
        completed_at: done ? dt(l.status === 'verified' ? l.verifiedAt : l.flaggedAt) : null, ...SYN,
      });
      assignmentId = r.id;
      if (l.fieldReport) {
        const f = l.fieldReport;
        const [lat, lng] = gps(f.gpsCoords);
        const flagged = l.status === 'flagged';
        await ensure(conn, 'field_audits', { assignment_id: assignmentId }, {
          assignment_id: assignmentId, listing_id: id, partner_id: partner.id, outcome: flagged ? 'flagged' : 'verified',
          inspected_on: f.inspectionDate, gps_lat: lat, gps_lng: lng, gps_verified: f.gpsLocationVerified ? 1 : 0,
          physical_keys_verified: f.physicalKeysVerified ?? null, owner_met_in_person: f.ownerMetInPerson ?? null,
          unit_vacant_available: f.unitVacantAndAvailable ?? null, discrepancy_found: flagged ? 1 : 0, notes: f.notes,
          created_at: dt(l.status === 'verified' ? l.verifiedAt : l.flaggedAt), ...SYN,
        });
      }
    }

    // feedback (one synthetic customer per reviewer name)
    let reviewerN = 200;
    for (const r of ratings) {
      const mockId = `reviewer:${slug(r.user)}`;
      if (!users[mockId]) await addUser({ mockId, role: 'customer', name: r.user, phoneNo: reviewerN++, designation: 'Past tenant (synthetic)', city: l.city, email: `${slug(r.user)}@example.test` });
      await ensure(conn, 'feedback', { listing_id: id, user_id: users[mockId].id }, {
        listing_id: id, user_id: users[mockId].id, rating: r.rating, comment: r.comment, created_at: dt(`${r.date}T00:00:00Z`), ...SYN,
      });
    }

    // audit log (reconstructed history; append-only table, so idempotency_key prevents duplicates)
    const log = (action, at, actor, label, detail) => ensure(conn, 'audit_logs', { idempotency_key: `seed:${l.id}:${action}` }, {
      occurred_at: at, listing_id: id, actor_user_id: actor, actor_label: label, action, detail,
      idempotency_key: `seed:${l.id}:${action}`, ...SYN,
    });
    await log('VENDOR_LISTING_SUBMITTED', dt(l.submittedAt), ownerId, `${l.ownerName} (vendor)`, 'Synthetic seed event: listing submitted.');
    if (partner) await log('ADMIN_ASSIGNED_PARTNER', assignedAt, adminId, `${mockUsers.admin.name} (admin)`, `Synthetic seed event: assigned to ${partner.name}.`);
    if (l.status === 'verified') await log('FIELD_VERIFICATION_APPROVED', dt(l.verifiedAt), partner.id, `${partner.name} (partner)`, 'Synthetic seed event: field audit passed (no real registry check performed).');
    if (l.status === 'flagged') await log(flaggerIsAdmin ? 'ADMIN_DIRECT_FLAGGED' : 'FIELD_INSPECTION_FLAGGED', dt(l.flaggedAt),
      flaggerIsAdmin ? adminId : partner.id, l.flaggedBy, l.flagReason);

    // MongoDB: flexible content only
    mongoDocs.push({
      _id: id,
      schemaVersion: new Int32(SCHEMA_VERSION),
      description: l.description,
      amenities: (l.amenities || []).map((a) => {
        const km = /([\d.]+)\s*km/i.exec(a.distance || '');
        return { category: category(a.name), name: a.detail, ...(km ? { distanceKm: Number(km[1]) } : {}), distanceLabel: a.distance };
      }),
      safety: { score: l.safetyScore, note: l.safetyNote, source: SRC },
      images: (l.images || []).map((url, i) => ({ url, isPrimary: i === 0, sortOrder: new Int32(i), source: 'demo_placeholder' })),
      tags: ['synthetic-demo-data', l.city.toLowerCase(), l.propertyType.toLowerCase()],
      attributes: {},
      metadata: { isSynthetic: true, dataSource: SRC, importBatch: 'seed-v1', createdAt: dt(l.submittedAt), updatedAt: dt(l.submittedAt) },
    });
  }
  await conn.commit();

  // ---------- MongoDB (after MySQL commit; a failed run is healed by simply re-running) ----------
  const { client, db } = await mongoConnect();
  try {
    const col = db.collection(COLLECTION);
    stats.mongo_property_details = { inserted: 0, existing: 0 };
    for (const { _id, ...doc } of mongoDocs) {
      const r = await col.updateOne({ _id }, { $setOnInsert: doc }, { upsert: true });
      stats.mongo_property_details[r.upsertedCount ? 'inserted' : 'existing']++;
    }
  } finally {
    await client.close();
  }

  console.log('Seed complete. All non-reference records are SYNTHETIC (data_source=synthetic_seed_v1).');
  console.table(stats);
  console.log('Synthetic demo accounts (non-routable placeholder phones; no OTP/SMS exists in this phase):');
  console.table(demoAccounts.slice(0, 5));
} catch (e) {
  await conn.rollback().catch(() => {});
  throw e;
} finally {
  await conn.end();
}
