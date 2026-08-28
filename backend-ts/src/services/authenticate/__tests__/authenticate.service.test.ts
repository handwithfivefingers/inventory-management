import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => {
  const MODEL_METHODS = ["findOne","findAll","findAndCountAll","create","build","update","destroy","findByPk","count","bulkCreate","findOrCreate"];
  const makeModelMock = () => { const m: any = {}; for (const method of MODEL_METHODS) m[method] = vi.fn(); return m; };
  const models = ["user","role","vendor","warehouse","product","inventory","transfer","category","tag","unit","permission","customer","provider","staff","shift","order","orderDetail","invoice","invoiceDetail","financialRecord","setting","units","user_role","role_permission"];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = { transaction: vi.fn(), literal: vi.fn((v:any)=>v), col: vi.fn((v:any)=>v), query: vi.fn() };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
import database from "#/database";

vi.mock("#/configs/redis", () => ({
  default: {
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    cacheDel: vi.fn(),
    cacheKey: vi.fn((...a: string[]) => a.join(":")),
  },
}));
import Redis from "#/configs/redis";

vi.mock("#/libs", () => ({ getCtxUser: vi.fn() }));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));
import bcrypt from "bcryptjs";

vi.mock("./cache", () => ({
  cacheItem: vi.fn(),
  cacheKey: vi.fn((...a: string[]) => a.join(":")),
}));

import AuthenticateService from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

