/**
 * Translates database representations (MySQL row + child rows + MongoDB document)
 * into the JSON contract expected by the React frontend (matching src/data/initialListings.js).
 */

const AMENITY_CATEGORY_DISPLAY = {
  education: 'School / College',
  healthcare: 'Hospital',
  transit: 'Transit',
  market: 'Market / Grocery',
  safety: 'Safety',
  other: 'Other',
};

/**
 * Format date value to YYYY-MM-DD
 * @param {Date|string|null} val
 * @returns {string|null}
 */
function formatDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return String(val).split('T')[0];
}

/**
 * Serialize a single listing entity into the frontend JSON shape.
 *
 * @param {object} row - MySQL listing row with joined city, owner, partner, etc.
 * @param {object|null} mongoDoc - MongoDB property_details document
 * @param {Array<object>} [documents=[]] - Associated listing_documents records
 * @param {object|null} [fieldAudit=null] - Latest field_audits record
 * @param {Array<object>} [feedbackRows=[]] - Feedback/rating records
 * @returns {object} Canonical frontend listing JSON
 */
export function serializeListing(row, mongoDoc = null, documents = [], fieldAudit = null, feedbackRows = []) {
  // Format assigned partner name with zone if available
  let assignedPartnerName = null;
  if (row.assigned_partner_name) {
    assignedPartnerName = row.assigned_partner_zone
      ? `${row.assigned_partner_name} (${row.assigned_partner_zone})`
      : row.assigned_partner_name;
  }

  // Format verifiedBy if verified
  let verifiedBy = null;
  if (row.status === 'verified') {
    if (row.verified_by_badge) {
      verifiedBy = `Officer ${row.verified_by_name || 'Partner'} (${row.verified_by_badge})`;
    } else if (row.verified_by_name) {
      verifiedBy = row.verified_by_name;
    }
  }

  // Map documents (masked PII)
  const mappedDocuments = documents.map((doc) => {
    // Strip '[synthetic] ' prefix if present to restore original display label
    let cleanStatus = doc.review_note || doc.review_status;
    if (cleanStatus && cleanStatus.startsWith('[synthetic] ')) {
      cleanStatus = cleanStatus.replace(/^\[synthetic\]\s*/i, '');
    }

    return {
      type: doc.doc_type,
      // "XXXX" plus last4 for docNumber; never expose full document numbers
      docNumber: doc.doc_number_last4 ? `XXXX-XXXX-${doc.doc_number_last4}` : 'XXXX-XXXX-None',
      status: cleanStatus,
      date: formatDateOnly(doc.uploaded_at) || 'Uploaded',
    };
  });

  // Map field report if present
  let fieldReport = null;
  if (fieldAudit) {
    const hasGps = fieldAudit.gps_lat != null && fieldAudit.gps_lng != null;
    fieldReport = {
      inspectionDate: formatDateOnly(fieldAudit.inspected_on),
      officer: fieldAudit.partner_name || row.assigned_partner_name || 'Field Officer',
      badgeNumber: fieldAudit.badge_number || row.assigned_partner_badge || 'VP',
      gpsLocationVerified: Boolean(fieldAudit.gps_verified),
      gpsCoords: hasGps ? `${fieldAudit.gps_lat}° N, ${fieldAudit.gps_lng}° E` : null,
      physicalKeysVerified: fieldAudit.physical_keys_verified != null ? Boolean(fieldAudit.physical_keys_verified) : null,
      ownerMetInPerson: fieldAudit.owner_met_in_person != null ? Boolean(fieldAudit.owner_met_in_person) : null,
      unitVacantAndAvailable: fieldAudit.unit_vacant_available != null ? Boolean(fieldAudit.unit_vacant_available) : null,
      notes: fieldAudit.notes || '',
    };
    if (fieldAudit.discrepancy_found) {
      fieldReport.discrepancyFound = true;
    }
  }

  // Map amenities from Mongo
  const mappedAmenities = (mongoDoc?.amenities || []).map((amenity) => ({
    name: AMENITY_CATEGORY_DISPLAY[amenity.category] || amenity.category,
    detail: amenity.name,
    distance: amenity.distanceLabel || (amenity.distanceKm != null ? `${amenity.distanceKm} km` : ''),
  }));

  // Map images sorted by sortOrder
  const mappedImages = (mongoDoc?.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((img) => img.url || (img.storageKey ? `/api/files/${img.storageKey}` : ''))
    .filter(Boolean);

  // Map ratings from feedback
  const mappedRatings = feedbackRows.map((fb) => ({
    user: fb.user_name || 'Verified Tenant',
    role: 'Past Tenant',
    rating: Number(fb.rating),
    date: formatDateOnly(fb.created_at) || '',
    comment: fb.comment || '',
  }));

  const payload = {
    id: row.id,
    legacyRef: row.legacy_ref || undefined,
    title: row.title,
    city: row.city_name,
    locality: row.locality,
    state: row.city_state || 'Maharashtra',
    propertyType: row.property_type,
    rent: Number(row.rent_inr),
    deposit: Number(row.deposit_inr),
    furnishing: row.furnishing,
    carpetArea: row.carpet_area_sqft ? `${row.carpet_area_sqft} sq.ft` : null,
    floor: row.floor_label || null,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerRole: row.owner_capacity || 'Independent Owner',
    status: row.status,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    assignedPartnerId: row.assigned_partner_id || null,
    assignedPartnerName,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    verifiedBy,
    verificationSealId: row.seal_id || null,
    documents: mappedDocuments,
    fieldReport,
    amenities: mappedAmenities,
    safetyNote: mongoDoc?.safety?.note || null,
    safetyScore: mongoDoc?.safety?.score != null ? Number(mongoDoc.safety.score) : null,
    credibilityScore: row.credibility_score != null ? Number(row.credibility_score) : null,
    ratingAvg: row.rating_avg != null ? Number(row.rating_avg) : null,
    ratingCount: Number(row.rating_count || 0),
    images: mappedImages,
    description: mongoDoc?.description || '',
    ratings: mappedRatings,
  };

  // If listing is flagged, include flag audit info
  if (row.status === 'flagged') {
    payload.flaggedAt = row.flagged_at ? new Date(row.flagged_at).toISOString() : null;
    payload.flaggedBy = row.flagged_by_name || null;
    payload.flagCategory = row.flag_category || null;
    payload.flagReason = row.flag_reason || null;
  }

  return payload;
}
