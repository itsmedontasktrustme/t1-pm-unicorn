USE homekeeper;

-- ---------------------------------------------------------------------
-- RESIDENT (existing table, extended) - HK-162, HK-164 - US0
-- ---------------------------------------------------------------------
ALTER TABLE resident
  ADD COLUMN auth_user_id VARCHAR(64) NOT NULL AFTER id,                -- Clerk user ID, same value as history.user_id
  ADD COLUMN email VARCHAR(254) NOT NULL AFTER auth_user_id,
  ADD UNIQUE KEY uq_resident_auth_user_id (auth_user_id),
  ADD UNIQUE KEY uq_resident_email (email);                             -- US0: email cannot be reused

-- ---------------------------------------------------------------------
-- HOUSEHOLD (existing table, extended) - HK-166, HK-168 - US1
-- ---------------------------------------------------------------------
ALTER TABLE household
  MODIFY COLUMN name VARCHAR(20) NOT NULL,                              -- Q&A 11: max 20 (to be confirmed)
  ADD COLUMN created_by BIGINT UNSIGNED NOT NULL AFTER label,           -- creator, not the current owner
  ADD KEY idx_household_created_by (created_by),
  ADD CONSTRAINT fk_household_created_by FOREIGN KEY (created_by) REFERENCES resident (id),
  ADD CONSTRAINT chk_household_name CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 1 AND 20);   -- BR-HH-10, BR-HH-11

-- ---------------------------------------------------------------------
-- HOUSEMATE (new) - HK-170, HK-172 - US1, US3, US4
-- Membership of a resident in a household + owner/manager roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS housemate (
  household_id BIGINT UNSIGNED NOT NULL,
  resident_id BIGINT UNSIGNED NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  is_manager BOOLEAN NOT NULL DEFAULT FALSE,
  owner_household_id BIGINT UNSIGNED AS (IF(is_owner, household_id, NULL)) STORED,   -- household_id for the owner, NULL for others
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,              -- date the resident joined
  update_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (household_id, resident_id),                             -- BR-HH-21: once per household
  UNIQUE KEY uq_one_owner_per_household (owner_household_id),          -- BR-HH-30: max one owner per household
  KEY idx_housemate_resident (resident_id),                            -- US10: "my households"
  CONSTRAINT fk_housemate_household FOREIGN KEY (household_id) REFERENCES household (id),
  CONSTRAINT fk_housemate_resident FOREIGN KEY (resident_id) REFERENCES resident (id),
  CONSTRAINT chk_owner_is_manager CHECK (NOT is_owner OR is_manager)   -- BR-HH-31: owner is always a manager
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- TASK (new) - HK-174, HK-176 - US5 - US9
-- Cookies are not stored per resident; totals are calculated (Q&A 18)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,                                          -- only mandatory field (US5, Q&A 12)
  description TEXT NULL,
  due_date DATE NULL,
  cookies INT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Available',
  assignee_resident_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,                            -- US9, US10: completion date
  completed_by BIGINT UNSIGNED NULL,                                   -- US9, US10: who marked it done
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_task_household_status (household_id, status),                -- task list per household
  KEY idx_task_assignee (household_id, assignee_resident_id),
  KEY idx_task_created_by (created_by),
  KEY idx_task_completed_by (completed_by),
  CONSTRAINT fk_task_household FOREIGN KEY (household_id) REFERENCES household (id),
  CONSTRAINT fk_task_assignee FOREIGN KEY (household_id, assignee_resident_id) REFERENCES housemate (household_id, resident_id),   -- BR-HH-41: assignee from the same household
  CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES resident (id),
  CONSTRAINT fk_task_completed_by FOREIGN KEY (completed_by) REFERENCES resident (id),
  CONSTRAINT chk_task_name CHECK (CHAR_LENGTH(TRIM(name)) >= 1),       -- US5: name is mandatory
  CONSTRAINT chk_task_cookies CHECK (cookies IS NULL OR cookies >= 0),
  CONSTRAINT chk_task_status CHECK (status IN ('Available', 'Assigned', 'Done')),
  CONSTRAINT chk_task_assignee CHECK (                                 -- US5, US7, US8; Q&A 14: Done without assignee allowed
    (status = 'Available' AND assignee_resident_id IS NULL) OR
    (status = 'Assigned' AND assignee_resident_id IS NOT NULL) OR
    (status = 'Done')
  ),
  CONSTRAINT chk_task_completion CHECK (                               -- US9: Done always has completed_at and completed_by
    (status = 'Done' AND completed_at IS NOT NULL AND completed_by IS NOT NULL) OR
    (status <> 'Done' AND completed_at IS NULL AND completed_by IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- INVITATION - US2, US3
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(32) NOT NULL,                                           -- used in the link or typed as a code
  created_by BIGINT UNSIGNED NOT NULL,                                 -- must be the owner (checked in the backend, BR-INV-01)
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),   -- BR-INV-03: valid 7 days
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitation_code (code),                                -- BR-INV-02: unique invitation
  KEY idx_invitation_household (household_id),
  KEY idx_invitation_created_by (created_by),
  CONSTRAINT fk_invitation_household FOREIGN KEY (household_id) REFERENCES household (id),
  CONSTRAINT fk_invitation_created_by FOREIGN KEY (created_by) REFERENCES resident (id),
  CONSTRAINT chk_invitation_expiry CHECK (expires_at > create_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- HISTORY (existing table, extended) - HK-178, HK-180
-- Used as the Log table (DM-3, to be confirmed). New columns are optional,
-- so the existing history API keeps working unchanged.
-- ---------------------------------------------------------------------
ALTER TABLE history
  ADD COLUMN household_id BIGINT UNSIGNED NULL AFTER action,
  ADD COLUMN entity_id BIGINT UNSIGNED NULL AFTER household_id,        -- ID of the affected task/housemate
  ADD KEY idx_history_household (household_id, create_dt),
  ADD CONSTRAINT fk_history_household FOREIGN KEY (household_id) REFERENCES household (id);