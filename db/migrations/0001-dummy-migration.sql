USE homekeeper;

CREATE TABLE IF NOT EXISTS dummyMigration (
                                         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                                         name VARCHAR(255) NOT NULL,
                                         PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;