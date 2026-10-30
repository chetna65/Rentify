-- 005: customer saved listings (bookmarks/favorites)

CREATE TABLE saved_listings (
  user_id       CHAR(36)     NOT NULL,
  user_role     ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'customer',
  listing_id    CHAR(36)     NOT NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  is_synthetic  TINYINT(1)   NOT NULL DEFAULT 0,
  data_source   VARCHAR(40)  NOT NULL DEFAULT 'app',
  PRIMARY KEY (user_id, listing_id),
  KEY idx_saved_listing (listing_id, created_at),
  KEY idx_saved_user (user_id, user_role),
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id, user_role) REFERENCES users (id, role),
  CONSTRAINT fk_saved_listing FOREIGN KEY (listing_id) REFERENCES listings (id),
  CONSTRAINT chk_saved_role CHECK (user_role = 'customer'),
  CONSTRAINT chk_saved_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
