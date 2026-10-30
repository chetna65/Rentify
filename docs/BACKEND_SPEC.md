# Rentify Backend Architecture & Implementation Specification

## Document Overview
This document specifies the technical architecture, data model invariants, data mapping contracts, and engineering guidelines for the **Rentify Backend Service**.

The system replaces the prototype's client-side mock storage with a dual-database architecture: **MySQL 8** (authoritative transactional data) and **MongoDB 8** (flexible content and metadata).

---

## 1. Architecture & Dual-Database Strategy

### 1.1 Source of Truth Principles
The platform splits responsibilities strictly between relational and document databases:
1. **MySQL 8 is the single source of truth** for all business-critical, transactional, access-controlled, and audited data. Any discrepancy between MySQL and MongoDB is resolved in favor of MySQL.
2. **MongoDB 8 (`property_details` collection)** serves as a secondary, flexible content store for presentation-heavy attributes that do not dictate permissions, transactions, or state transitions.
3. **Core entity attributes are never replicated into MongoDB**. Fields such as status, rent, deposit, owner identity, verification seal, or ratings are prohibited in MongoDB to prevent data drift.

### 1.2 Data Ownership Matrix

| Domain / Entity | Database | Responsible Table / Collection | Key Responsibilities |
|---|---|---|---|
| **Identity & Access** | MySQL 8 | `users`, `partner_profiles`, `sessions` | Users, roles (`customer`, `vendor`, `admin`, `partner`), phone-based identity (+91), hashed sessions (`token_hash` SHA-256), partner badge numbers, zones. |
| **Locations** | MySQL 8 | `cities` | Reference table of active cities (Nagpur, Pune) with 3-letter codes used in verification seal generation. |
| **Core Listings** | MySQL 8 | `listings` | Canonical listing identity, owner reference, city, locality, title, property type, rent, deposit, furnishing, carpet area, floor label, lifecycle status, verification seal, flag details, credibility score, denormalized ratings summary. |
| **Ownership Proofs** | MySQL 8 | `listing_documents` | Metadata only: document type, last 4 characters of doc number, review workflow status (`submitted`, `admin_checked`, `accepted`, `rejected`, `suspended`), reviewer ID, private storage key, SHA-256 file hash, MIME type, size. |
| **Field Verification** | MySQL 8 | `partner_assignments`, `field_audits` | Verification assignments dispatched by admins to partners, on-site audit results (inspection date, GPS lat/lng, key checks, owner meeting, vacancy, discrepancy flags, audit notes). |
| **Reviews & Feedback** | MySQL 8 | `feedback` | Move-in customer ratings (1–5) and comments, strictly restricted to customer role. |
| **Audit Trail** | MySQL 8 | `audit_logs` | Append-only historical ledger recording every security, state, and verification event with actor details, action verb, and idempotency key. |
| **Flexible Content** | MongoDB 8 | `property_details` | Long-form property description, categorized amenities with distances, image references (URL or storage key with sorting/captions), neighborhood safety notes/scores, tags, free-form attributes. |

### 1.3 Shared Identity Model
- Every listing is identified by a **lowercase UUID** (RFC 4122).
- `listings.id` in MySQL is exactly equal to `_id` (string UUID) in MongoDB's `property_details` collection.
- A listing cannot exist in MongoDB without an existing row in MySQL `listings`. MongoDB records are created and updated as part of the listing lifecycle orchestration.

---

## 2. Database-Enforced Invariants & Constraints

The database engines themselves enforce business invariants via triggers, generated columns, foreign keys, and CHECK constraints. The backend service relies on these constraints as an authoritative baseline and must never attempt to bypass them.

