import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => {
  const MODEL_METHODS = ["findOne","findAll","findAndCountAll","create","build","update","destroy","findByPk","count","bulkCreate"];
  const makeModelMock = () => { const m: any = {}; for (const method of MODEL_METHODS) m[method] = vi.fn(); return m; };
  const models = ["user","role","vendor","warehouse","product","inventory","transfer","category","tag","unit","permission","customer","provider","staff","shift","order","orderDetail","invoice","invoiceDetail","financialRecord","setting","units"];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = { transaction: vi.fn(), literal: vi.fn((v:any)=>v), col: vi.fn((v:any)=>v), query: vi.fn(), fn: vi.fn((...a:any[])=>a) };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
import database from "#/database";
import { CategoriesService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

describe("CategoriesService", () => {
  let service: CategoriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CategoriesService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
  });

  describe("create", () => {
    it("throws when name is missing", async () => {
      await expect(service.create({ vendorId: 1 } as any)).rejects.toThrow(
        "Category name is required",
      );
    });

    it("throws when vendorId is missing", async () => {
      await expect(service.create({ name: "Cat" } as any)).rejects.toThrow(
        "Vendor is required",
      );
    });

    it("builds and saves a category then returns the instance", async () => {
      const instance = { id: 1, name: "Cat", vendorId: 2, save: vi.fn() };
      database.category.build.mockReturnValue({
        ...instance,
        save: vi.fn().mockResolvedValue(instance),
      });

      const result = await service.create({ name: "Cat", vendorId: 2 } as any);

      expect(database.category.build).toHaveBeenCalledWith({
        name: "Cat",
        vendorId: 2,
      });
      expect(result).toBe(instance);
    });

    it("rethrows when saving fails", async () => {
      database.category.build.mockReturnValue({
        save: vi.fn().mockRejectedValue(new Error("db down")),
      });

      await expect(
        service.create({ name: "Cat", vendorId: 2 } as any),
      ).rejects.toThrow("db down");
    });
  });

  describe("update", () => {
    it("updates a category by id and returns the result", async () => {
      database.category.update.mockResolvedValue([1]);

      const result = await service.update({ id: 1, name: "New" } as any);

      expect(database.category.update).toHaveBeenCalledWith(
        { name: "New" },
        { where: { id: 1 } },
      );
      expect(result).toEqual([1]);
    });

    it("rethrows when the update fails", async () => {
      database.category.update.mockRejectedValue(new Error("db down"));

      await expect(
        service.update({ id: 1, name: "New" } as any),
      ).rejects.toThrow("db down");
    });
  });

  describe("getCategories", () => {
    it("throws when vendorId is missing", async () => {
      await expect(
        service.getCategories({ limit: 10, offset: 0 } as any),
      ).rejects.toThrow("Vendor is required");
    });

    it("returns findAndCountAll result filtered by vendorId", async () => {
      const resp = { rows: [{ id: 1 }], count: 1 };
      database.category.findAndCountAll.mockResolvedValue(resp);

      const result = await service.getCategories({
        limit: 10,
        offset: 0,
        vendorId: "v1",
      });

      expect(result).toBe(resp);
      expect(database.category.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorId: "v1" },
          offset: 0,
          limit: 10,
          raw: true,
        }),
      );
    });

    it("rethrows when the query fails", async () => {
      database.category.findAndCountAll.mockRejectedValue(new Error("db down"));

      await expect(
        service.getCategories({ vendorId: "v1" } as any),
      ).rejects.toThrow("db down");
    });
  });

  describe("getById", () => {
    it("returns the category found by id including products", async () => {
      const found = { id: 7, name: "Cat" };
      database.category.findOne.mockResolvedValue(found);

      const result = await service.getById(7);

      expect(result).toBe(found);
      expect(database.category.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 }, include: database.product }),
      );
    });

    it("rethrows when the query fails", async () => {
      database.category.findOne.mockRejectedValue(new Error("db down"));

      await expect(service.getById(7)).rejects.toThrow("db down");
    });
  });

  describe("deleteById", () => {
    it("destroys the category within a transaction and commits", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.category.destroy.mockResolvedValue(1);

      const result = await service.deleteById(7);

      expect(result).toBe(1);
      expect(database.category.destroy).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(tx.commit).toHaveBeenCalled();
      expect(tx.rollback).not.toHaveBeenCalled();
    });

    it("rolls back when destroy fails", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.category.destroy.mockRejectedValue(new Error("db down"));

      await expect(service.deleteById(7)).rejects.toThrow("db down");
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });
});
