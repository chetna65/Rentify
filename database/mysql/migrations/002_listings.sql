-- 002: core listings. listings.id is the shared property UUID = _id of the MongoDB property_details document.
-- MySQL owns: identity, owner, city, price, type and verification status.
-- MongoDB owns: description, amenities, images, safety notes, free-form attributes.

CREATE TABLE listings (
  id                CHAR(36)     NOT NULL COMMENT 'Shared property UUID (lowercase); MongoDB property_details._id',
  legacy_ref        VARCHAR(40)  NULL COMMENT 'Prototype id such as prop-ngp-01 (seed data only)',
  owner_id          CHAR(36)     NOT NULL,
  owner_role        ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'vendor',
  city_id           SMALLINT UNSIGNED NOT NULL,
  locality          VARCHAR(160) NOT NULL,
  title             VARCHAR(200) NOT NULL,
  property_type     ENUM('1RK','1BHK','2BHK','3BHK','4BHK') NOT NULL,
  rent_inr          INT UNSIGNED NOT NULL,
  deposit_inr       INT UNSIGNED NOT NULL,
  furnishing        ENUM('Unfurnished','Semi-Furnished','Fully Furnished') NOT NULL,
  carpet_area_sqft  SMALLINT UNSIGNED NULL,
  floor_label       VARCHAR(100) NULL,
  owner_capacity    VARCHAR(80)  NULL COMMENT 'Prototype ownerRole text, e.g. Independent Owner',
  status            ENUM('pending','in-review','verified','flagged') NOT NULL DEFAULT 'pending',
  seal_id           VARCHAR(32)  NULL,
  submitted_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  verified_at       DATETIME(3)  NULL,
  verified_by       CHAR(36)     NULL,
  flagged_at        DATETIME(3)  NULL,
  flagged_by        CHAR(36)     NULL,
  flag_category     VARCHAR(120) NULL,
  flag_reason       TEXT         NULL,
  credibility_score TINYINT UNSIGNED NULL COMMENT 'Prototype heuristic 0-100; not machine-learned',
  rating_avg        DECIMAL(3,2) NULL COMMENT 'Denormalised from feedback; maintained transactionally by the app',
  rating_count      INT UNSIGNED NOT NULL DEFAULT 0,
  version           INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Optimistic-concurrency counter',
  is_synthetic      TINYINT(1)   NOT NULL DEFAULT 0,
  data_source       VARCHAR(40)  NOT NULL DEFAULT 'app',
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_listings_legacy_ref (legacy_ref),
  UNIQUE KEY uq_listings_seal (seal_id),
  KEY idx_listings_search (city_id, status, property_type, rent_inr),
  KEY idx_listings_locality (city_id, locality),
  KEY idx_listings_queue (status, submitted_at),
  KEY idx_listings_owner (owner_id, status),
  KEY idx_listings_verified_by (verified_by),
  KEY idx_listings_flagged_by (flagged_by),
  FULLTEXT KEY ft_listings_text (title, locality),
  CONSTRAINT fk_listings_owner FOREIGN KEY (owner_id, owner_role) REFERENCES users (id, role),
  CONSTRAINT fk_listings_city FOREIGN KEY (city_id) REFERENCES cities (id),
  CONSTRAINT fk_listings_verified_by FOREIGN KEY (verified_by) REFERENCES users (id),
  CONSTRAINT fk_listings_flagged_by FOREIGN KEY (flagged_by) REFERENCES users (id),
  CONSTRAINT chk_listings_id CHECK (id COLLATE utf8mb4_bin REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT chk_listings_owner_role CHECK (owner_role = 'vendor'),
  CONSTRAINT chk_listings_rent CHECK (rent_inr > 0),
  CONSTRAINT chk_listings_area CHECK (carpet_area_sqft IS NULL OR carpet_area_sqft > 0),
  CONSTRAINT chk_listings_credibility CHECK (credibility_score IS NULL OR credibility_score <= 100),
  CONSTRAINT chk_listings_rating CHECK ((rating_count = 0 AND rating_avg IS NULL) OR (rating_count > 0 AND rating_avg BETWEEN 1 AND 5)),
  CONSTRAINT chk_listings_verified CHECK (status <> 'verified' OR (seal_id IS NOT NULL AND verified_at IS NOT NULL AND verified_by IS NOT NULL)),
  CONSTRAINT chk_listings_flagged CHECK (status <> 'flagged' OR (flag_reason IS NOT NULL AND flagged_at IS NOT NULL AND flagged_by IS NOT NULL)),
  CONSTRAINT chk_listings_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Workflow guard: pending -> in-review | verified | flagged; in-review -> verified | flagged;
-- verified -> flagged (revocation); flagged -> pending (resubmission after admin action). Nothing else.
CREATE TRIGGER trg_listings_guard_update BEFORE UPDATE ON listings FOR EACH ROW
BEGIN
  IF NEW.id <> OLD.id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'listings.id (shared property UUID) is immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'pending'   AND NEW.status IN ('in-review','verified','flagged'))
    OR (OLD.status = 'in-review' AND NEW.status IN ('verified','flagged'))
    OR (OLD.status = 'verified'  AND NEW.status = 'flagged')
    OR (OLD.status = 'flagged'   AND NEW.status = 'pending')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid listing status transition';
  END IF;
END;