### 2.1 Listing Status Transition State Machine
Status transitions are enforced by the MySQL trigger `trg_listings_guard_update`:
- **Allowed Transitions**:
  - `pending` $\rightarrow$ `in-review` (when Admin assigns a partner)
  - `pending` $\rightarrow$ `verified` (Admin direct approval on legal documents)
  - `pending` $\rightarrow$ `flagged` (Admin direct rejection/flagging)
  - `in-review` $\rightarrow$ `verified` (Partner on-site verification approved)
  - `in-review` $\rightarrow$ `flagged` (Partner on-site audit failure or admin flag)
  - `verified` $\rightarrow$ `flagged` (Revocation of seal due to subsequent fraud/dispute)
  - `flagged` $\rightarrow$ `pending` (Resubmission by vendor following remediation)
- **Immutable UUID**: The trigger rejects any modification to `listings.id` (`SIGNAL SQLSTATE '45000'`).
- Any transition not explicitly enumerated above is aborted with `'Invalid listing status transition'`.

### 2.2 Role-Pinned Foreign Keys
To prevent role confusion and privilege escalation:
- The `users` table exposes a unique composite key: `UNIQUE KEY uq_users_id_role (id, role)`.
- **Listing Ownership**: `listings (owner_id, owner_role)` references `users (id, role)` with `chk_listings_owner_role CHECK (owner_role = 'vendor')`. Customers, admins, or partners cannot own listings.
- **Partner Profiles**: `partner_profiles (user_id, role)` references `users (id, role)` with `chk_partner_role CHECK (role = 'partner')`.
- **Partner Assignments**:
  - `partner_assignments (partner_id, partner_role)` references `users (id, role)`.
  - `partner_assignments (assigned_by, assigner_role)` references `users (id, role)`.
  - Constraint `chk_assignment_roles` mandates `partner_role = 'partner'` and `assigner_role = 'admin'`. Partners cannot assign themselves, nor can vendors assign partners.
- **Feedback Submissions**: `feedback (user_id, user_role)` references `users (id, role)` with `chk_feedback_role CHECK (user_role = 'customer')`. Only verified customers can submit reviews.

### 2.3 Single Active Partner Assignment Invariant
- A listing can only have **one active assignment** at any given moment.
- Enforced using a virtual generated column:
  ```sql
  active_listing_id CHAR(36) GENERATED ALWAYS AS (IF(status = 'active', listing_id, NULL)) VIRTUAL,
  UNIQUE KEY uq_assignment_one_active (active_listing_id)
  ```
- Because MySQL allows multiple `NULL` values in a unique index, completed or cancelled assignments evaluate to `NULL`, whereas active assignments evaluate to `listing_id`, enforcing at most one active assignment per listing.
- Assignments also maintain the triplet constraint `UNIQUE KEY uq_assignment_triplet (id, listing_id, partner_id)` to ensure that child `field_audits` cannot reference mismatched listings or partners.

### 2.4 One Feedback Per User Per Listing
- Enforced by `UNIQUE KEY uq_feedback_one_per_user (listing_id, user_id)`.
- Customers cannot spam reviews on a listing; repeated submissions must update existing feedback or be rejected.

### 2.5 Append-Only Audit Trail
- The `audit_logs` table stores the chronological history of the application.
- Mutating historical records is strictly prohibited:
  - `trg_audit_logs_no_update` fires BEFORE UPDATE and raises `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only'`.
  - `trg_audit_logs_no_delete` fires BEFORE DELETE and raises `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only'`.
- All actions must follow the uppercase naming standard `^[A-Z][A-Z0-9_]{2,59}$` (e.g., `VENDOR_LISTING_SUBMITTED`, `ADMIN_ASSIGNED_PARTNER`, `FIELD_VERIFICATION_APPROVED`).
- Replay and duplication attacks are blocked by `UNIQUE KEY uq_audit_idempotency (idempotency_key)`.

### 2.6 State-Dependent Listing CHECK Constraints
- **Verified Rows (`chk_listings_verified`)**:
  - If `status = 'verified'`, `seal_id`, `verified_at`, and `verified_by` must all be non-null.
  - A listing cannot claim verified status without seal issuance and officer accountability.
- **Flagged Rows (`chk_listings_flagged`)**:
  - If `status = 'flagged'`, `flag_reason`, `flagged_at`, and `flagged_by` must all be non-null.
