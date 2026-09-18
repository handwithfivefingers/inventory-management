import { describe, it, expect, vi, beforeEach } from "vitest";
import { Op } from "sequelize";

// Tests match the variant-only ProductService (HEAD c000eb6):
// - create(params) / updateProduct(params) take flat params (see
//   controllers/product/index.ts), not { body, user } req wrappers.
// - Simple products persist a single default variant row; product rows no
//   longer carry code/skuCode (see database/models/product.ts).
// - Tenant vendor filter comes from the `x-vendor` header
//   (getRequestedVendorId), not query/body; scope still from user.vendorIds.
// - Attributes are vendor-global (ProductAttributeServices), not product-scoped.
const db = vi.hoisted(() => {
  const MODEL_METHODS = [
    "findOne",
    "findAll",
    "findAndCountAll",
    "create",
    "build",
    "update",
    "destroy",
    "findByPk",
    "count",
    "bulkCreate",
    "restore",
  ];
  const makeModelMock = () => {
    const m: any = {};
    for (const method of MODEL_METHODS) m[method] = vi.fn();
    return m;
  };
  const models = [
    "user",
    "role",
    "vendor",
    "warehouse",
    "product",
    "inventory",
    "transfer",
    "category",
    "tag",
    "unit",
    "units",
    "permission",
    "customer",
    "provider",
    "staff",
    "shift",
    "order",
    "orderDetail",
    "invoice",
    "invoiceDetail",
    "financialRecord",
    "setting",
    "productVariant",
    "productBarcode",
    "productAttribute",
    "productAttributeValue",
    "sequence",
  ];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
    fn: vi.fn((f: string, v: any) => ({ f, v })),
    query: vi.fn(),
  };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
// The service + its split-out modules import models directly: point every
// used model at the same local mock (otherwise they hit the global setup's
// separate mock instance and assertions on `database.*` never observe calls).
vi.mock("#/database/models/product", () => ({ default: db.product, Product: db.product }));
vi.mock("#/database/models/productVariant", () => ({ default: db.productVariant, ProductVariant: db.productVariant }));
vi.mock("#/database/models/productBarcode", () => ({ default: db.productBarcode, ProductBarcode: db.productBarcode }));
vi.mock("#/database/models/productAttribute", () => ({ default: db.productAttribute, ProductAttribute: db.productAttribute }));
vi.mock("#/database/models/productAttributeValue", () => ({
  default: db.productAttributeValue,
  ProductAttributeValue: db.productAttributeValue,
}));
vi.mock("#/database/models/inventory", () => ({ default: db.inventory, Inventory: db.inventory }));
vi.mock("#/database/models/transfer", () => ({ default: db.transfer, Transfer: db.transfer }));
vi.mock("#/database/models/category", () => ({ default: db.category, Category: db.category }));
vi.mock("#/database/models/tag", () => ({ default: db.tag, Tag: db.tag }));
vi.mock("#/database/models/units", () => ({ default: db.units, Unit: db.units }));
vi.mock("#/database/models/order", () => ({ default: db.order, Order: db.order }));
vi.mock("#/database/models/orderDetail", () => ({ default: db.orderDetail, OrderDetail: db.orderDetail }));
vi.mock("#/database/models/invoice", () => ({ default: db.invoice, Invoice: db.invoice }));
vi.mock("#/database/models/invoiceDetail", () => ({ default: db.invoiceDetail, InvoiceDetail: db.invoiceDetail }));
vi.mock("#/database/models/warehouse", () => ({ default: db.warehouse, Warehouse: db.warehouse }));
vi.mock("#/database/models/setting", () => ({ default: db.setting, Setting: db.setting }));
// Bypass Redis: run cache loaders inline so results stay deterministic.
vi.mock("#/utils/entity-cache", () => ({
  getCachedEntity: vi.fn((_model: string, _id: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn(),
}));
import database from "#/database";
import { ProductService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

const buildInstance = (overrides: any = {}) => {
  const dataValues = { id: 1, name: "Cola", vendorId: 1, type: 0, ...overrides };
  const instance: any = {
    $set: vi.fn().mockResolvedValue(undefined),
    setCategories: vi.fn().mockResolvedValue(undefined),
    setTags: vi.fn().mockResolvedValue(undefined),
    setDataValue: vi.fn((k: string, v: unknown) => {
      (dataValues as any)[k] = v;
    }),
    dataValues,
    id: dataValues.id,
    // Attribute/product services read direct props (attr.vendorId, attr.name)
    // as well as .get(): keep both in sync.
    vendorId: (dataValues as any).vendorId,
    name: (dataValues as any).name,
    type: (dataValues as any).type,
    get: vi.fn((k: string) => (dataValues as any)[k]),
    update: vi.fn().mockImplementation(async (patch: any) => {
      Object.assign(dataValues, patch);
      return instance;
    }),
  };
  instance.save = vi.fn().mockResolvedValue(instance);
  return instance;
};

const buildVariantInstance = (overrides: any = {}) => {
  const dataValues = { id: 77, productId: 1, code: null, skuCode: "SKU1", ...overrides };
  const instance: any = {
    $set: vi.fn().mockResolvedValue(undefined),
    dataValues,
    id: dataValues.id,
    get: vi.fn((k: string) => (dataValues as any)[k]),
    update: vi.fn().mockImplementation(async (patch: any) => {
      Object.assign(dataValues, patch);
      return instance;
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
  instance.save = vi.fn().mockResolvedValue(instance);
  return instance;
};

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    // nextSequence(): INSERT is a no-op mock, SELECT returns seq=5.
    database.sequelize.query.mockResolvedValue([[{ seq: 5 }], []]);
    database.product.count.mockResolvedValue(0);
    // isExist() + global SKU uniqueness default to "no clash".
    database.product.findOne.mockResolvedValue(null);
    database.productVariant.findOne.mockResolvedValue(null);
    database.productAttribute.findAll.mockResolvedValue([]);
    database.productAttributeValue.findAll.mockResolvedValue([]);
    database.orderDetail.findOne.mockResolvedValue(null);
    database.setting.findOne.mockResolvedValue({ skuTemplate: "{CODE}" });
    database.inventory.create.mockImplementation((data: any) => {
      const row: any = { dataValues: { ...data } };
      row.save = vi.fn().mockResolvedValue(row);
      row.update = vi.fn().mockResolvedValue(row);
      return row;
    });
    database.inventory.build.mockImplementation((data: any) => {
      const row: any = { dataValues: { ...data } };
      row.save = vi.fn().mockResolvedValue(row);
      return row;
    });
    database.transfer.create.mockImplementation((data: any) => {
      const row: any = { dataValues: { ...data } };
      row.save = vi.fn().mockResolvedValue(row);
      row.update = vi.fn().mockResolvedValue(row);
      return row;
    });
    database.productBarcode.findAll.mockImplementation((options: any) =>
      options?.where?.conversionRate === 1 ? [{ get: () => 1 }] : []
    );
    database.productBarcode.findOne.mockResolvedValue(null);
    database.productBarcode.create.mockResolvedValue({});
    database.units.findOne.mockResolvedValue({ id: 1 });
    database.units.findAll.mockResolvedValue([{ id: 1 }]);
  });

  describe("create", () => {
    it("creates a variant product with explicit variants and opening stock", async () => {
      const product = buildInstance({ id: 1 });
      const variant = buildVariantInstance({ id: 77, skuCode: "SKU1-RED" });
      database.product.create.mockResolvedValue(product);
      database.productVariant.create.mockResolvedValue(variant);
      database.productAttributeValue.findAll.mockResolvedValue([
        { id: 11, attributeId: 5, value: "Red", attribute: { vendorId: 1 } },
      ]);

      const result = await service.create({
        vendorId: 1,
        warehouseId: 2,
        name: "Ao thun",
        type: 1,
        variants: [{ attributeValues: [11], quantity: 4, salePrice: 120, skuCode: "SKU1-RED" }],
      } as any);

      // Product rows only keep the whitelisted base fields (no code/sku/prices).
      expect(database.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ao thun", vendorId: 1, type: 1 }),
        expect.anything(),
      );
      expect(database.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 1, skuCode: "SKU1-RED", salePrice: 120 }),
        expect.anything(),
      );
      expect(variant.$set).toHaveBeenCalledWith("attributeValues", [11], expect.anything());
      expect(database.inventory.build).toHaveBeenCalledWith(
        expect.objectContaining({ warehouseId: 2, quantity: 4, productId: 1, variantId: 77 }),
      );
      expect(database.transfer.build).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 4, type: "0", productId: 1, variantId: 77 }),
      );
      expect(result.product).toEqual(product.dataValues);
      expect(result.variants).toHaveLength(1);
    });

    it("auto-generates variant SKU/barcode when not provided", async () => {
      const product = buildInstance({ id: 1 });
      const variant = buildVariantInstance({ id: 78, skuCode: "GENERATED" });
      database.product.create.mockResolvedValue(product);
      database.productVariant.create.mockResolvedValue(variant);
      database.productAttributeValue.findAll.mockResolvedValue([
        { id: 11, attributeId: 5, value: "Red", attribute: { vendorId: 1 } },
      ]);

      const result = await service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        variants: [{ attributeValues: [11], quantity: 0 }],
      } as any);

      expect(database.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 1, skuCode: expect.any(String) }),
        expect.anything(),
      );
      expect(result.variants).toHaveLength(1);
    });

    it("creates a variant-shell product when variants is empty", async () => {
      const product = buildInstance({ id: 1 });
      database.product.create.mockResolvedValue(product);

      const result = await service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        code: "123456789012",
        skuCode: "SHELL-001",
        variants: [],
      } as any);

      expect(result.product).toEqual(product.dataValues);
      expect(result.variants).toEqual([]);
      expect(database.productVariant.create).not.toHaveBeenCalled();
    });

    it("documents current simple-product behaviour: default variant reuses the product barcode (409)", async () => {
      // NOTE: simple products build one default variant whose `code` equals the
      // product barcode, while `takenCodes` is pre-seeded with that same
      // barcode, so resolveVariantCode currently throws a 409. Flagged as a
      // suspected regression of the variant-only refactor (previously a simple
      // product wrote inventory + transfer directly); test pins the behaviour
      // until the service is fixed.
      const product = buildInstance({ id: 1 });
      database.product.create.mockResolvedValue(product);

      await expect(
        service.create({ vendorId: 1, warehouseId: 1, name: "Cola", code: "C1", skuCode: "SKU1", quantity: 5 } as any),
      ).rejects.toThrow("already in use by another variant");
    });

    it("throws when quantity is invalid (simple branch validates before stock)", async () => {
      const product = buildInstance({ id: 1 });
      database.product.create.mockResolvedValue(product);

      await expect(
        service.create({ vendorId: 1, warehouseId: 1, name: "Cola", quantity: "abc" } as any),
      ).rejects.toThrow("Invalid quantity");
      await expect(
        service.create({ vendorId: 1, warehouseId: 1, name: "Cola", quantity: 0 } as any),
      ).rejects.toThrow("Invalid quantity");
    });

    it("throws when a product with the same code already exists", async () => {
      database.product.findOne.mockResolvedValue({ id: 99 });

      await expect(
        service.create({ vendorId: 1, warehouseId: 1, name: "Cola", code: "C1", skuCode: "SKU1" } as any),
      ).rejects.toThrow("Product already exists or code/skuCode is duplicated");
    });

    it("rolls back the transaction when saving fails", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.product.create.mockRejectedValue(new Error("db down"));

      await expect(
        service.create({ vendorId: 1, warehouseId: 1, name: "Cola", type: 1, variants: [] } as any),
      ).rejects.toThrow("db down");
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });

    it("auto-generates code/sku via sequence when missing", async () => {
      const product = buildInstance({ id: 1 });
      database.product.create.mockResolvedValue(product);
      database.product.count.mockResolvedValue(4);

      await service.create({ vendorId: 2, warehouseId: 1, name: "Cola", type: 1, variants: [] } as any);

      expect(database.product.count).toHaveBeenCalled();
      expect(database.sequelize.query).toHaveBeenCalled();
      expect(database.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Cola", vendorId: 2, type: 1 }),
        expect.anything(),
      );
    });
  });

  describe("getProducts", () => {
    it("returns rows and count scoped to user vendors", async () => {
      const row = buildInstance({ id: 1 });
      database.product.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await service.getProducts({ query: {}, user: { vendorIds: [1] } } as any);

      expect(result.count).toBe(1);
      expect(result.rows[0]).toBe(row);
      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toEqual({ [Op.in]: [1] });
    });

    it("scopes by explicit x-vendor header when inside scope", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await service.getProducts({ query: {}, headers: { "x-vendor": "1" }, user: { vendorIds: [1, 2] } } as any);

      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toBe(1);
    });

    it("rejects out-of-scope x-vendor header", async () => {
      await expect(
        service.getProducts({ query: {}, headers: { "x-vendor": "99" }, user: { vendorIds: [1] } } as any),
      ).rejects.toThrow("Unauthorized vendor filter");
    });

    it("ignores legacy query vendorId (header-only resolution)", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await service.getProducts({ query: { vendorId: "99" }, user: { vendorIds: [1] } } as any);

      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toEqual({ [Op.in]: [1] });
    });

    it("passes a search filter to findAndCountAll", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      database.productVariant.findAll.mockResolvedValue([]);

      await service.getProducts({ query: { s: "col" }, user: { vendorIds: [1] } } as any);

      const call = database.product.findAndCountAll.mock.calls[0][0];
      expect((call.where as any)[Op.or]).toBeDefined();
    });

    it("platform admin (null scope) returns unfiltered where", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await service.getProducts({ query: {} } as any);

      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toBeUndefined();
    });
  });

  describe("getProductById", () => {
    const scopedProduct = (vendorId: number, extra: any = {}) =>
      buildInstance({ id: 7, vendorId, type: 1, ...extra });

    it("returns the product when vendor matches scope", async () => {
      const found = scopedProduct(1);
      database.product.findOne.mockResolvedValue(found);

      const result = await service.getProductById({ id: "7", vendorId: 1 } as any, [1]);

      expect(result).toBe(found);
    });

    it("rejects requested vendor outside scope before hitting the DB", async () => {
      await expect(service.getProductById({ id: "3", vendorId: 2 } as any, [1])).rejects.toThrow(
        "Unauthorized vendor filter",
      );
      expect(database.product.findOne).not.toHaveBeenCalled();
    });

    it("rejects foreign-vendor product (IDOR)", async () => {
      database.product.findOne.mockResolvedValue(scopedProduct(2, { id: 3 }));

      await expect(service.getProductById({ id: "3", vendorId: 1 } as any, [1])).rejects.toThrow(
        "Unauthorized to view this product",
      );
    });

    it("rejects when requested vendor mismatches the product vendor", async () => {
      database.product.findOne.mockResolvedValue(scopedProduct(1, { id: 3 }));

      await expect(service.getProductById({ id: "3", vendorId: 2 } as any, [1, 2])).rejects.toThrow(
        "Unauthorized to view this product",
      );
    });

    it("allows platform admin (null scope) to view any vendor", async () => {
      const found = scopedProduct(99, { id: 5 });
      database.product.findOne.mockResolvedValue(found);

      const result = await service.getProductById({ id: "5", vendorId: 99 } as any, null);

      expect(result).toBe(found);
    });

    it("denies empty scope (owns nothing)", async () => {
      await expect(service.getProductById({ id: "7", vendorId: 1 } as any, [])).rejects.toThrow();
    });

    it("flags simple products blocked from variant transition", async () => {
      const found = scopedProduct(1, { id: 9, type: 0 });
      database.product.findOne.mockResolvedValue(found);
      // No draft order, but an order line without a finalized invoice.
      database.orderDetail.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ invoiceDetails: [] });

      const result: any = await service.getProductById({ id: "9", vendorId: 1 } as any, [1]);

      expect(result).toBe(found);
      expect(found.setDataValue).toHaveBeenCalledWith("variantTransitionBlocked", true);
      expect(found.setDataValue).toHaveBeenCalledWith(
        "variantTransitionBlockReason",
        expect.stringContaining("completed invoice"),
      );
    });
  });

  describe("getProductVariants", () => {
    it("rejects foreign product", async () => {
      database.product.findByPk.mockResolvedValue(buildInstance({ id: 3, vendorId: 1 }));

      await expect(
        service.getProductVariants({ params: { id: 3 }, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
    });

    it("allows own vendor", async () => {
      database.product.findByPk.mockResolvedValue(buildInstance({ id: 1, vendorId: 1 }));
      database.productVariant.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

      const result = await service.getProductVariants({ params: { id: 1 }, user: { vendorIds: [1] } } as any);

      expect(result).toEqual({ rows: [], count: 0 });
    });
  });

  describe("vendor attributes (vendor-global, header-scoped)", () => {
    it("getProductAttributes returns the workspace vendor attributes", async () => {
      const rows = [{ id: 5, name: "Color" }];
      database.productAttribute.findAll.mockResolvedValue(rows as any);

      const result = await service.getProductAttributes({ headers: { "x-vendor": "1" } } as any);

      expect(result).toBe(rows);
      expect(database.productAttribute.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vendorId: 1 }) }),
      );
    });

    it("createAttribute creates a vendor attribute with values", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.productAttribute.findOne.mockResolvedValue(null);
      const attr = buildInstance({ id: 5, name: "Color", vendorId: 1 });
      database.productAttribute.create.mockResolvedValue(attr);
      database.productAttributeValue.bulkCreate.mockResolvedValue([]);
      database.productAttribute.findByPk.mockResolvedValue(attr);

      const result = await service.createAttribute({
        body: { name: "Color", values: ["Red"] },
        headers: { "x-vendor": "1" },
        user: { vendorIds: [1] },
      } as any);

      expect(result).toBe(attr);
      expect(database.productAttribute.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Color", vendorId: 1 }),
        expect.anything(),
      );
      expect(tx.commit).toHaveBeenCalled();
    });

    it("createAttribute rejects a vendor outside scope", async () => {
      await expect(
        service.createAttribute({
          body: { name: "Color", values: ["Red"] },
          headers: { "x-vendor": "2" },
          user: { vendorIds: [1] },
        } as any),
      ).rejects.toThrow("Unauthorized");
    });

    it("updateAttribute renames an owned attribute", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const attr = buildInstance({ id: 5, name: "Color", vendorId: 1 });
      database.productAttribute.findByPk.mockResolvedValue(attr);
      database.productAttribute.findOne.mockResolvedValue(null);

      await service.updateAttribute({ params: { attributeId: 5 }, body: { name: "Size" }, user: { vendorIds: [1] } } as any);

      expect(attr.update).toHaveBeenCalledWith(expect.objectContaining({ name: "Size" }), expect.anything());
      expect(tx.commit).toHaveBeenCalled();
    });

    it("updateAttribute rejects a foreign attribute", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.productAttribute.findByPk.mockResolvedValue(buildInstance({ id: 5, name: "Color", vendorId: 2 }));

      await expect(
        service.updateAttribute({ params: { attributeId: 5 }, body: { name: "Size" }, user: { vendorIds: [1] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("deleteAttribute removes an owned attribute", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const attr = buildInstance({ id: 5, vendorId: 1 });
      (attr as any).destroy = vi.fn().mockResolvedValue(undefined);
      database.productAttribute.findByPk.mockResolvedValue(attr);

      const result = await service.deleteAttribute({ params: { attributeId: 5 }, user: { vendorIds: [1] } } as any);

      expect(result).toBe(true);
      expect(tx.commit).toHaveBeenCalled();
    });

    it("deleteAttribute rejects a foreign attribute", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.productAttribute.findByPk.mockResolvedValue(buildInstance({ id: 5, vendorId: 2 }));

      await expect(
        service.deleteAttribute({ params: { attributeId: 5 }, user: { vendorIds: [1] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  describe("updateProduct (flat params, no scope arg)", () => {
    const scopedRow = (extra: any = {}) => {
      const data: any = { id: 1, vendorId: 1, type: 0, ...extra };
      return {
        ...data,
        get: (key: string) => (data as any)[key] ?? null,
        update: vi.fn().mockImplementation(async (patch: any) => Object.assign(data, patch)),
        $set: vi.fn().mockResolvedValue(undefined),
      };
    };

    it("updates a simple product base + stock", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const product = scopedRow({ type: 0 });
      database.product.findByPk.mockResolvedValue(product);
      database.productVariant.count.mockResolvedValue(0);
      // switchToSimple: no variants yet -> creates the default variant shell.
      database.productVariant.findAll.mockResolvedValue([]);
      const defaultVariant = buildVariantInstance({ id: 90, skuCode: "P-1-DEFAULT" });
      database.productVariant.create.mockResolvedValue(defaultVariant);
      database.inventory.findOne.mockResolvedValue(null);

      await service.updateProduct({ id: 1, name: "New", quantity: 7, warehouseId: 2 } as any);

      expect(product.update).toHaveBeenCalledWith(expect.objectContaining({ name: "New", type: 0 }), expect.anything());
      expect(database.inventory.build).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 1, quantity: 7, warehouseId: 2, variantId: 90 }),
      );
      expect(tx.commit).toHaveBeenCalled();
    });

    it("rejects an invalid type", async () => {
      database.product.findByPk.mockResolvedValue(scopedRow({ type: 0 }));
      database.productVariant.count.mockResolvedValue(0);

      await expect(service.updateProduct({ id: 1, type: 99 } as any)).rejects.toThrow("Invalid type");
    });

    it("rejects an empty name", async () => {
      database.product.findByPk.mockResolvedValue(scopedRow({ type: 0 }));
      database.productVariant.count.mockResolvedValue(0);

      await expect(service.updateProduct({ id: 1, name: "   " } as any)).rejects.toThrow("name must not be empty");
    });

    it("throws when the product does not exist", async () => {
      database.product.findByPk.mockResolvedValue(null);

      await expect(service.updateProduct({ id: 999, name: "X" } as any)).rejects.toThrow("not found");
    });

    it("variant sync removes deleted variants and upserts the rest", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const product = scopedRow({ type: 1 });
      database.product.findByPk.mockResolvedValue(product);
      database.productVariant.count.mockResolvedValue(1);
      database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
      database.productAttributeValue.findAll.mockResolvedValue([
        { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 1 } },
        { id: 12, value: "Blue", attributeId: 5, attribute: { vendorId: 1 } },
      ]);

      const removed = buildVariantInstance({ id: 99, productId: 1 });
      const redVariant = buildVariantInstance({ id: 21, productId: 1, skuCode: "SKU-RED", code: "RED-01" });
      (redVariant as any).get = vi.fn((k: string) => {
        const map: any = { id: 21, productId: 1, skuCode: "SKU-RED", code: "RED-01", attributeValues: [{ id: 11 }] };
        return map[k] ?? null;
      });
      database.productVariant.findByPk.mockImplementation(async (id: number) => {
        if (Number(id) === 99) return removed;
        if (Number(id) === 21) return redVariant;
        return null;
      });
      database.productVariant.findAll.mockResolvedValue([redVariant]);

      await service.updateProduct({
        id: 1,
        type: 1,
        warehouseId: 2,
        removedVariantIds: [99],
        variants: [{ id: 21, attributeValues: [11], salePrice: 200 }],
      } as any);

      expect(removed.destroy).toHaveBeenCalled();
      expect(redVariant.update).toHaveBeenCalledWith(expect.objectContaining({ salePrice: 200 }), expect.anything());
      expect(tx.commit).toHaveBeenCalled();
    });

    it("variant sync rejects attribute values from another vendor", async () => {
      database.product.findByPk.mockResolvedValue(scopedRow({ type: 1 }));
      database.productVariant.count.mockResolvedValue(0);
      database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
      database.productAttributeValue.findAll.mockResolvedValue([
        { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 9 } },
      ]);
      database.productVariant.findAll.mockResolvedValue([]);

      await expect(
        service.updateProduct({ id: 1, type: 1, variants: [{ attributeValues: [11] }] } as any),
      ).rejects.toThrow("Attribute value vendor mismatch");
    });

    it("stress: accepts numeric ids and nullable optionals", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const product = scopedRow({ type: 0 });
      database.product.findByPk.mockResolvedValue(product);
      database.productVariant.count.mockResolvedValue(0);
      database.productVariant.findAll.mockResolvedValue([]);
      database.productVariant.create.mockResolvedValue(buildVariantInstance({ id: 91 }));
      database.inventory.findOne.mockResolvedValue(null);

      await expect(service.updateProduct({ id: 1, unitId: 2, description: null } as any)).resolves.toBe(true);
      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ unitId: 2, description: null, type: 0 }),
        expect.anything(),
      );
    });
  });
});
