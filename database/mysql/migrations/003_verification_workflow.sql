-- 003: ownership documents (metadata only), partner assignments and field audits.

-- Metadata only. File bytes live in private storage (never a public path); storage_key is a relative key,
-- never a URL. Full document numbers are NOT stored here: only the last 4 characters.
CREATE TABLE listing_documents (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id         CHAR(36)     NOT NULL,
  doc_type           VARCHAR(80)  NOT NULL,
  doc_number_last4   VARCHAR(4)   NULL,
  review_status      ENUM('submitted','admin_checked','accepted','rejected','suspended') NOT NULL DEFAULT 'submitted',
  review_note        VARCHAR(1000) NULL COMMENT 'Manual reviewer note. No automated registry/UIDAI check is implemented.',
  reviewed_by        CHAR(36)     NULL,
  reviewed_at        DATETIME(3)  NULL,
  storage_key        VARCHAR(255) NULL,
  file_sha256        CHAR(64)     NULL,
  mime_type          VARCHAR(100) NULL,
  size_bytes         INT UNSIGNED NULL,
  uploaded_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  is_synthetic       TINYINT(1)   NOT NULL DEFAULT 0,
  data_source        VARCHAR(40)  NOT NULL DEFAULT 'app',
  PRIMARY KEY (id),
  KEY idx_docs_listing (listing_id, doc_type),
  KEY idx_docs_review (review_status, uploaded_at),
  KEY idx_docs_reviewer (reviewed_by),
  UNIQUE KEY uq_docs_storage_key (storage_key),
  CONSTRAINT fk_docs_listing FOREIGN KEY (listing_id) REFERENCES listings (id),
  CONSTRAINT fk_docs_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT chk_docs_last4 CHECK (doc_number_last4 IS NULL OR doc_number_last4 REGEXP '^[A-Za-z0-9]{1,4}$'),
  CONSTRAINT chk_docs_file CHECK (
    (storage_key IS NULL AND file_sha256 IS NULL AND mime_type IS NULL AND size_bytes IS NULL)
    OR (storage_key IS NOT NULL AND file_sha256 IS NOT NULL AND mime_type IS NOT NULL AND size_bytes IS NOT NULL AND size_bytes > 0)),
  CONSTRAINT chk_docs_storage_key CHECK (storage_key IS NULL OR storage_key NOT REGEXP '^(https?:|/)|[.][.]'),
  CONSTRAINT chk_docs_sha CHECK (file_sha256 IS NULL OR file_sha256 REGEXP '^[0-9a-f]{64}$'),
  CONSTRAINT chk_docs_review CHECK (
    (review_status = 'submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (review_status <> 'submitted' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT chk_docs_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE partner_assignments (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id     CHAR(36)     NOT NULL,
  partner_id     CHAR(36)     NOT NULL,
  partner_role   ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'partner',
  assigned_by    CHAR(36)     NOT NULL,
  assigner_role  ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'admin',
  status         ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  scheduled_for  DATE         NULL,
  admin_notes    VARCHAR(1000) NULL,
  assigned_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at   DATETIME(3)  NULL,
  is_synthetic   TINYINT(1)   NOT NULL DEFAULT 0,
  data_source    VARCHAR(40)  NOT NULL DEFAULT 'app',
  -- NULL unless active, so the UNIQUE index below allows only ONE active assignment per listing.
  active_listing_id CHAR(36) GENERATED ALWAYS AS (IF(status = 'active', listing_id, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_one_active (active_listing_id),
  UNIQUE KEY uq_assignment_triplet (id, listing_id, partner_id),   -- target for field_audits
  KEY idx_assignment_partner (partner_id, status),
  KEY idx_assignment_listing (listing_id, status),
  KEY idx_assignment_assigner (assigned_by, assigner_role),
  CONSTRAINT fk_assignment_listing FOREIGN KEY (listing_id) REFERENCES listings (id),
  CONSTRAINT fk_assignment_partner FOREIGN KEY (partner_id, partner_role) REFERENCES users (id, role),
  CONSTRAINT fk_assignment_assigner FOREIGN KEY (assigned_by, assigner_role) REFERENCES users (id, role),
  CONSTRAINT chk_assignment_roles CHECK (partner_role = 'partner' AND assigner_role = 'admin'),
  CONSTRAINT chk_assignment_completed CHECK ((status = 'completed') = (completed_at IS NOT NULL) OR status = 'cancelled'),
  CONSTRAINT chk_assignment_dates CHECK (completed_at IS NULL OR completed_at >= assigned_at),
  CONSTRAINT chk_assignment_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE field_audits (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignment_id           BIGINT UNSIGNED NOT NULL,
  listing_id              CHAR(36)     NOT NULL,
  partner_id              CHAR(36)     NOT NULL,
  outcome                 ENUM('verified','flagged') NOT NULL,
  inspected_on            DATE         NOT NULL,
  gps_lat                 DECIMAL(9,6) NULL,
  gps_lng                 DECIMAL(9,6) NULL,
  gps_verified            TINYINT(1)   NOT NULL DEFAULT 0,
  physical_keys_verified  TINYINT(1)   NULL,
  owner_met_in_person     TINYINT(1)   NULL,
  unit_vacant_available   TINYINT(1)   NULL,
  discrepancy_found       TINYINT(1)   NOT NULL DEFAULT 0,
  notes                   TEXT         NOT NULL,
  created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  is_synthetic            TINYINT(1)   NOT NULL DEFAULT 0,
  data_source             VARCHAR(40)  NOT NULL DEFAULT 'app',
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_assignment (assignment_id),
  KEY idx_audit_listing (listing_id, inspected_on),
  KEY idx_audit_partner (partner_id, inspected_on),
  -- listing and partner must be the ones on the assignment
  CONSTRAINT fk_audit_assignment FOREIGN KEY (assignment_id, listing_id, partner_id)
    REFERENCES partner_assignments (id, listing_id, partner_id),
  CONSTRAINT chk_audit_gps CHECK ((gps_lat IS NULL AND gps_lng IS NULL)
    OR (gps_lat BETWEEN 6 AND 38 AND gps_lng BETWEEN 68 AND 98)),
  CONSTRAINT chk_audit_outcome CHECK ((outcome = 'flagged' AND discrepancy_found = 1) OR (outcome = 'verified' AND discrepancy_found = 0)),
  CONSTRAINT chk_audit_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
