-- 001: reference data + identity tables. MySQL is authoritative for users, roles and ownership.
-- Rows labelled is_synthetic=1 must have data_source starting with 'synthetic' (and vice versa).

CREATE TABLE cities (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       CHAR(3)     NOT NULL COMMENT 'Short code used in seal ids, e.g. NGP, PUN',
  name       VARCHAR(60) NOT NULL,
  state      VARCHAR(60) NOT NULL DEFAULT 'Maharashtra',
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cities_code (code),
  UNIQUE KEY uq_cities_name_state (name, state),
  CONSTRAINT chk_cities_code CHECK (code COLLATE utf8mb4_bin REGEXP '^[A-Z]{3}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id           CHAR(36)     NOT NULL COMMENT 'UUID (lowercase)',
  role         ENUM('customer','vendor','admin','partner') NOT NULL,
  full_name    VARCHAR(120) NOT NULL,
  phone        CHAR(13)     NOT NULL COMMENT 'E.164 Indian number: +91 followed by 10 digits',
  email        VARCHAR(190) NULL,
  designation  VARCHAR(120) NULL,
  city_id      SMALLINT UNSIGNED NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  is_synthetic TINYINT(1)   NOT NULL DEFAULT 0,
  data_source  VARCHAR(40)  NOT NULL DEFAULT 'app',
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_id_role (id, role),            -- target for role-pinned foreign keys
  KEY idx_users_role_city (role, city_id, is_active),
  CONSTRAINT fk_users_city FOREIGN KEY (city_id) REFERENCES cities (id),
  CONSTRAINT chk_users_id CHECK (id COLLATE utf8mb4_bin REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT chk_users_phone CHECK (phone REGEXP '^[+]91[0-9]{10}$'),
  CONSTRAINT chk_users_email CHECK (email IS NULL OR email LIKE '%_@_%.__%'),
  CONSTRAINT chk_users_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification-partner details. The (user_id, role) foreign key guarantees the user really has role 'partner'.
CREATE TABLE partner_profiles (
  user_id      CHAR(36)     NOT NULL,
  role         ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'partner',
  badge_number VARCHAR(20)  NOT NULL,
  zone         VARCHAR(160) NOT NULL,
  city_id      SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_partner_badge (badge_number),
  KEY idx_partner_city (city_id),
  CONSTRAINT fk_partner_user FOREIGN KEY (user_id, role) REFERENCES users (id, role),
  CONSTRAINT fk_partner_city FOREIGN KEY (city_id) REFERENCES cities (id),
  CONSTRAINT chk_partner_role CHECK (role = 'partner')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Schema only (no auth logic yet). Only a SHA-256 hash of the session token is ever stored.
CREATE TABLE sessions (
  id           CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  token_hash   CHAR(64)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at   DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NULL,
  revoked_at   DATETIME(3) NULL,
  ip_address   VARCHAR(45) NULL,
  user_agent   VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id, expires_at),
  KEY idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_sessions_hash CHECK (token_hash REGEXP '^[0-9a-f]{64}$'),
  CONSTRAINT chk_sessions_expiry CHECK (expires_at > created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
