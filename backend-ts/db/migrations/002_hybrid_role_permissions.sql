-- ============================================================================
-- Migration: 002_hybrid_role_permissions
-- Applies to schema: `inventory`
--
-- Hybrid RBAC refactor:
--   BEFORE: every role owned private `permissions` rows carrying C/R/U/D
--           (same module duplicated across roles).
--   AFTER:  `permissions` is a shared CATALOG (one row per module key);
--           per-role C/R/U/D grants live on the `role_permissions` join.
--
-- NOTE: the backend runs this migration automatically (and idempotently) at
-- boot via PermissionSyncService.migrateLegacyIfNeeded(), BEFORE its
-- sync({alter:true}) pass drops the legacy columns. This script exists for
-- manual/production parity - run it only if you must migrate without booting
-- the app.
-- ============================================================================

USE `inventory`;

-- 1. Flags move onto the join table -----------------------------------------
ALTER TABLE `role_permissions`
  ADD COLUMN IF NOT EXISTS `C` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS `R` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS `U` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS `D` BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Copy the grants from the (soon-to-be-dropped) legacy columns ------------
UPDATE `role_permissions` rp
JOIN `permissions` p ON p.`id` = rp.`permissionId`
SET rp.`C` = p.`C`, rp.`R` = p.`R`, rp.`U` = p.`U`, rp.`D` = p.`D`
WHERE rp.`C` = FALSE AND rp.`R` = FALSE AND rp.`U` = FALSE AND rp.`D` = FALSE;

-- 3. Remap duplicate catalog rows onto the canonical row (lowest id) ---------
--    Collisions with an already-linked canonical row are resolved by OR-ing
--    the flags of whichever copy is dropped.
CREATE TEMPORARY TABLE tmp_canonical AS
SELECT `name`, MIN(`id`) AS canonicalId FROM `permissions` GROUP BY `name`;

UPDATE `role_permissions` rp
JOIN `permissions` p ON p.`id` = rp.`permissionId`
JOIN tmp_canonical c ON c.`name` = p.`name`
SET rp.`permissionId` = c.canonicalId,
    rp.`C` = rp.`C`, rp.`R` = rp.`R`, rp.`U` = rp.`U`, rp.`D` = rp.`D`
WHERE p.`id` <> c.canonicalId;

-- 4. Drop stale links + duplicate catalog rows -------------------------------
DELETE rp FROM `role_permissions` rp
JOIN `permissions` p ON p.`id` = rp.`permissionId`
JOIN tmp_canonical c ON c.`name` = p.`name`
WHERE p.`id` <> c.canonicalId;

DELETE p FROM `permissions` p
JOIN tmp_canonical c ON c.`name` = p.`name`
WHERE p.`id` <> c.canonicalId;

DROP TEMPORARY TABLE tmp_canonical;

-- The legacy `permissions`.C/R/U/D columns are dropped by the app's
-- sync({alter:true}) on next boot.
