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
  ];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
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
  });

  describe("create", () => {
    const buildInstance = (overrides: any = {}) => ({
      save: vi.fn().mockResolvedValue(undefined),
      setCategories: vi.fn().mockResolvedValue(undefined),
      setTags: vi.fn().mockResolvedValue(undefined),
      dataValues: { id: 1, name: "Cola", code: "C1", ...overrides },
      id: 1,
    });

    it("creates a product, inventory and transfer and commits", async () => {
      const product = buildInstance();
      const inventory = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 10 } };
      const transfer = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 20 } };
      database.product.findOne.mockResolvedValue(null);
      database.product.build.mockReturnValue(product);
      database.inventory.build.mockReturnValue(inventory as any);
      database.transfer.build.mockReturnValue(transfer as any);

      const req: any = {
        body: { warehouseId: 1, quantity: 5, code: "C1", name: "Cola", categories: [1], tags: [2] },
      };

      const result = await service.create(req);

      expect(database.product.findOne).toHaveBeenCalledWith({ where: { code: "C1" } });
      expect(product.setCategories).toHaveBeenCalledWith([1], expect.anything());
      expect(product.setTags).toHaveBeenCalledWith([2], expect.anything());
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
      const product = buildInstance();
      const inventory = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 10 } };
      const transfer = { save: vi.fn().mockResolvedValue(undefined), dataValues: { id: 20 } };
      database.product.findOne.mockResolvedValue(null);
      database.product.count.mockResolvedValue(4);
      database.product.build.mockReturnValue(product);
      database.inventory.build.mockReturnValue(inventory as any);
      database.transfer.build.mockReturnValue(transfer as any);
      database.setting.findOne.mockResolvedValue({
        codePrefix: { product: "SP-" },
        codeSuffix: { product: "-V1" },
        skuTemplate: "{CODE}",
      });

      await service.create({
        body: { warehouseId: 1, quantity: 5, name: "Cola", vendorId: 2 },
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
    it("returns rows and count from findAndCountAll", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [{ id: 1 }], count: 1 });
      const result = await service.getProducts({
        query: { warehouseId: 1, page: 2, pageSize: 20 },
      } as any);
      expect(result).toEqual({ rows: [{ id: 1 }], count: 1 });
      expect(database.product.findAndCountAll).toHaveBeenCalled();
    });

    it("throws when warehouseId is missing", async () => {
      await expect(service.getProducts({ query: {} } as any)).rejects.toThrow(
        "warehouseId is required",
      );
    });

    it("passes a search filter to findAndCountAll", async () => {
      database.product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await service.getProducts({ query: { warehouseId: 1, s: "col" } } as any);
      const call = database.product.findAndCountAll.mock.calls[0][0];
      expect((call.where as any)[Op.or]).toBeDefined();
      expect((call.where as any)[Op.or].name).toBeDefined();
    });
  });

  describe("getProductById", () => {
    it("returns the product found by id", async () => {
      const found = { id: 7, name: "Cola" };
      database.product.findOne.mockResolvedValue(found);
      const result = await service.getProductById({ params: { id: 7 } } as any);
      expect(result).toBe(found);
      expect(database.product.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
    });
  });
});
