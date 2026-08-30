import { describe, it, expect, vi, beforeEach } from "vitest";
import { Op } from "sequelize";

// Self-contained Sequelize/database mock. `vi.hoisted` guarantees the same
// object is used by both `vi.mock` and the test imports, avoiding TDZ issues.
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
    "units",
    "productVariant",
    "productAttribute",
    "productAttributeValue",
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
import database from "#/database";
import { ProductService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    // S1: tenant checks resolve the warehouse (platform-admin scope here).
    database.warehouse.findByPk.mockResolvedValue({ vendorId: 1 });
    // P3: post-pagination aggregates default to empty result sets.
    database.inventory.findAll.mockResolvedValue([]);
    database.productVariant.findAll.mockResolvedValue([]);
  });

  describe("create", () => {
    const buildInstance = (overrides: any = {}) => {
      const dataValues = { id: 1, name: "Cola", code: "C1", vendorId: 1, ...overrides };
      return {
        save: vi.fn().mockResolvedValue(undefined),
        $set: vi.fn().mockResolvedValue(undefined),
        setCategories: vi.fn().mockResolvedValue(undefined),
        setTags: vi.fn().mockResolvedValue(undefined),
        dataValues,
        id: 1,
        get: vi.fn((k: string) => (dataValues as any)[k]),
      };
    };

    it("creates a product, inventory and transfer and commits", async () => {
      const product = buildInstance();
      const inventory = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 10 } };
      const transfer = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 20 } };
      database.product.findOne.mockResolvedValue(null);
      database.product.build.mockReturnValue(product as any);
      database.inventory.build.mockReturnValue(inventory as any);
      database.transfer.build.mockReturnValue(transfer as any);
      // debug: ensure mocks are set
      // console.log('build mock', database.product.build, database.product.findOne);
      const req: any = {
        body: { warehouseId: 1, quantity: 5, code: "C1", name: "Cola", categories: [1], tags: [2] },
        user: { vendorIds: [1] },
      };
      // console.log('before create', database.product.build.getMockImplementation());

      const result = await service.create(req);

      expect(database.product.findOne).toHaveBeenCalledWith({ where: { code: "C1" } });
      expect(product.$set).toHaveBeenCalledWith("categories", [1], expect.anything());
      expect(product.$set).toHaveBeenCalledWith("tags", [2], expect.anything());
      expect(database.sequelize.transaction).toHaveBeenCalled();
      expect(result).toEqual({
        inventory: { id: 10 },
        product: product.dataValues,
        transfer: { id: 20 },
      });
    });

    it("throws when warehouseId is missing", async () => {
      await expect(
        service.create({ body: { quantity: 5, code: "C1", name: "Cola" } } as any),
      ).rejects.toThrow("warehouseId is required");
    });

    it("throws when quantity is invalid", async () => {
      await expect(
        service.create({ body: { warehouseId: 1, quantity: "abc", code: "C1", name: "Cola" } } as any),
      ).rejects.toThrow("Invalid quantity");
      await expect(
        service.create({ body: { warehouseId: 1, quantity: 0, code: "C1", name: "Cola" } } as any),
      ).rejects.toThrow("Invalid quantity");
    });

    it("auto-generates the product code and SKU from vendor settings when missing", async () => {
      const product = buildInstance({ vendorId: 2 });
      const inventory = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 10 } };
      const transfer = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 20 } };
      database.warehouse.findByPk.mockResolvedValue({ vendorId: 2 } as any);
      database.product.findOne.mockResolvedValue(null);
      database.product.count.mockResolvedValue(4);
      // C1: counter read-back via LAST_INSERT_ID() -> 5
      database.sequelize.query.mockImplementation(async (sql: string) => {
        return String(sql).includes("LAST_INSERT_ID()") ? [[{ seq: 5 }], []] : [[], []];
      });
      database.product.build.mockReturnValue(product as any);
      database.inventory.build.mockReturnValue(inventory as any);
      database.transfer.build.mockReturnValue(transfer as any);
      database.setting.findOne.mockResolvedValue({
        codePrefix: { product: "SP-" },
        codeSuffix: { product: "-V1" },
        skuTemplate: "{CODE}",
      });

      await service.create({
        body: { warehouseId: 1, quantity: 5, name: "Cola", vendorId: 2 },
        user: { vendorIds: [2] },
      } as any);

      // seq = count + 1 = 5 -> padded '00005' wrapped with prefix/suffix
      expect(database.product.build).toHaveBeenCalledWith(
        expect.objectContaining({ code: "SP-00005-V1", skuCode: "SP-00005-V1" }),
      );
    });

    it("throws when a product with the same code already exists", async () => {
      database.product.findOne.mockResolvedValue({ id: 99 });
      await expect(
        service.create({ body: { warehouseId: 1, quantity: 5, code: "C1", name: "Cola" } } as any),
      ).rejects.toThrow("Product with code C1 already exists");
    });

    it("rolls back the transaction when saving fails", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.product.findOne.mockResolvedValue(null);
      database.product.build.mockReturnValue({
        ...buildInstance(),
        save: vi.fn().mockRejectedValue(new Error("db down")),
      });

      await expect(
        service.create({ body: { warehouseId: 1, quantity: 5, code: "C1", name: "Cola" } } as any),
      ).rejects.toThrow("Product creation failed");
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });

  describe("getProducts", () => {
    it("returns rows and count from findAndCountAll with vendor scope", async () => {
      const row = { id: 1, setDataValue: vi.fn(), get: vi.fn((k: string) => (k === "id" ? 1 : undefined)) } as any;
      database.product.findAndCountAll.mockResolvedValue({ rows: [row], count: 1 });
      database.inventory.findAll.mockResolvedValue([{ productId: 1, total: 7 }]);
      database.productVariant.findAll.mockResolvedValue([{ productId: 1, variantCount: 2 }]);

      const result = await service.getProducts({
        query: { page: 2, pageSize: 20 },
        user: { vendorIds: [1] },
      } as any);

      expect(result.count).toBe(1);
      expect(result.rows[0]).toBe(row);
      expect(row.setDataValue).toHaveBeenCalledWith("quantity", 7);
      expect(database.product.findAndCountAll).toHaveBeenCalled();
      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toEqual({ [Op.in]: [1] });
    });

    it("scopes by explicit vendorId when inside scope", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await service.getProducts({ query: { vendorId: "1" }, user: { vendorIds: [1, 2] } } as any);
      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toBe(1);
    });

    it("rejects out-of-scope vendor filter", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await expect(service.getProducts({ query: { vendorId: "99" }, user: { vendorIds: [1] } } as any)).rejects.toThrow(
        "Unauthorized vendor filter",
      );
    });

    it("supports vendor alias for backward compat", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await service.getProducts({ query: { vendor: "1" }, user: { vendorIds: [1] } } as any);
      const where = database.product.findAndCountAll.mock.calls[0][0].where;
      expect(where.vendorId).toBe(1);
    });

    it("passes a search filter to findAndCountAll", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
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
    it("returns the product found by id when vendor matches scope", async () => {
      const found: any = { id: 7, name: "Cola", vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 7)) };
      database.product.findOne.mockResolvedValue(found);
      const result = await service.getProductById({ params: { id: 7 }, user: { vendorIds: [1] } } as any);
      expect(result).toBe(found);
    });

    it("rejects foreign-vendor product (IDOR)", async () => {
      database.product.findOne.mockResolvedValue({ id: 3, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 3)) } as any);
      await expect(service.getProductById({ params: { id: 3 }, user: { vendorIds: [2] } } as any)).rejects.toThrow(
        "Unauthorized to view this product",
      );
    });

    it("rejects when query vendor filter mismatches product", async () => {
      database.product.findOne.mockResolvedValue({ id: 3, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 3)) } as any);
      await expect(
        service.getProductById({ params: { id: 3 }, query: { vendorId: "2" }, user: { vendorIds: [1, 2] } } as any),
      ).rejects.toThrow("Unauthorized to view this product");
    });

    it("allows platform admin (null scope) to view any vendor", async () => {
      const found: any = { id: 7, vendorId: 99, get: vi.fn((k: string) => (k === "vendorId" ? 99 : 7)) };
      database.product.findOne.mockResolvedValue(found);
      const result = await service.getProductById({ params: { id: 7 } } as any);
      expect(result).toBe(found);
    });

    it("denies empty scope (owns nothing)", async () => {
      database.product.findOne.mockResolvedValue({ id: 7, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 7)) } as any);
      await expect(service.getProductById({ params: { id: 7 }, user: { vendorIds: [] } } as any)).rejects.toThrow();
    });
  });

  describe("vendor isolation for variants/attributes (functional + stress)", () => {
    it("getProductVariants rejects foreign product", async () => {
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 3)) } as any);
      await expect(service.getProductVariants({ params: { id: 3 }, user: { vendorIds: [2] } } as any)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("getProductVariants allows own vendor", async () => {
      database.product.findByPk.mockResolvedValue({ id: 1, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 1)) } as any);
      database.productVariant.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);
      const result = await service.getProductVariants({ params: { id: 1 }, user: { vendorIds: [1] } } as any);
      expect(result).toEqual({ rows: [], count: 0 });
    });

    it("getProductAttributes rejects foreign product", async () => {
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1 } as any);
      await expect(service.getProductAttributes({ params: { id: 3 }, user: { vendorIds: [2] } } as any)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("createAttribute rejects foreign product", async () => {
      const tx = { commit: vi.fn(), rollback: vi.fn() };
      database.sequelize.transaction.mockResolvedValue(tx as any);
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 3)) } as any);
      await expect(
        service.createAttribute({ params: { id: 3 }, body: { name: "Color", values: ["Red"] }, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("updateAttribute rejects foreign product", async () => {
      const tx = { commit: vi.fn(), rollback: vi.fn() };
      database.sequelize.transaction.mockResolvedValue(tx as any);
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 3)) } as any);
      await expect(
        service.updateAttribute({ params: { id: 3, attributeId: 1 }, body: { name: "Size" }, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("deleteAttribute rejects foreign product", async () => {
      const tx = { commit: vi.fn(), rollback: vi.fn() };
      database.sequelize.transaction.mockResolvedValue(tx as any);
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1 } as any);
      await expect(
        service.deleteAttribute({ params: { id: 3, attributeId: 1 }, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("syncProductVariants rejects foreign product", async () => {
      const tx = { commit: vi.fn(), rollback: vi.fn() };
      database.sequelize.transaction.mockResolvedValue(tx as any);
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1 } as any);
      await expect(
        service.syncProductVariants({ params: { id: 3 }, body: {}, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("updateVariant rejects when variant belongs to foreign product", async () => {
      const tx = { commit: vi.fn(), rollback: vi.fn() };
      database.sequelize.transaction.mockResolvedValue(tx as any);
      database.product.findByPk.mockResolvedValue({ id: 3, vendorId: 1 } as any);
      await expect(
        service.updateVariant({ params: { id: 3, variantId: 1 }, body: {}, user: { vendorIds: [2] } } as any),
      ).rejects.toThrow("Unauthorized");
      expect(tx.rollback).toHaveBeenCalled();
    });

    it("stress: handles string vendorId, empty string, NaN, null", async () => {
      // string "1" should be treated as 1 inside scope
      database.product.findOne.mockResolvedValue({ id: 1, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 1)) } as any);
      await expect(service.getProductById({ params: { id: 1 }, query: { vendorId: "1" }, user: { vendorIds: [1] } } as any)).resolves.toBeDefined();
      // empty string should be ignored (no filter) and still enforce row check
      database.product.findOne.mockResolvedValue({ id: 1, vendorId: 1, get: vi.fn((k: string) => (k === "vendorId" ? 1 : 1)) } as any);
      await expect(service.getProductById({ params: { id: 1 }, query: { vendorId: "" }, user: { vendorIds: [1] } } as any)).resolves.toBeDefined();
      // NaN vendor filter should be rejected
      await expect(service.getProducts({ query: { vendorId: "abc" }, user: { vendorIds: [1] } } as any)).rejects.toThrow();
      // null scope (platform admin) should bypass
      database.product.findOne.mockResolvedValue({ id: 5, vendorId: 99, get: vi.fn((k: string) => (k === "vendorId" ? 99 : 5)) } as any);
      await expect(service.getProductById({ params: { id: 5 } } as any)).resolves.toBeDefined();
    });
  });
});
