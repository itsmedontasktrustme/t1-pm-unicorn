USE homekeeper;

-- Sign-in / sign-out log (Google sign-in through Clerk). One row per session and event.
CREATE TABLE IF NOT EXISTS auth_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  event VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY auth_log_session_event (session_id, event),
  KEY auth_log_user (user_id, create_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
