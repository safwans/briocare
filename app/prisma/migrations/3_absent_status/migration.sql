-- Adds ABSENT to EngagementStatus.
-- Enrolled-but-never-joined is now written as an explicit zero-participation metric instead of
-- producing no row at all, which left the caseload showing the member's previous session numbers.
ALTER TABLE `EngagementMetric`
  MODIFY `status` ENUM('ESTABLISHING','CHECK_IN','WORTH_A_LOOK','WATCH','STABLE','IMPROVING','ABSENT') NOT NULL;
