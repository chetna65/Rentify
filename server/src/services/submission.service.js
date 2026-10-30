import crypto from 'node:crypto';
import { Int32 } from 'mongodb';
import { mysqlPool } from '../config/mysql.js';
import { getPropertyDetails } from '../config/mongo.js';
import { saveFile, deleteListingUploads } from './storage.service.js';
import { getListingById } from './listing.service.js';
import { computeFraudSignals } from './fraud.service.js';
import { HttpError } from '../utils/httpError.js';

const VALID_AMENITY_CATEGORIES = new Set([
  'education',
  'healthcare',
  'transit',
  'market',
  'safety',
  'other',
]);

/**
 * Maps an incoming amenity object to strict MongoDB schema validator specs.
 * @param {object} raw
 * @returns {object} Clean amenity object for property_details.amenities
 */
function mapAmenityToMongo(raw) {
  let cat = 'other';
  const nameOrCat = String(raw.category || raw.name || '').toLowerCase();
  if (nameOrCat.includes('school') || nameOrCat.includes('college') || nameOrCat.includes('education')) {
    cat = 'education';
  } else if (
    nameOrCat.includes('hospital') ||
    nameOrCat.includes('clinic') ||
    nameOrCat.includes('healthcare') ||
    nameOrCat.includes('medical')
  ) {
    cat = 'healthcare';
  } else if (
    nameOrCat.includes('transit') ||
    nameOrCat.includes('metro') ||
    nameOrCat.includes('bus') ||
    nameOrCat.includes('train')
  ) {
    cat = 'transit';
  } else if (
    nameOrCat.includes('market') ||
    nameOrCat.includes('grocery') ||
    nameOrCat.includes('supermarket') ||
    nameOrCat.includes('store') ||
    nameOrCat.includes('shopping')
  ) {
    cat = 'market';
  } else if (nameOrCat.includes('safety') || nameOrCat.includes('police')) {
    cat = 'safety';
  }

  const name = String(raw.detail || raw.name || 'Amenity').slice(0, 200);

  let km = null;
  if (typeof raw.distanceKm === 'number' && raw.distanceKm >= 0 && raw.distanceKm <= 500) {
    km = raw.distanceKm;
  } else if (raw.distance) {
    const m = /([\d.]+)\s*km/i.exec(String(raw.distance));
    if (m) {
      const parsed = parseFloat(m[1]);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 500) km = parsed;
    }
  }

  const amenity = {
    category: cat,
    name,
  };

  if (km != null) {
    amenity.distanceKm = km;
  }

  const distLabel = String(raw.distanceLabel || raw.distance || '').slice(0, 60);
  if (distLabel) {
    amenity.distanceLabel = distLabel;
  }

  return amenity;
}

/**
 * Create a new property listing submitted by an authenticated vendor.
 * Coordinates file saving, MySQL transaction, and MongoDB document creation with compensation on failure.
 *
 * @param {object} params
 * @param {object} params.payload - Validated form fields
 * @param {Array<object>} params.files - Uploaded file objects from multer
 * @param {object} params.user - Authenticated vendor user
 * @returns {Promise<object>} Created and serialized listing JSON
 */