- **Financial & Property Invariants**:
  - Rent must be positive: `rent_inr > 0`.
  - Carpet area must be positive if provided: `carpet_area_sqft IS NULL OR carpet_area_sqft > 0`.
  - Credibility score bounded: `credibility_score IS NULL OR credibility_score <= 100`.
  - Rating consistency: `(rating_count = 0 AND rating_avg IS NULL) OR (rating_count > 0 AND rating_avg BETWEEN 1 AND 5)`.

### 2.7 Document Security, Storage Keys & PII Protection
- **Storage Keys (`chk_docs_storage_key`)**:
  - `storage_key` must be a relative path in private object storage:
  - `storage_key NOT REGEXP '^(https?:|/)|[.][.]'` rejects absolute paths, web URLs, and directory traversal tokens (`..`).
- **Binary Integrity (`chk_docs_file`)**:
  - If a file is attached, `storage_key`, `file_sha256` (64 hex characters), `mime_type`, and `size_bytes` (> 0) must all be simultaneously present.
- **PII Minification (`chk_docs_last4`)**:
  - Full Aadhaar, PAN, or Registry numbers are never stored in plain text.
  - Only the last 1 to 4 alphanumeric characters are recorded: `doc_number_last4 REGEXP '^[A-Za-z0-9]{1,4}$'`.
- **Review Accountability (`chk_docs_review`)**:
  - Documents in `submitted` state must have null reviewer details. Once moved to `accepted`, `rejected`, `admin_checked`, or `suspended`, `reviewed_by` and `reviewed_at` are mandatory.

### 2.8 Field Audit Integrity & GPS Bounding
- Each partner assignment permits at most one field audit report (`UNIQUE KEY uq_audit_assignment (assignment_id)`).
- **GPS Bounding (`chk_audit_gps`)**:
  - Geographic coordinates must be within the territorial bounding box of India: `gps_lat BETWEEN 6 AND 38 AND gps_lng BETWEEN 68 AND 98` (or both null).
- **Outcome Parity (`chk_audit_outcome`)**:
  - If `outcome = 'flagged'`, `discrepancy_found` must be 1.
  - If `outcome = 'verified'`, `discrepancy_found` must be 0.

### 2.9 Synthetic Data vs Real Data Segregation
- The database isolates synthetic seed/test data from genuine user data.
- Enforced via check constraints across all core tables:
  ```sql
  CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
  ```

### 2.10 MongoDB Strict Schema Validation
The MongoDB collection `property_details` enforces schema validation with `validationLevel: 'strict'` and `validationAction: 'error'`:
- `additionalProperties: false` is enforced at the root level and on all sub-documents (`amenities`, `safety`, `images`, `metadata`). Core fields (such as `rent`, `status`, `city`, `owner_id`) are rejected by MongoDB engine (error code 121).
- `_id` must match the lowercase UUID pattern `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`.
- Amenities: Maximum 50 items. Each item must have `category` in `['education', 'healthcare', 'transit', 'market', 'safety', 'other']` and a `name`.
- Images: Maximum 30 items. Each item requires either an `https://` URL or a `storageKey`, with `source` in `['owner_upload', 'partner_upload', 'demo_placeholder']`.

---

## 3. Database to Frontend Data Mapping Specification

The React frontend (`RentifyContext.jsx`, `initialListings.js`) expects a unified JSON representation for each listing. The backend serializer merges data from MySQL tables and MongoDB `property_details`.

### 3.1 Field-by-Field Listing Mapping

