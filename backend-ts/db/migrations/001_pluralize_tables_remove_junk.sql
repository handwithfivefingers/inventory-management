-- ============================================================================
-- Migration: 001_pluralize_tables_remove_junk
-- Applies to schema: `inventory`
--
-- The legacy JS backend created pluralized tables (`users`, `roles`, ...)
-- while the current backend-ts models previously mapped to singular names.
-- Now every backend-ts model declares an explicit plural `tableName`.
--
-- This migration makes the physical schema match the current models:
--   1. Drops the four plural junction tables that are structurally stale
--      (composite PK vs auto `id` PK, or FK constraints pointing at singular
--      parent tables) and recreates them with the shape the models expect.
--   2. Copies the preserved relation rows into the rebuilt plural tables
--      (`user_role` -> `user_roles`, `role_permission` -> `role_permissions`).
--   3. Drops all remaining singular / stale (junk) tables.
--
-- Sequelize's `sync({ alter: true })` on next app boot adds any FK
-- constraints against the plural parent tables.
-- ============================================================================

USE `inventory`;

-- ----------------------------------------------------------------------------
-- 1. Rebuild `user_roles` to match the `user_role` model
--    (auto `id` PK + nullable `vendorId`), preserving the relation row.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_roles`;

CREATE TABLE `user_roles` (
  `id`        INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId`    INT       NOT NULL,
  `roleId`    INT       NOT NULL,
  `vendorId`  INT       NULL,
  `createdAt` DATETIME  NOT NULL,
  `updatedAt` DATETIME  NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8 COLLATE = utf8_general_ci;

INSERT INTO `user_roles` (`userId`, `roleId`, `createdAt`, `updatedAt`)
SELECT `userId`, `roleId`, `createdAt`, `updatedAt` FROM `user_role`;

-- ----------------------------------------------------------------------------
-- 2. Rebuild `role_permissions` to match the role<->permission through-model
--    (composite PK on the two FK columns).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `role_permissions`;

CREATE TABLE `role_permissions` (
  `roleId`       INT      NOT NULL,
  `permissionId` INT      NOT NULL,
  `createdAt`    DATETIME NOT NULL,
  `updatedAt`    DATETIME NOT NULL,
  PRIMARY KEY (`roleId`, `permissionId`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8 COLLATE = utf8_general_ci;

INSERT INTO `role_permissions` (`roleId`, `permissionId`, `createdAt`, `updatedAt`)
SELECT `roleId`, `permissionId`, `createdAt`, `updatedAt` FROM `role_permission`;

-- ----------------------------------------------------------------------------
-- 3. Rebuild `product_categories` to match the `product_category` model
--    (the model has no explicit primary key, so Sequelize uses an `id` PK).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `product_categories`;

CREATE TABLE `product_categories` (
  `id`         INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `productId`  INT      NOT NULL,
  `categoryId` INT      NOT NULL,
  `createdAt`  DATETIME NOT NULL,
  `updatedAt`  DATETIME NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8 COLLATE = utf8_general_ci;

-- ----------------------------------------------------------------------------
-- 4. Rebuild `product_tags` to match the product<->tag through-model
--    (composite PK on the two FK columns).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `product_tags`;

CREATE TABLE `product_tags` (
  `productId`  INT      NOT NULL,
  `tagId`      INT      NOT NULL,
  `createdAt`  DATETIME NOT NULL,
  `updatedAt`  DATETIME NOT NULL,
  PRIMARY KEY (`productId`, `tagId`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8 COLLATE = utf8_general_ci;

-- ----------------------------------------------------------------------------
-- 5. Drop singular junction (junk) tables.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_role`;
DROP TABLE IF EXISTS `role_permission`;
DROP TABLE IF EXISTS `product_category`;
DROP TABLE IF EXISTS `product_tag`;

-- ----------------------------------------------------------------------------
-- 6. Drop singular main (junk) tables, children before parents so FK
--    constraints between junk tables do not block the drop.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoiceDetail`;
DROP TABLE IF EXISTS `invoice`;
DROP TABLE IF EXISTS `orderDetail`;
DROP TABLE IF EXISTS `order`;
DROP TABLE IF EXISTS `inventory`;
DROP TABLE IF EXISTS `transfer`;
DROP TABLE IF EXISTS `product`;
DROP TABLE IF EXISTS `provider`;
DROP TABLE IF EXISTS `warehouse`;
DROP TABLE IF EXISTS `unit`;
DROP TABLE IF EXISTS `category`;
DROP TABLE IF EXISTS `tag`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `permission`;
DROP TABLE IF EXISTS `setting`;
DROP TABLE IF EXISTS `customer`;
DROP TABLE IF EXISTS `vendor`;
DROP TABLE IF EXISTS `user`;

-- ----------------------------------------------------------------------------
-- Done. Active tables are the plural ones:
--   users, roles, permissions, vendors, warehouses, categories, tags,
--   products, product_categories, product_tags, units, providers, orders,
--   orderDetails, settings, invoices, invoiceDetails, transfers, customers,
--   inventories, user_roles, role_permissions
-- ----------------------------------------------------------------------------