export async function createVendorListing({ payload, files = [], user }) {
  // 1. Verify city exists in cities table
  const [cityRows] = await mysqlPool.query(
    'SELECT id, name, state FROM cities WHERE name = ? AND is_active = 1 LIMIT 1',
    [payload.city]
  );

  if (cityRows.length === 0) {
    throw HttpError.badRequest(
      `City '${payload.city}' is not serviced. Please choose from active cities (e.g. Nagpur, Pune).`
    );
  }
  const city = cityRows[0];

  // 2. Generate immutable shared property UUID (lowercase)
  const listingId = crypto.randomUUID().toLowerCase();

  // 3. Save uploaded files to storage
  const savedFiles = [];
  try {
    for (const file of files) {
      const saved = await saveFile(file, listingId);
      savedFiles.push({ ...saved, originalname: file.originalname });
    }
  } catch (fileErr) {
    await deleteListingUploads(listingId);
    throw HttpError.badRequest(`Failed to save uploaded files: ${fileErr.message}`);
  }

  // 4. Organize document metadata
  const docMetaList = [];
  if (Array.isArray(payload.documents) && payload.documents.length > 0) {
    docMetaList.push(...payload.documents);
  } else if (payload.docType) {
    docMetaList.push({
      type: payload.docType,
      docNumber: payload.docNumber,
    });
  } else {
    docMetaList.push({
      type: 'Index II Title Deed',
      docNumber: payload.docNumber || null,
    });
  }

  // Separate document files (PDFs) from photo uploads
  const pdfFiles = savedFiles.filter((f) => f.mimeType === 'application/pdf');
  const imageFiles = savedFiles.filter((f) => f.mimeType.startsWith('image/'));

  // 5. Begin transactional orchestration
  const conn = await mysqlPool.getConnection();
  let mongoInserted = false;

  try {
    await conn.beginTransaction();

    // 5.1 Insert MySQL listings row
    await conn.query(
      `INSERT INTO listings (
         id, owner_id, owner_role, city_id, locality, title, property_type,
         rent_inr, deposit_inr, furnishing, carpet_area_sqft, floor_label,
         owner_capacity, status, credibility_score, is_synthetic, data_source
       ) VALUES (?, ?, 'vendor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 70, 0, 'app')`,
      [
        listingId,
        user.id,
        city.id,
        payload.locality,
        payload.title,
        payload.propertyType,
        payload.rent,
        payload.deposit,
        payload.furnishing,
        payload.carpetArea || null,
        payload.floor || null,
        payload.ownerRole || 'Independent Owner',
      ]
    );

    // 5.2 Insert listing_documents rows
    for (let i = 0; i < docMetaList.length; i++) {
      const doc = docMetaList[i];
      const attachedFile = pdfFiles[i] || (pdfFiles.length === 0 ? imageFiles[i] : null);

      const alnum = String(doc.docNumber || '').replace(/[^A-Za-z0-9]/g, '');
      const last4 = alnum ? alnum.slice(-4) : null;

      await conn.query(
        `INSERT INTO listing_documents (
           listing_id, doc_type, doc_number_last4, review_status,
           storage_key, file_sha256, mime_type, size_bytes, is_synthetic, data_source
         ) VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, 0, 'app')`,
        [
          listingId,
          doc.type || doc.docType || 'Index II Title Deed',
          last4,
          attachedFile ? attachedFile.storageKey : null,
          attachedFile ? attachedFile.sha256 : null,
          attachedFile ? attachedFile.mimeType : null,
          attachedFile ? attachedFile.sizeBytes : null,
        ]
      );
    }

    // 5.3 Insert audit_logs entry: VENDOR_LISTING_SUBMITTED
    await conn.query(
      `INSERT INTO audit_logs (
         listing_id, actor_user_id, actor_label, action, detail, idempotency_key, is_synthetic, data_source
       ) VALUES (?, ?, ?, 'VENDOR_LISTING_SUBMITTED', ?, ?, 0, 'app')`,
      [
        listingId,
        user.id,
        `${user.name} (vendor)`,
        `New listing submission by vendor: ${payload.title}`,
        `listing:${listingId}:VENDOR_LISTING_SUBMITTED`,
      ]
    );

    // 5.4 Prepare MongoDB property_details document
    const mappedAmenities = (payload.amenities || []).map(mapAmenityToMongo);

    const mongoImages = imageFiles.map((img, idx) => ({
      storageKey: img.storageKey,
      caption: `Property photo ${idx + 1}`,
      isPrimary: idx === 0,
      sortOrder: new Int32(idx),
      source: 'owner_upload',
    }));

    // If no images were uploaded, provide a default demo placeholder
    if (mongoImages.length === 0) {
      mongoImages.push({
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
        caption: 'Placeholder property image',
        isPrimary: true,
        sortOrder: new Int32(0),
        source: 'demo_placeholder',
      });
    }

    const now = new Date();
    const mongoDoc = {
      _id: listingId,
      schemaVersion: new Int32(1),
      description: payload.description,
      amenities: mappedAmenities,
      safety: {
        score: 8.0,
        note: 'Vendor self-submitted listing. Physical safety assessment scheduled upon field verification.',
        source: 'app',
      },
      images: mongoImages,
      tags: [city.name.toLowerCase(), payload.propertyType.toLowerCase()],
      attributes: {},
      metadata: {
        isSynthetic: false,
        dataSource: 'app',
        createdAt: now,
        updatedAt: now,
      },
    };

    // 5.5 Insert into MongoDB property_details
    await getPropertyDetails().insertOne(mongoDoc);
    mongoInserted = true;

    // 5.6 Compute fraud detection signals on newly submitted listing
    const fraudSignals = await computeFraudSignals(listingId, conn);
    if (fraudSignals && fraudSignals.length > 0) {
      const severeSignals = fraudSignals.filter((s) => s.severity === 'high' || s.severity === 'medium');
      if (severeSignals.length > 0) {
        await conn.query(
          `INSERT INTO audit_logs (
             listing_id, actor_user_id, actor_label, action, detail, idempotency_key, is_synthetic, data_source
           ) VALUES (?, ?, ?, 'FRAUD_SIGNALS_EVALUATED', ?, ?, 0, 'app')`,
          [
            listingId,
            user.id,
            `${user.name} (vendor)`,
            `Evaluated ${severeSignals.length} risk signal(s): ${severeSignals.map((s) => s.code).join(', ')}`,
            `fraud:${listingId}:${Date.now()}`,
          ]
        );
      }
    }

    // 5.7 Commit MySQL transaction
    await conn.commit();
  } catch (txErr) {
    // Compensation logic: rollback MySQL and clean up storage/Mongo
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Failed to rollback MySQL transaction:', rbErr.message);
    }

    if (mongoInserted) {
      try {
        await getPropertyDetails().deleteOne({ _id: listingId });
      } catch (mDelErr) {
        console.error('Failed to compensate MongoDB document:', mDelErr.message);
      }
    }

    // Delete stored files
    await deleteListingUploads(listingId);

    console.error('Error during listing creation:', txErr);
    if (txErr instanceof HttpError) throw txErr;
    throw HttpError.internal(`Failed to create listing: ${txErr.message}`);
  } finally {
    conn.release();
  }

  // 6. Return fully serialized listing with fraud signals
  const serialized = await getListingById(listingId);
  return {
    ...serialized,
    fraudSignals: await computeFraudSignals(listingId),
  };
}