describe("AuthenticateService", () => {
  let service: AuthenticateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthenticateService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
  });

  describe("get", () => {
    const buildUser = () => ({
      parsed: { id: 1, email: "a@b.com", name: "Test" },
      roles: [{ id: 1, name: "Admin" }],
      vendors: [{ id: 1, name: "Vendor1" }],
    });

    it("returns the user with roles, vendors and resolved defaults", async () => {
      const user = buildUser();
      database.user.findOne.mockResolvedValue(user);

      const req: any = { locals: { id: 1, email: "a@b.com" } };
      const result = await service.get(req);

      expect(database.user.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ...user.parsed,
        roles: [
          {
            id: 1,
            name: "Admin",
            description: undefined,
            vendorId: undefined,
            isGlobal: undefined,
            permissions: [],
          },
        ],
        vendors: [{ id: 1, name: "Vendor1", warehouses: [] }],
        defaultVendorId: 1,
        defaultWarehouseId: null,
      });
    });

    it("throws when the user is not found", async () => {
      database.user.findOne.mockResolvedValue(null);
      const req: any = { locals: { id: 1, email: "a@b.com" } };
      await expect(service.get(req)).rejects.toThrow("User or password not valid");
    });

    it("resolves roles from staff and computes defaults from warehouses", async () => {
      const user = {
        parsed: { id: 1, email: "a@b.com" },
        staffs: [{ role: { id: 3, name: "Manager", permissions: [{ id: 2, name: "order", C: true }] } }],
        vendors: [
          {
            id: 5,
            name: "V",
            warehouses: [
              { id: 9, name: "W", isMain: false },
              { id: 10, name: "WM", isMain: true },
            ],
          },
        ],
      };
      database.user.findOne.mockResolvedValue(user);
      const req: any = { locals: { id: 1, email: "a@b.com" } };
      const result = await service.get(req);

      expect(database.user.findOne).toHaveBeenCalledTimes(1);
      expect(result.roles).toEqual([
        {
          id: 3,
          name: "Manager",
          description: undefined,
          vendorId: undefined,
          isGlobal: undefined,
          permissions: [{ id: 2, name: "order", C: true, R: false, U: false, D: false }],
        },
      ]);
      expect(result.vendors[0].warehouses).toHaveLength(2);
      expect(result.defaultVendorId).toBe(5);
      expect(result.defaultWarehouseId).toBe(10); // main warehouse wins
    });

    it("handles a user with no vendors or roles (defaults resolve to null)", async () => {
      const user = {
        parsed: { id: 7, email: "empty@b.com" },
        vendors: undefined,
        roles: undefined,
      };
      database.user.findOne.mockResolvedValue(user);
      const req: any = { locals: { id: 7, email: "empty@b.com" } };
      const result = await service.get(req);

      expect(result.roles).toEqual([]);
      expect(result.vendors).toEqual([]);
      expect(result.defaultVendorId).toBeNull();
      expect(result.defaultWarehouseId).toBeNull();
    });

    it("merges roles across multiple staff profiles", async () => {
      const user = {
        parsed: { id: 8, email: "multi@b.com" },
        staffs: [
          { role: { id: 1, name: "Owner", permissions: [{ id: 1, name: "user", R: true }] } },
          { role: { id: 2, name: "Staff", permissions: [{ id: 2, name: "order", C: true }] } },
        ],
        vendors: [],
      };
      database.user.findOne.mockResolvedValue(user);
      const req: any = { locals: { id: 8, email: "multi@b.com" } };
      const result = await service.get(req);

      expect(result.roles).toHaveLength(2);
      expect(result.roles.map((r: any) => r.name)).toEqual(["Owner", "Staff"]);
      expect(result.defaultVendorId).toBeNull();
    });
  });

  describe("login", () => {
    const buildLoginUser = () => ({
      parsed: { id: 1, email: "a@b.com", name: "Test" },
      password: "hashed",
      roles: [
        {
          id: 1,
          name: "Admin",
          permissions: [{ id: 1, name: "p1", C: true, R: true, U: true, D: true }],
        },
      ],
      vendors: [
        {
          id: 1,
          name: "Vendor1",
          warehouses: [
            { id: 1, name: "WH1", isMain: true, address: "a", phone: "p", email: "e" },
          ],
        },
      ],
    });

    it("returns user data with roles, vendors and default warehouse", async () => {
      const user = buildLoginUser();
      database.user.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const req: any = { body: { email: "a@b.com", password: "secret" } };
      const result = await service.login(req);

      expect(database.user.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "a@b.com" } })
      );
      expect(result.defaultVendorId).toBe(1);
      expect(result.defaultWarehouseId).toBe(1);
      expect(result.roles[0]).toEqual({
        id: 1,
        name: "Admin",
        permissions: [{ id: 1, name: "p1", C: true, R: true, U: true, D: true }],
      });
      expect(result.vendors[0].warehouses[0]).toEqual({
        id: 1,
        name: "WH1",
        isMain: true,
        address: "a",
        phone: "p",
        email: "e",
      });
    });

    it("throws when the user is not found", async () => {
      database.user.findOne.mockResolvedValue(null);
      const req: any = { body: { email: "a@b.com", password: "secret" } };
      await expect(service.login(req)).rejects.toThrow("User or password not valid");
    });

    it("throws when the user has no password", async () => {
      const user = { ...buildLoginUser(), password: undefined };
      database.user.findOne.mockResolvedValue(user);
      const req: any = { body: { email: "a@b.com", password: "secret" } };
      await expect(service.login(req)).rejects.toThrow("User or password not valid");
    });

    it("clears cache and throws on wrong password", async () => {
      const user = buildLoginUser();
      database.user.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      const req: any = { body: { email: "a@b.com", password: "wrong" } };
      await expect(service.login(req)).rejects.toThrow("User or password not valid");
      expect(Redis.cacheDel).toHaveBeenCalledWith("User:a@b.com");
    });
  });

  describe("register", () => {
    const params = {
      email: "new@b.com",
      password: "secret",
      vendor: "VendorX",
      warehouse: "WH Main",
      firstName: "New",
      lastName: "User",
    };

    it("creates user, vendor, Admin role with full permission links, warehouse and commits", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      // No existing roles -> owner role must be provisioned exactly once.
      database.user_role.count.mockResolvedValue(0);

      const userRole = { id: 1, name: "Admin", dataValues: { id: 1, name: "Admin" } };
      const usr = {
        id: 1,
        parsed: { id: 1, email: params.email },
        createRole: vi.fn().mockResolvedValue(userRole),
      };
      const userBuilder = { save: vi.fn().mockResolvedValue(usr) };
      const vendorModel = { id: 1, dataValues: { id: 1 } };
      const vendorBuilder = { save: vi.fn().mockResolvedValue(vendorModel) };
      const warehouseBuilder = { id: 2, save: vi.fn().mockResolvedValue(undefined) };

      database.user.build.mockReturnValue(userBuilder);
      database.vendor.build.mockReturnValue(vendorBuilder);
      database.warehouse.build.mockReturnValue(warehouseBuilder);
      database.role.findByPk.mockResolvedValue(userRole);
      // Hybrid: shared catalog lookup + flag-bearing join rows.
      database.permission.findOrCreate.mockImplementation(({ where }: any) =>
        Promise.resolve([{ id: where.name.length, name: where.name }, false])
      );
      database.role_permission.create.mockResolvedValue({});

      const result = await service.register(params as any);

      expect(database.user.build).toHaveBeenCalled();
      expect(database.user_role.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: usr.id }, transaction: tx })
      );
      expect(usr.createRole).toHaveBeenCalledWith(
        { name: "Admin", isGlobal: true },
        expect.anything()
      );
      // One catalog link per canonical module (16 modules), each fully granted.
      expect(database.permission.findOrCreate).toHaveBeenCalledTimes(16);
      expect(database.role_permission.create).toHaveBeenCalledTimes(16);
      for (const call of database.role_permission.create.mock.calls) {
        const joinRow = call[0];
        expect(joinRow.roleId).toBe(userRole.id);
        expect(joinRow.C && joinRow.R && joinRow.U && joinRow.D).toBe(true);
      }
      expect(tx.commit).toHaveBeenCalled();
      expect(tx.rollback).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...usr.parsed,
        vendor: vendorModel,
        warehouses: [warehouseBuilder],
        roles: [userRole],
      });
    });

    it("never re-provisions the owner role if the user already has one", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.user_role.count.mockResolvedValue(1); // lifetime-once guarantee

      const usr = {
        id: 9,
        parsed: { id: 9, email: params.email },
        createRole: vi.fn(),
      };
      const vendorModel = { id: 3, dataValues: {} };
      database.user.build.mockReturnValue({ save: vi.fn().mockResolvedValue(usr) });
      database.vendor.build.mockReturnValue({ save: vi.fn().mockResolvedValue(vendorModel) });
      database.warehouse.build.mockReturnValue({ id: 4, save: vi.fn().mockResolvedValue(undefined) });

      const result = await service.register(params as any);

      expect(usr.createRole).not.toHaveBeenCalled();
      expect(result.roles).toEqual([]);
      expect(tx.commit).toHaveBeenCalled();
    });

    it("rolls back the transaction on failure", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const userBuilder = { save: vi.fn().mockRejectedValue(new Error("db down")) };
      database.user.build.mockReturnValue(userBuilder);

      await expect(service.register(params as any)).rejects.toThrow();
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });

  describe("clearUserCache", () => {
    it("deletes the user cache key", async () => {
      await service.clearUserCache("a@b.com");
      expect(Redis.cacheDel).toHaveBeenCalledWith("User:a@b.com");
    });

    it("does not throw when cache delete fails", async () => {
      vi.mocked(Redis.cacheDel).mockRejectedValue(new Error("redis down"));
      await expect(service.clearUserCache("a@b.com")).resolves.toBeUndefined();
    });
  });
});
