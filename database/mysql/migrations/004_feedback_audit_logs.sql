-- 004: customer feedback and the append-only audit log.

CREATE TABLE feedback (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id    CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  user_role     ENUM('customer','vendor','admin','partner') NOT NULL DEFAULT 'customer',
  rating        TINYINT UNSIGNED NOT NULL,
  comment       VARCHAR(1000) NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  is_synthetic  TINYINT(1)   NOT NULL DEFAULT 0,
  data_source   VARCHAR(40)  NOT NULL DEFAULT 'app',
  PRIMARY KEY (id),
  UNIQUE KEY uq_feedback_one_per_user (listing_id, user_id),
  KEY idx_feedback_listing (listing_id, created_at),
  KEY idx_feedback_user (user_id, user_role),
  CONSTRAINT fk_feedback_listing FOREIGN KEY (listing_id) REFERENCES listings (id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id, user_role) REFERENCES users (id, role),
  CONSTRAINT chk_feedback_role CHECK (user_role = 'customer'),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_feedback_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only: triggers reject UPDATE and DELETE. actor_label is kept so history stays readable.
CREATE TABLE audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  listing_id      CHAR(36)     NULL,
  actor_user_id   CHAR(36)     NULL,
  actor_label     VARCHAR(160) NOT NULL,
  action          VARCHAR(60)  NOT NULL,
  detail          TEXT         NULL,
  metadata        JSON         NULL,
  idempotency_key VARCHAR(120) NULL,
  is_synthetic    TINYINT(1)   NOT NULL DEFAULT 0,
  data_source     VARCHAR(40)  NOT NULL DEFAULT 'app',
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_idempotency (idempotency_key),
  KEY idx_auditlog_listing (listing_id, occurred_at),
  KEY idx_auditlog_actor (actor_user_id, occurred_at),
  KEY idx_auditlog_action (action, occurred_at),
  CONSTRAINT fk_auditlog_listing FOREIGN KEY (listing_id) REFERENCES listings (id),
  CONSTRAINT fk_auditlog_actor FOREIGN KEY (actor_user_id) REFERENCES users (id),
  CONSTRAINT chk_auditlog_action CHECK (action REGEXP '^[A-Z][A-Z0-9_]{2,59}$'),
  CONSTRAINT chk_auditlog_synthetic CHECK ((is_synthetic = 1 AND data_source LIKE 'synthetic%') OR (is_synthetic = 0 AND data_source NOT LIKE 'synthetic%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';

CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
