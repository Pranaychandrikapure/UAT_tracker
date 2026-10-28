-- =============================================================================
-- SQL Script: Delete / Manage Users in UAT Tracker (PostgreSQL)
-- Schema: tracker
-- =============================================================================

-- Ensure search_path is set to tracker
SET search_path TO tracker, public;

-- -----------------------------------------------------------------------------
-- 1. VIEW CURRENT USERS
-- -----------------------------------------------------------------------------
SELECT 
    id, 
    employee_code, 
    email, 
    display_name, 
    role_title, 
    is_active 
FROM tracker.users 
ORDER BY employee_code;


-- -----------------------------------------------------------------------------
-- 2. SOFT DELETE (RECOMMENDED FOR PRESERVING AUDIT TRAILS & HISTORICAL CRS)
-- Deactivates user without breaking foreign keys
-- -----------------------------------------------------------------------------
-- UPDATE tracker.users 
-- SET is_active = FALSE 
-- WHERE email = 'alice.ba@company.com';


-- -----------------------------------------------------------------------------
-- 3. DELETE SPECIFIC DEMO USERS (ALICE, BOB, CAROL, CHARLIE, KOMAL)
-- Because these users are referenced by sample CRs, releases, and deployments,
-- run this transaction to clean up their sample records and delete the users:
-- -----------------------------------------------------------------------------
BEGIN;

-- Unlink team leads
UPDATE tracker.teams 
SET lead_user_id = NULL 
WHERE lead_user_id IN (
    SELECT id FROM tracker.users 
    WHERE email IN ('alice.ba@company.com','bob.pm@company.com','carol.pm@company.com','charlie.lead@company.com','komal.dev@company.com')
);

-- Delete sample deployments, releases, and SRNs linked to these demo users
DELETE FROM tracker.deployments;
DELETE FROM tracker.releases;
DELETE FROM tracker.srn_documents;
DELETE FROM tracker.sit_cycles;
DELETE FROM tracker.uat_cycles;

-- Delete sample change requests linked to these demo users
DELETE FROM tracker.change_requests 
WHERE ba_user_id IN (
    SELECT id FROM tracker.users 
    WHERE email IN ('alice.ba@company.com','bob.pm@company.com','carol.pm@company.com','charlie.lead@company.com','komal.dev@company.com')
)
OR primary_pm_id IN (
    SELECT id FROM tracker.users 
    WHERE email IN ('alice.ba@company.com','bob.pm@company.com','carol.pm@company.com','charlie.lead@company.com','komal.dev@company.com')
);

-- Delete the 5 users
DELETE FROM tracker.users 
WHERE email IN (
    'alice.ba@company.com',
    'bob.pm@company.com',
    'carol.pm@company.com',
    'charlie.lead@company.com',
    'komal.dev@company.com'
);

COMMIT;


-- -----------------------------------------------------------------------------
-- 4. SOFT-DELETE (ALTERNATIVE: DEACTIVATE WITHOUT DELETING ANY RECORDS)
-- -----------------------------------------------------------------------------
-- UPDATE tracker.users 
-- SET is_active = FALSE 
-- WHERE email IN ('alice.ba@company.com','bob.pm@company.com','carol.pm@company.com','charlie.lead@company.com','komal.dev@company.com');


-- -----------------------------------------------------------------------------
-- 5. COMPLETE RESET: WIPE ALL DEMO USERS AND ALL DEMO DATA FOR A FRESH START
-- WARNING: Wipes all sample users, CRs, defects, and tasks.
-- Master tables (departments, teams, roles, permissions, projects) are kept!
-- -----------------------------------------------------------------------------
-- TRUNCATE TABLE 
--     tracker.change_requests,
--     tracker.defects,
--     tracker.dev_tasks,
--     tracker.deployments,
--     tracker.releases,
--     tracker.srn_documents,
--     tracker.sit_cycles,
--     tracker.uat_cycles,
--     tracker.audit_logs,
--     tracker.cr_activities,
--     tracker.users 
-- CASCADE;