| Frontend Listing Field | Source Database | Source Table & Column / Field | Transformation / Serialization Logic |
|---|---|---|---|
| `id` | MySQL 8 | `listings.id` | Lowercase UUID string (e.g. `"a3f1c2d4-5b6e-4f70-8a91-0b2c3d4e5f60"`). Frontend components accept UUIDs transparently. |
| `legacyRef` / `legacy_ref` | MySQL 8 | `listings.legacy_ref` | Optional seed reference (e.g. `"prop-ngp-01"`), null for organic records. |
| `title` | MySQL 8 | `listings.title` | Direct string mapping. |
| `city` | MySQL 8 | `cities.name` | Resolved via `JOIN cities ON cities.id = listings.city_id` (e.g. `"Nagpur"`, `"Pune"`). |
| `locality` | MySQL 8 | `listings.locality` | Direct string mapping. |
| `state` | MySQL 8 | `cities.state` | Resolved from `cities` table (default `"Maharashtra"`). |
| `propertyType` | MySQL 8 | `listings.property_type` | Direct enum mapping: `"1RK"`, `"1BHK"`, `"2BHK"`, `"3BHK"`, `"4BHK"`. |
| `rent` | MySQL 8 | `listings.rent_inr` | Integer representing monthly rent in INR. |
| `deposit` | MySQL 8 | `listings.deposit_inr` | Integer representing security deposit in INR. |
| `furnishing` | MySQL 8 | `listings.furnishing` | Enum string: `"Unfurnished"`, `"Semi-Furnished"`, `"Fully Furnished"`. |
| `carpetArea` | MySQL 8 | `listings.carpet_area_sqft` | Formatted string: `${carpet_area_sqft} sq.ft` if non-null, else `null`. |
| `floor` | MySQL 8 | `listings.floor_label` | String (e.g. `"3rd of 5 floors"`, `"Ground Floor"`). |
| `ownerName` | MySQL 8 | `users.full_name` (as owner) | Joined via `owner_id = users.id`. |
| `ownerPhone` | MySQL 8 | `users.phone` (as owner) | Standard E.164 phone string (e.g. `"+919823044120"`). |
| `ownerRole` | MySQL 8 | `listings.owner_capacity` | Descriptive string (e.g. `"Independent Owner"`). |
| `status` | MySQL 8 | `listings.status` | Enum string: `"pending"`, `"in-review"`, `"verified"`, `"flagged"`. |
| `submittedAt` | MySQL 8 | `listings.submitted_at` | ISO 8601 UTC timestamp string. |
| `assignedPartnerId` | MySQL 8 | `partner_assignments.partner_id` | Partner UUID from the active assignment row, or `null`. |
| `assignedPartnerName`| MySQL 8 | `users.full_name` + `partner_profiles.zone` | Formatted: `${partner.full_name} (${partner_profiles.zone})` or `null`. |
| `assignedAt` | MySQL 8 | `partner_assignments.assigned_at` | ISO 8601 string from active assignment, or `null`. |
| `adminReviewNotes` | MySQL 8 | `partner_assignments.admin_notes` | Admin notes string from active assignment, or `null`. |
| `verifiedAt` | MySQL 8 | `listings.verified_at` | ISO 8601 string if status is verified, else `null`. |
| `verifiedBy` | MySQL 8 | `users.full_name` + `partner_profiles.badge_number` | Formatted: `Officer ${name} (${badge_number})` or `null`. |
| `verificationSealId`| MySQL 8 | `listings.seal_id` | Official seal string (e.g. `"MH-NGP-2026-0842"`), or `null`. |
| `flaggedAt` | MySQL 8 | `listings.flagged_at` | ISO 8601 string if status is flagged, else `null`. |
| `flaggedBy` | MySQL 8 | `users.full_name` (as flagger) | Formatted officer/admin name, or `null`. |
| `flagCategory` | MySQL 8 | `listings.flag_category` | Flag category description string, or `null`. |
| `flagReason` | MySQL 8 | `listings.flag_reason` | Full justification text for flagging, or `null`. |
| `credibilityScore` | MySQL 8 | `listings.credibility_score` | Integer 0–100 heuristic score. |
| `ratingAvg` | MySQL 8 | `listings.rating_avg` | Float 1.00–5.00 or `null`. |
| `ratingCount` | MySQL 8 | `listings.rating_count` | Non-negative integer. |
| `description` | MongoDB 8 | `property_details.description` | Full property description string. |
| `safetyNote` | MongoDB 8 | `property_details.safety.note` | Safety review notes string. |
| `safetyScore` | MongoDB 8 | `property_details.safety.score` | Number (0.0 to 10.0). |
| `images` | MongoDB 8 | `property_details.images` | Array of image URL strings ordered by `sortOrder`. |
| `tags` | MongoDB 8 | `property_details.tags` | Array of strings. |
| `attributes` | MongoDB 8 | `property_details.attributes` | Free-form key-value dictionary. |

