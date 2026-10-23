-- DEPRECATED - superseded by migrate_attendance_final.sql.
--
-- This file used to add `term` and a 6-column UNIQUE constraint. It is now part
-- of migrate_attendance_final.sql, which also removes any lingering 3-column or
-- 5-column constraints (regardless of their name) before creating the final one.
--
-- Run migrate_attendance_final.sql instead; this file is kept only so existing
-- instructions do not break.
SELECT 'Deprecated: run migrate_attendance_final.sql instead.' AS notice;