/**
 * Resubmit a flagged listing owned by the vendor.
 * Transitions status: flagged -> pending (clearing all flag fields per database constraints).
 *
 * @param {string} listingId - UUID of the listing
 * @param {object} user - Authenticated vendor user
 * @returns {Promise<object>} Updated and serialized listing JSON
 */
export async function resubmitFlaggedListing(listingId, user) {
  const [rows] = await mysqlPool.query(
    'SELECT id, owner_id, status FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );

  // Vendor must never be able to read or modify another vendor's listing: return 404
  if (rows.length === 0 || rows[0].owner_id !== user.id) {
    throw HttpError.notFound(`Listing not found with ID ${listingId}`);
  }

  const listing = rows[0];

  if (listing.status !== 'flagged') {
    throw HttpError.badRequest(
      `Only listings currently in 'flagged' status can be resubmitted. Current status is '${listing.status}'.`
    );
  }

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();

    // Move flagged -> pending, clearing flag fields as required by chk_listings_flagged
    await conn.query(
      `UPDATE listings SET
         status = 'pending',
         flag_category = NULL,
         flag_reason = NULL,
         flagged_at = NULL,
         flagged_by = NULL,
         version = version + 1
       WHERE id = ? AND owner_id = ?`,
      [listingId, user.id]
    );

    // Insert audit log: VENDOR_LISTING_RESUBMITTED
    await conn.query(
      `INSERT INTO audit_logs (
         listing_id, actor_user_id, actor_label, action, detail, idempotency_key, is_synthetic, data_source
       ) VALUES (?, ?, ?, 'VENDOR_LISTING_RESUBMITTED', ?, ?, 0, 'app')`,
      [
        listingId,
        user.id,
        `${user.name} (vendor)`,
        'Vendor resubmitted flagged listing for re-inspection after rectifying discrepancies',
        `resubmit:${listingId}:${Date.now()}`,
      ]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return await getListingById(listingId);
}
