USE homekeeper;

-- US9 7: cookies are credited only when the task is marked as done on or before its due date.
-- credited_cookies = cookies the assignee got for a DONE task (0 when late or TO DO);
-- a housemate's cookies are the sum of credited_cookies of their DONE tasks (US10).
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS credited_cookies INT NOT NULL DEFAULT 0 AFTER cookies;
