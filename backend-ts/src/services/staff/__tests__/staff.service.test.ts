import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => {
  const MODEL_METHODS = ["findOne","findAll","findAndCountAll","create","build","update","destroy","findByPk","count","bulkCreate"];
  const makeModelMock = () => { const m: any = {}; for (const method of MODEL_METHODS) m[method] = vi.fn(); return m; };
  const models = ["user","role","vendor","warehouse","product","inventory","transfer","category","tag","unit","permission","customer","provider","staff","shift","order","orderDetail","invoice","invoiceDetail","financialRecord","setting","units"];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = { transaction: vi.fn(), literal: vi.fn((v:any)=>v), col: vi.fn((v:any)=>v), query: vi.fn() };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
// The real `#/utils` index re-exports a non-existent `./sum` module, which
// breaks the import graph. The service only uses `getPagination`, so we mock
// it here with an identical implementation (no source file is modified).
vi.mock("#/utils", () => ({
  getPagination: ({
    page,
    pageSize,
    vendorId,
    warehouseId,
  }: {
    page?: number | string;
    pageSize?: number | string;
    vendorId?: string;
    warehouseId?: string;
  }) => {
    const limit = pageSize ? +pageSize : 10;
    const offset = page ? (+page - 1) * limit : 0;
    return { limit, offset, vendorId, warehouseId };
  },
}));
import database from "#/database";
import { StaffService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

describe("StaffService", () => {
  let service: StaffService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StaffService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
  });

  describe("getStaffs", () => {
    it("returns paginated staff list (happy path)", async () => {
      const resp = { rows: [{ id: 1, fullName: "John" }], count: 1 };
      database.staff.findAndCountAll.mockResolvedValue(resp);

      const result = await service.getStaffs({ query: { page: 1, pageSize: 10 } });

      expect(result).toBe(resp);
      expect(database.staff.findAndCountAll).toHaveBeenCalledTimes(1);
      const arg = database.staff.findAndCountAll.mock.calls[0][0];
      expect(arg.where).toEqual({});
      expect(arg.distinct).toBe(true);
      expect(arg.order).toEqual([["createdAt", "DESC"]]);
    });

    it("applies warehouseId, status and q filters from query", async () => {
      const resp = { rows: [], count: 0 };
      database.staff.findAndCountAll.mockResolvedValue(resp);

      await service.getStaffs({
        query: { warehouseId: "5", status: "active", q: "abc" },
      });

      const where = database.staff.findAndCountAll.mock.calls[0][0].where;
      expect(where.warehouseId).toBe(5);
      expect(where.status).toBe("active");
      expect(where.fullName).toEqual({ [require("sequelize").Op.like]: "%abc%" });
    });

    it("throws when findAndCountAll rejects (db failure)", async () => {
      database.staff.findAndCountAll.mockRejectedValue(new Error("db down"));
      await expect(service.getStaffs({ query: {} })).rejects.toThrow("db down");
    });
  });

  describe("getById", () => {
    it("returns the staff record by id (happy path)", async () => {
      const record = { id: 7, fullName: "Jane", dataValues: { id: 7 } };
      database.staff.findByPk.mockResolvedValue(record);

      const result = await service.getById(7);

      expect(result).toBe(record);
      expect(database.staff.findByPk).toHaveBeenCalledWith(7, {
        include: [{ model: database.user }, { model: database.warehouse }],
      });
    });

    it("throws when findByPk rejects (db failure)", async () => {
      database.staff.findByPk.mockRejectedValue(new Error("boom"));
      await expect(service.getById(7)).rejects.toThrow("boom");
    });
  });

  describe("create", () => {
    it("generates a sequential code and creates the staff (happy path)", async () => {
      database.staff.count.mockResolvedValue(3);
      const created = { id: 4, code: "NV-0004", fullName: "Tom" };
      database.staff.create.mockResolvedValue(created);

      const body = { fullName: "Tom" };
      const result = await service.create(body);

      expect(database.staff.count).toHaveBeenCalledTimes(1);
      expect(database.staff.create).toHaveBeenCalledWith({ ...body, code: "NV-0004" });
      expect(result).toBe(created);
    });

    it("pads the code to four digits when count is 0", async () => {
      database.staff.count.mockResolvedValue(0);
      database.staff.create.mockResolvedValue({});
      await service.create({ fullName: "X" });
      expect(database.staff.create.mock.calls[0][0].code).toBe("NV-0001");
    });

    it("throws when count rejects (db failure)", async () => {
      database.staff.count.mockRejectedValue(new Error("count fail"));
      await expect(service.create({ fullName: "X" })).rejects.toThrow("count fail");
    });

    it("throws when create rejects (db failure)", async () => {
      database.staff.count.mockResolvedValue(1);
      database.staff.create.mockRejectedValue(new Error("create fail"));
      await expect(service.create({ fullName: "X" })).rejects.toThrow("create fail");
    });
  });

  describe("update", () => {
    it("updates the staff and returns affected rows (happy path)", async () => {
      database.staff.update.mockResolvedValue([1]);
      const result = await service.update(2, { fullName: "New" });
      expect(database.staff.update).toHaveBeenCalledWith({ fullName: "New" }, { where: { id: 2 } });
      expect(result).toBe(1);
    });

    it("throws when update rejects (db failure)", async () => {
      database.staff.update.mockRejectedValue(new Error("update fail"));
      await expect(service.update(2, { fullName: "New" })).rejects.toThrow("update fail");
    });
  });

  describe("remove", () => {
    it("destroys the staff record (happy path)", async () => {
      database.staff.destroy.mockResolvedValue(1);
      const result = await service.remove(3);
      expect(database.staff.destroy).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(result).toBe(1);
    });

    it("throws when destroy rejects (db failure)", async () => {
      database.staff.destroy.mockRejectedValue(new Error("destroy fail"));
      await expect(service.remove(3)).rejects.toThrow("destroy fail");
    });
  });
});