---

### 3.2 Complex Sub-Document Mappings

#### A. Documents Array (`listing.documents`)
Assembled from MySQL `listing_documents`:
```javascript
documents: listingDocuments.map(doc => ({
  id: doc.id,
  type: doc.doc_type,
  docNumber: doc.doc_number_last4 ? `XXXX-XXXX-${doc.doc_number_last4}` : 'Not Disclosed',
  status: doc.review_note || doc.review_status,
  reviewStatus: doc.review_status,
  hasFile: Boolean(doc.storage_key),
  date: doc.uploaded_at ? new Date(doc.uploaded_at).toISOString().split('T')[0] : null
}))
```

#### B. Field Report (`listing.fieldReport`)
Assembled from MySQL `field_audits` (joined with partner user & profile):
```javascript
fieldReport: fieldAudit ? {
  inspectionDate: fieldAudit.inspected_on, // "YYYY-MM-DD"
  officer: fieldAudit.partner_name,
  badgeNumber: fieldAudit.badge_number,
  gpsLocationVerified: Boolean(fieldAudit.gps_verified),
  gpsCoords: fieldAudit.gps_lat && fieldAudit.gps_lng 
    ? `${fieldAudit.gps_lat}° N, ${fieldAudit.gps_lng}° E` 
    : null,
  physicalKeysVerified: Boolean(fieldAudit.physical_keys_verified),
  ownerMetInPerson: Boolean(fieldAudit.owner_met_in_person),
  unitVacantAndAvailable: Boolean(fieldAudit.unit_vacant_available),
  discrepancyFound: Boolean(fieldAudit.discrepancy_found),
  notes: fieldAudit.notes
} : null
```

#### C. Amenities Array (`listing.amenities`)
Assembled from MongoDB `property_details.amenities`:
```javascript
amenities: (mongoDoc.amenities || []).map(a => ({
  name: a.category.charAt(0).toUpperCase() + a.category.slice(1), // e.g. "Transit"
  detail: a.name,                                                // e.g. "Aqua Line Metro"
  distance: a.distanceLabel || (a.distanceKm ? `${a.distanceKm} km` : 'Nearby')
}))
```

#### D. Ratings Array (`listing.ratings`)
Assembled from MySQL `feedback` (joined with customer user):
```javascript
ratings: feedbackRows.map(f => ({
  id: f.id,
  user: f.user_full_name,
  role: "Verified Tenant",
  rating: f.rating,
  date: new Date(f.created_at).toISOString().split('T')[0],
  comment: f.comment
}))
```

---

## 4. Backend Engineering Rules & Standards

### 4.1 Tech Stack & Environment
- **Runtime**: Node.js $\ge 20.6$ (using native `--env-file=.env` and modern crypto).
- **Module System**: Plain JavaScript with ECMAScript Modules (`"type": "module"` in `package.json`).
- **Core Framework**: Express 4 / 5.
- **Database Drivers**:
  - MySQL: `mysql2/promise` (connection pooling with `timezone: 'Z'` and `charset: 'utf8mb4'`).
  - MongoDB: `mongodb` (`MongoClient` with connection pooling).
- **Validation**: `zod` for validating all incoming request bodies, query parameters, and route parameters.

