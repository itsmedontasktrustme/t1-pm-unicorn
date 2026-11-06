USE homekeeper;

DROP TEMPORARY TABLE IF EXISTS test_result;
CREATE TEMPORARY TABLE test_result (
  nr INT AUTO_INCREMENT PRIMARY KEY,
  test VARCHAR(120),
  expected VARCHAR(10),
  result VARCHAR(4)
) ENGINE=MEMORY;  -- not transactional: results survive the ROLLBACK below

DROP PROCEDURE IF EXISTS run_test;
DELIMITER //
CREATE PROCEDURE run_test(IN p_test VARCHAR(120), IN p_expected VARCHAR(10), IN p_sql TEXT)
BEGIN
  DECLARE failed BOOLEAN DEFAULT FALSE;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET failed = TRUE;
  SET @stmt = p_sql;
  PREPARE s FROM @stmt;
  EXECUTE s;
  DEALLOCATE PREPARE s;
  INSERT INTO test_result (test, expected, result)
  VALUES (p_test, p_expected,
          IF((p_expected = 'error') = failed, 'PASS', 'FAIL'));
END //
DELIMITER ;

START TRANSACTION;

-- Test data -----------------------------------------------------------
INSERT INTO resident (id, auth_user_id, email, name) VALUES
  (1, 'user_louis', 'louis@example.com', 'Louis'),
  (2, 'user_marie', 'marie@example.com', 'Marie Antoinette'),
  (3, 'user_bonnie', 'bonnie@example.com', 'Bonnie'),
  (4, 'user_pankrac', 'pankrac@example.com', 'Pankrác');
INSERT INTO household (id, name, created_by) VALUES
  (1, 'Louis family', 1),
  (2, 'Student flat', 4);
INSERT INTO housemate (household_id, resident_id, is_owner, is_manager) VALUES
  (1, 1, TRUE, TRUE), (1, 2, FALSE, TRUE), (1, 3, FALSE, FALSE),
  (2, 4, TRUE, TRUE);

-- Residents (US0) -----------------------------------------------------
CALL run_test('US0  Email cannot be used by two residents', 'error',
  "INSERT INTO resident (auth_user_id, email, name) VALUES ('user_x', 'louis@example.com', 'X')");

-- Households (US1) ----------------------------------------------------
CALL run_test('US1  Czech name with 20 characters is accepted', 'ok',
  "INSERT INTO household (name, created_by) VALUES ('Žluťoučký kůň domov1', 1)");
CALL run_test('US1  Name longer than 20 characters is rejected', 'error',
  "INSERT INTO household (name, created_by) VALUES ('Žluťoučký kůň domov12', 1)");
CALL run_test('US1  Name with only spaces is rejected', 'error',
  "INSERT INTO household (name, created_by) VALUES ('   ', 1)");

-- Roles (US3, US4) ----------------------------------------------------
CALL run_test('US3  Resident can be a housemate in two households', 'ok',
  "INSERT INTO housemate (household_id, resident_id) VALUES (2, 3)");
CALL run_test('US3  Resident cannot join the same household twice', 'error',
  "INSERT INTO housemate (household_id, resident_id) VALUES (1, 3)");
CALL run_test('US4  Second owner in a household is rejected', 'error',
  "UPDATE housemate SET is_owner = TRUE, is_manager = TRUE WHERE household_id = 1 AND resident_id = 2");
CALL run_test('US4  Owner cannot lose the manager role', 'error',
  "UPDATE housemate SET is_manager = FALSE WHERE household_id = 1 AND resident_id = 1");
CALL run_test('US4  Handover step 1: old owner gives up ownership', 'ok',
  "UPDATE housemate SET is_owner = FALSE WHERE household_id = 1 AND resident_id = 1");
CALL run_test('US4  Handover step 2: new owner takes ownership', 'ok',
  "UPDATE housemate SET is_owner = TRUE, is_manager = TRUE WHERE household_id = 1 AND resident_id = 2");

-- Tasks (US5 - US9) ---------------------------------------------------
CALL run_test('US5  Task with only a name is accepted (Available)', 'ok',
  "INSERT INTO task (id, household_id, name, created_by) VALUES (1, 1, 'Wash the dishes', 2)");
CALL run_test('US5  Task without a name is rejected', 'error',
  "INSERT INTO task (household_id, name, created_by) VALUES (1, '  ', 2)");
CALL run_test('US5  Negative cookies are rejected', 'error',
  "INSERT INTO task (household_id, name, cookies, created_by) VALUES (1, 'Trash', -5, 2)");
CALL run_test('US5  Unknown status is rejected', 'error',
  "INSERT INTO task (household_id, name, status, created_by) VALUES (1, 'Trash', 'Todo', 2)");
CALL run_test('US5  Available task with an assignee is rejected', 'error',
  "INSERT INTO task (household_id, name, status, assignee_resident_id, created_by) VALUES (1, 'Trash', 'Available', 3, 2)");
CALL run_test('US5  Assigned task without an assignee is rejected', 'error',
  "INSERT INTO task (household_id, name, status, created_by) VALUES (1, 'Trash', 'Assigned', 2)");
CALL run_test('US7  Assigning to a housemate of the same household works', 'ok',
  "UPDATE task SET status = 'Assigned', assignee_resident_id = 3 WHERE id = 1");
CALL run_test('US7  Assigning to someone from another household is rejected', 'error',
  "UPDATE task SET assignee_resident_id = 4 WHERE id = 1");
CALL run_test('US9  Done without completed_at / completed_by is rejected', 'error',
  "UPDATE task SET status = 'Done' WHERE id = 1");
CALL run_test('US9  Done with completed_at and completed_by works', 'ok',
  "UPDATE task SET status = 'Done', completed_at = NOW(), completed_by = 3 WHERE id = 1");
CALL run_test('Q&A 14  Done without an assignee is allowed', 'ok',
  "INSERT INTO task (household_id, name, status, completed_at, completed_by, created_by) VALUES (1, 'Plants', 'Done', NOW(), 2, 2)");

-- Invitations (US2) ---------------------------------------------------
CALL run_test('US2  Invitation gets an expiry date automatically', 'ok',
  "INSERT INTO invitation (household_id, code, created_by) VALUES (1, 'FAM-7K2Q9X', 2)");
CALL run_test('US2  Invitation code must be unique', 'error',
  "INSERT INTO invitation (household_id, code, created_by) VALUES (2, 'FAM-7K2Q9X', 4)");

-- History -------------------------------------------------------------
CALL run_test('LOG  Existing history API insert still works', 'ok',
  "INSERT INTO history (component, user_id, action) VALUES ('TaskBoardPage', 'user_louis', 'page_load')");

ROLLBACK;

-- Results -------------------------------------------------------------
SELECT nr, test, expected, result FROM test_result ORDER BY nr;
SELECT CONCAT(SUM(result = 'PASS'), ' of ', COUNT(*), ' tests passed') AS summary FROM test_result;

DROP PROCEDURE run_test;
