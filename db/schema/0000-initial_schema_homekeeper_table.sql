CREATE TABLE `resident` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `auth_user_id` varchar(64) UNIQUE NOT NULL,
  `name` varchar(255) NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `household` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `description` varchar(255),
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `housemate` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `household_id` bigint NOT NULL,
  `resident_id` bigint NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `housemate_role` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `housemate_id` bigint NOT NULL,
  `role` ENUM ('owner', 'manager') NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `task` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `household_id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(2000),
  `due_date` timestamp,
  `cookies` integer,
  `status` ENUM ('pending', 'in progress', 'done') NOT NULL,
  `assignee_id` bigint,
  `manager_id` bigint NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `invitation` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `household_id` bigint NOT NULL,
  `resident_id` bigint NOT NULL,
  `expiration_dt` timestamp NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now()),
  `update_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `history` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `entity` ENUM ('household', 'resident', 'housemate', 'task', 'invitation') NOT NULL,
  `entity_id` bigint NOT NULL,
  `resident_id` bigint NOT NULL,
  `household_id` bigint,
  `operation` ENUM ('create', 'update', 'delete') NOT NULL,
  `action` varchar(255) NOT NULL,
  `create_dt` timestamp NOT NULL DEFAULT (now())
);

CREATE UNIQUE INDEX `housemate_index_0` ON `housemate` (`household_id`, `resident_id`);

CREATE INDEX `housemate_index_1` ON `housemate` (`resident_id`);

CREATE INDEX `housemate_role_index_2` ON `housemate_role` (`housemate_id`);

CREATE INDEX `task_index_3` ON `task` (`household_id`);

CREATE INDEX `task_index_4` ON `task` (`assignee_id`);

CREATE INDEX `task_index_5` ON `task` (`manager_id`);

CREATE INDEX `invitation_index_6` ON `invitation` (`household_id`);

CREATE INDEX `invitation_index_7` ON `invitation` (`resident_id`);

CREATE INDEX `history_index_8` ON `history` (`resident_id`);

CREATE INDEX `history_index_9` ON `history` (`household_id`);

ALTER TABLE `housemate` ADD FOREIGN KEY (`household_id`) REFERENCES `household` (`id`);

ALTER TABLE `housemate` ADD FOREIGN KEY (`resident_id`) REFERENCES `resident` (`id`);

ALTER TABLE `task` ADD FOREIGN KEY (`household_id`) REFERENCES `household` (`id`);

ALTER TABLE `task` ADD CONSTRAINT `fk_task_assignee` FOREIGN KEY (`household_id`, `assignee_id`) REFERENCES `housemate` (`household_id`, `resident_id`);

ALTER TABLE `task` ADD CONSTRAINT `fk_task_manager` FOREIGN KEY (`household_id`, `manager_id`) REFERENCES `housemate` (`household_id`, `resident_id`);

ALTER TABLE `invitation` ADD FOREIGN KEY (`household_id`) REFERENCES `household` (`id`);

ALTER TABLE `invitation` ADD FOREIGN KEY (`resident_id`) REFERENCES `resident` (`id`);

ALTER TABLE `history` ADD FOREIGN KEY (`resident_id`) REFERENCES `resident` (`id`);

ALTER TABLE `history` ADD FOREIGN KEY (`household_id`) REFERENCES `household` (`id`);

ALTER TABLE `housemate_role` ADD FOREIGN KEY (`housemate_id`) REFERENCES `housemate` (`id`);

-- Disable foreign key checks for INSERT
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `resident` (`id`, `auth_user_id`, `name`, `create_dt`, `update_dt`)
VALUES
  (2001, 'user_2abc123', 'Franta Jetel', NULL, NULL),
  (2002, 'user_3def456', 'Václav Trachta', NULL, NULL);
INSERT INTO `household` (`id`, `name`, `description`, `create_dt`, `update_dt`)
VALUES
  (1001, 'Pařezová chaloupka', 'Chaloupka v mechu a kapradí', NULL, NULL);
INSERT INTO `housemate` (`id`, `household_id`, `resident_id`, `create_dt`, `update_dt`)
VALUES
  (3001, 1001, 2001, NULL, NULL),
  (3002, 1001, 2002, NULL, NULL);
INSERT INTO `housemate_role` (`id`, `housemate_id`, `role`, `create_dt`, `update_dt`)
VALUES
  (4001, 3001, 'owner', NULL, NULL),
  (4002, 3001, 'manager', NULL, NULL);
INSERT INTO `task` (`id`, `household_id`, `name`, `description`, `due_date`, `cookies`, `status`, `assignee_id`, `manager_id`, `create_dt`, `update_dt`)
VALUES
  (5001, 1001, 'Vynést odpadky', 'Vynést tříděný odpad', '2027-11-10', 666, 'pending', 2002, 2001, NULL, NULL);
INSERT INTO `invitation` (`id`, `household_id`, `resident_id`, `expiration_dt`, `create_dt`, `update_dt`)
VALUES
  (6001, 1001, 2002, '2027-11-10', NULL, NULL);
INSERT INTO `history` (`id`, `entity`, `entity_id`, `resident_id`, `household_id`, `operation`, `action`, `create_dt`)
VALUES
  (7001, 'resident', 2001, 2001, NULL, 'create', 'Created resident Franta Jetel', NULL),
  (7002, 'resident', 2002, 2002, NULL, 'create', 'Created resident Václav Trachta', NULL),
  (7003, 'household', 1001, 2001, 1001, 'create', 'Created household Pařezová chaloupka by resident Franta Jetel', NULL),
  (7004, 'housemate', 3001, 2001, 1001, 'create', 'Created housemate Franta Jetel in household Pařezová chaloupka', NULL),
  (7005, 'housemate', 4001, 2001, 1001, 'create', 'Created role owner for housemate Franta Jetel in household Pařezová chaloupka', NULL),
  (7006, 'housemate', 4002, 2001, 1001, 'create', 'Created role manager for housemate Franta Jetel in household Pařezová chaloupka', NULL),
  (7007, 'invitation', 6001, 2001, 1001, 'create', 'Created invitation for resident Václav Trachta to household Pařezová chaloupka', NULL),
  (7008, 'housemate', 3002, 2002, 1001, 'create', 'Created housemate Václav Trachta in household Pařezová chaloupka', NULL),
  (7009, 'task', 5001, 2001, 1001, 'create', 'Created task Vynést odpadky', NULL);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;