### 4.2 Standard Directory Layout
All backend code resides in `server/src/`:
```text
server/
├── package.json
├── .env.example
├── src/
│   ├── config/          # Database pools (mysqlPool, mongoClient), environment loaders
│   ├── middleware/      # authGuard, roleGuard, validateRequest, errorHandler, requestLogger
│   ├── routes/          # Express routers: auth, listings, admin, partner, feedback
│   ├── controllers/     # HTTP layer: parse inputs, invoke services, send HTTP status
│   ├── services/        # Core business logic: owns DB transactions, writes audit logs
│   ├── serializers/     # Translates raw DB + Mongo models to frontend JSON contract
│   ├── schemas/         # Zod schemas for input validation and state contracts
│   ├── data/            # Static constants, error codes, enum definitions
│   └── utils/           # Shared helpers: crypto, phone normalization, formatters
```

### 4.3 Architecture & Transaction Rules
1. **Thin Controllers**: Controllers must contain **no SQL**, **no MongoDB queries**, and **no business rules**. They strictly:
   - Extract parameters from `req`.
   - Validate inputs via Zod.
   - Delegate execution to the appropriate service.
   - Pass results through the serializer.
   - Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500).
2. **Services Own Transactions**:
   - Every state-changing operation (submitting a listing, assigning a partner, submitting a field audit, approving/flagging a listing, adding feedback) must execute within an explicit MySQL transaction:
     ```javascript
     const conn = await mysqlPool.getConnection();
     try {
       await conn.beginTransaction();
       // 1. Business logic & updates
       // 2. Mandatory audit_logs row
       await conn.commit();
     } catch (err) {
       await conn.rollback();
       throw err;
     } finally {
       conn.release();
     }
     ```
3. **Mandatory Audit Logging**:
   - Every mutation transaction **must** write a row to MySQL `audit_logs` before committing.
   - Action verbs must be uppercase strings matching `^[A-Z][A-Z0-9_]{2,59}$`.
   - Must supply an `idempotency_key` (e.g. `listing:<uuid>:<action>:<timestamp>`).
4. **Parameterized SQL Only**:
   - Dynamic query string concatenation, template literal interpolation in SQL, or raw unescaped input are strictly forbidden.
   - Every query must use `?` placeholders with parameter arrays.
5. **Database Migration Freeze**:
   - Existing migration scripts (`database/mysql/migrations/001_*.sql` through `004_*.sql`) are frozen.
   - Never alter past migration files. Any future schema alteration must be introduced as `005_*.sql`.
6. **Credential Security**:
   - Never commit `.env` or hardcode credentials in code.
   - All secrets (passwords, JWT secrets, storage credentials) are sourced from environment variables.
7. **Phone Number Canonicalization**:
   - Indian numbers must always be validated and stored in E.164 format: `+91XXXXXXXXXX` (10 digits following `+91`).
   - The backend utility must normalize whitespace, dashes, leading zeroes, and raw 10-digit inputs into the canonical format before hitting the database.

### 4.8 Deterministic Credibility Scoring Formula
Listings feature a deterministic heuristic credibility score (0–100) calculated by `credibility.service.js`:
1. **Base Score by Verification State**:
   - `verified` (via Field Partner audit): **95** (highest trust)
   - `verified` (via Direct Admin approval): **90** (document check only)
   - `in-review` (active inspection ongoing): **80**
   - `pending` (initial unreviewed submission): **70**
   - `flagged` (discrepancy detected or rejected): **15**
2. **Community Feedback Adjustment** (clamped to $[-5, +5]$):
   - If `rating_count > 0` and `rating_avg != null`:
     $$\text{Adjustment} = \text{round}((\text{rating\_avg} - 3.0) \times 2.0 + \min(\text{rating\_count}, 5) \times 0.5)$$
     bounded within $[-5, +5]$.
   - If `rating_count == 0`: 0.
3. **Final Clamping**:
   $$\text{Credibility Score} = \max(0, \min(100, \text{Base} + \text{Adjustment}))$$

---

## 5. Verification & Acceptance Criteria

When server implementation commences in subsequent phases, the backend will be verified against:
1. `npm run db:verify` in the `database/` folder passing with 0 errors.
2. Full adherence to the status transition state machine trigger without exceptions.
3. Accurate JSON output matching the shape expected by `RentifyContext.jsx`.
4. 100% parameterization of MySQL queries with complete audit logging coverage.
