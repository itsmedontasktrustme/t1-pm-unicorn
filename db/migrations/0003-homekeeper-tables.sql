USE homekeeper;

-- Homekeeper domain tables (residents, households, housemates, roles, invitations, tasks).
-- Based on the schema of the create-db-tables branch, updated to the user stories of 20.11.:
--   * invitations are one code per household (US2/US3), joining makes the resident an Invitee
--     until the owner accepts them;
--   * tasks are TO DO / DONE with a responsible manager, cookies 1–100 (US5–US9).
-- Migrations run on every start of the db container, so every statement is idempotent.
-- The activity log of the frontend (table `history`, component/action) is not changed.

-- Resident = signed-in Google user (Clerk). Created on the first sign-in (US0).
ALTER TABLE resident
  ADD COLUMN IF NOT EXISTS auth_user_id VARCHAR(64) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL AFTER name;
CREATE UNIQUE INDEX IF NOT EXISTS resident_auth_user ON resident (auth_user_id);

-- Household name max 20, description max 255 characters (US1) — checked by the backend.
ALTER TABLE household
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL AFTER name;

-- Membership of a resident in a household. "invitee" = joined with a code, waiting for the owner.
CREATE TABLE IF NOT EXISTS housemate (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  resident_id BIGINT UNSIGNED NOT NULL,
  status ENUM('invitee', 'member') NOT NULL DEFAULT 'member',
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY housemate_household_resident (household_id, resident_id),
  KEY housemate_resident (resident_id),
  CONSTRAINT fk_housemate_household FOREIGN KEY (household_id) REFERENCES household (id) ON DELETE CASCADE,
  CONSTRAINT fk_housemate_resident FOREIGN KEY (resident_id) REFERENCES resident (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Extra roles of a housemate (US4). Every housemate is a "housemate"; owner/manager are added here.
CREATE TABLE IF NOT EXISTS housemate_role (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  housemate_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner', 'manager') NOT NULL,
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY housemate_role_unique (housemate_id, role),
  CONSTRAINT fk_housemate_role_housemate FOREIGN KEY (housemate_id) REFERENCES housemate (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One invitation code per household (US2): a new code replaces the old one, valid 1–14 days.
CREATE TABLE IF NOT EXISTS invitation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(16) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  expiration_dt DATETIME NOT NULL,
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY invitation_household (household_id),
  UNIQUE KEY invitation_code (code),
  CONSTRAINT fk_invitation_household FOREIGN KEY (household_id) REFERENCES household (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitation_created_by FOREIGN KEY (created_by) REFERENCES resident (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tasks (US5–US9). Dates are stored in UTC.
-- manager_id = responsible manager; assignee_id NULL = available; completed_* filled when DONE.
-- Cookies of a resident = sum of cookies of their DONE tasks (US10, BR-CK-05).
CREATE TABLE IF NOT EXISTS task (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(2000) NULL,
  due_dt DATETIME NULL,
  cookies INT NOT NULL DEFAULT 1,
  status ENUM('todo', 'done') NOT NULL DEFAULT 'todo',
  assignee_id BIGINT UNSIGNED NULL,
  manager_id BIGINT UNSIGNED NULL,
  completed_dt DATETIME NULL,
  completed_by BIGINT UNSIGNED NULL,
  create_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY task_household_status (household_id, status),
  KEY task_assignee (assignee_id),
  KEY task_manager (manager_id),
  CONSTRAINT task_cookies_range CHECK (cookies BETWEEN 1 AND 100),
  CONSTRAINT fk_task_household FOREIGN KEY (household_id) REFERENCES household (id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES resident (id) ON DELETE SET NULL,
  CONSTRAINT fk_task_manager FOREIGN KEY (manager_id) REFERENCES resident (id) ON DELETE SET NULL,
  CONSTRAINT fk_task_completed_by FOREIGN KEY (completed_by) REFERENCES resident (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
