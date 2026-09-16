import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => {
  const MODEL_METHODS = ["findOne","findAll","findAndCountAll","create","build","update","destroy","findByPk","count","bulkCreate","findOrCreate"];
  const makeModelMock = () => { const m: any = {}; for (const method of MODEL_METHODS) m[method] = vi.fn(); return m; };
  const models = ["user","role","vendor","warehouse","product","inventory","transfer","category","tag","unit","permission","customer","provider","staff","shift","order","orderDetail","invoice","invoiceDetail","financialRecord","setting","units","user_role","role_permission","staff_vendor"];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = { transaction: vi.fn(), literal: vi.fn((v:any)=>v), col: vi.fn((v:any)=>v), query: vi.fn() };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
// The service imports models directly: point them at the same mocks.
vi.mock("#/database/models/user", () => ({ default: db.user, User: db.user }));
vi.mock("#/database/models/role", () => ({ default: db.role, Role: db.role }));
vi.mock("#/database/models/staff", () => ({ default: db.staff, Staff: db.staff }));
vi.mock("#/database/models/vendor", () => ({ default: db.vendor, Vendor: db.vendor }));
vi.mock("#/database/models/warehouse", () => ({ default: db.warehouse, Warehouse: db.warehouse }));
vi.mock("#/database/models/permission", () => ({ default: db.permission, Permission: db.permission }));
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

vi.mock("#/utils/entity-cache", () => ({
  getCachedEntity: vi.fn((_model: string, _id: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn(),
}));

vi.mock("#/services/authenticate/userAuth", () => ({
  invalidateUserAuthCache: vi.fn(),
  invalidateUsersByRoleId: vi.fn(),
}));
import { invalidateUserAuthCache } from "#/services/authenticate/userAuth";

vi.mock("#/libs", () => ({ getCtxUser: vi.fn() }));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));
import bcrypt from "bcryptjs";

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
      id: 1,
      parsed: { id: 1, email: "a@b.com", name: "Test" },
      staff: {
        parsed: { phone: "123" },
        role: { id: 1, name: "Admin" },
        vendors: [
          {
            id: 1,
            name: "Vendor1",
            warehouses: [{ id: 2, name: "WH", isMain: true }],
          },
        ],
      },
    });

    it("returns the user with staff, vendors and role", async () => {
      const user = buildUser();
      database.user.findByPk.mockResolvedValue(user);

      const result = await service.get(1);

      expect(database.user.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({}));
      expect(result).toEqual({
        ...user.parsed,
        ...user.staff.parsed,
        vendors: [{ id: 1, name: "Vendor1", warehouses: [{ id: 2, name: "WH", isMain: true }] }],
        role: user.staff.role,
      });
    });

    it("throws when the user is not found", async () => {
      database.user.findByPk.mockResolvedValue(null);
      await expect(service.get(1)).rejects.toThrow("User or password not valid");
    });
  });

  describe("login", () => {
    const buildLoginUser = () => ({
      id: 1,
      parsed: { id: 1, email: "a@b.com", name: "Test" },
      password: "hashed",
      staff: {
        status: "active",
        parsed: { phone: "123" },
        role: { id: 1, name: "Admin" },
      },
    });

    it("returns user data on valid credentials", async () => {
      const user = buildLoginUser();
      database.user.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const result = await service.login({ email: "a@b.com", password: "secret" });

      expect(database.user.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "a@b.com" } })
      );
      expect(vi.mocked(bcrypt.compare)).toHaveBeenCalledWith("secret", "hashed");
      expect(result).toEqual({ ...user.parsed, ...user.staff.parsed, role: user.staff.role });
    });

    it("throws when the user is not found", async () => {
      database.user.findOne.mockResolvedValue(null);
      await expect(service.login({ email: "a@b.com", password: "secret" })).rejects.toThrow(
        "User or password not valid"
      );
    });

    it("throws when the user has no password", async () => {
      const user = { ...buildLoginUser(), password: undefined };
      database.user.findOne.mockResolvedValue(user);
      await expect(service.login({ email: "a@b.com", password: "secret" })).rejects.toThrow(
        "User or password not valid"
      );
    });

    it("clears cache and throws on wrong password", async () => {
      const user = buildLoginUser();
      database.user.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      await expect(service.login({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
        "User or password not valid"
      );
      expect(Redis.cacheDel).toHaveBeenCalledWith("User:a@b.com");
    });

    it("throws when the account is inactive", async () => {
      const user = { ...buildLoginUser(), staff: { ...buildLoginUser().staff, status: "locked" } };
      database.user.findOne.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      await expect(service.login({ email: "a@b.com", password: "secret" })).rejects.toThrow(
        "User is inactive"
      );
    });
  });

  describe("register", () => {
    const params = {
      email: "new@b.com",
      password: "secret",
      vendor: "VendorX",
      warehouse: "WH Main",
      fullName: "New User",
    };

    const mockRegisterGraph = () => {
      const userRow: any = { id: 1, parsed: { id: 1, email: params.email } };
      userRow.$set = vi.fn().mockResolvedValue(undefined);
      const userBuilder: any = {};
      userBuilder.save = vi.fn().mockResolvedValue(userRow);
      const vendorRow: any = { id: 1 };
      vendorRow.$set = vi.fn().mockResolvedValue(undefined);
      const vendorBuilder: any = {};
      vendorBuilder.save = vi.fn().mockResolvedValue(vendorRow);
      const warehouseBuilder: any = { id: 2 };
      // Real Sequelize save() resolves to the instance itself.
      warehouseBuilder.save = vi.fn().mockResolvedValue(warehouseBuilder);
      const staffRow: any = { id: 3, roleId: null };
      staffRow.$set = vi.fn().mockResolvedValue(undefined);
      staffRow.save = vi.fn().mockResolvedValue(staffRow);
      const staffBuilder: any = {};
      staffBuilder.save = vi.fn().mockResolvedValue(staffRow);

      database.user.build.mockReturnValue(userBuilder);
      database.vendor.build.mockReturnValue(vendorBuilder);
      database.warehouse.build.mockReturnValue(warehouseBuilder);
      database.staff.build.mockReturnValue(staffBuilder);
      database.role.findOne.mockResolvedValue({ id: 7 });
      return { userRow, vendorRow, warehouseBuilder, staffRow };
    };

    it("creates user, vendor, warehouse, staff with links and commits", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      const { userRow, vendorRow, warehouseBuilder, staffRow } = mockRegisterGraph();

      const result = await service.register(params as any);

      expect(database.user.build).toHaveBeenCalledWith(
        expect.objectContaining({ email: params.email })
      );
      expect(database.vendor.build).toHaveBeenCalledWith(
        expect.objectContaining({ name: params.vendor })
      );
      expect(userRow.$set).toHaveBeenCalledWith("staff", staffRow, expect.anything());
      expect(vendorRow.$set).toHaveBeenCalledWith("warehouses", [warehouseBuilder], expect.anything());
      expect(staffRow.$set).toHaveBeenCalledWith("vendors", [vendorRow], expect.anything());
      expect(staffRow.roleId).toBe(7);
      expect(tx.commit).toHaveBeenCalled();
      expect(tx.rollback).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...userRow.parsed,
        vendor: vendorRow,
        warehouses: [warehouseBuilder],
      });
    });

    it("throws when the Admin role is missing", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      mockRegisterGraph();
      database.role.findOne.mockResolvedValue(null);

      await expect(service.register(params as any)).rejects.toThrow("Admin Role not found");
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });

    it("rolls back the transaction on failure", async () => {
      const tx = makeTx();
      database.sequelize.transaction.mockResolvedValue(tx);
      database.user.build.mockReturnValue({ save: vi.fn().mockRejectedValue(new Error("db down")) });

      await expect(service.register(params as any)).rejects.toThrow();
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });

  describe("clearUserCache", () => {
    it("deletes the user cache key", async () => {
      database.user.findOne.mockResolvedValue(null);
      await service.clearUserCache("a@b.com");
      expect(Redis.cacheDel).toHaveBeenCalledWith("User:a@b.com");
    });

    it("does not throw when cache delete fails", async () => {
      vi.mocked(Redis.cacheDel).mockRejectedValue(new Error("redis down"));
      await expect(service.clearUserCache("a@b.com")).resolves.toBeUndefined();
    });

    it("invalidates the auth context when the user exists", async () => {
      vi.mocked(Redis.cacheDel).mockResolvedValue(undefined);
      database.user.findOne.mockResolvedValue({ id: 5 });
      await service.clearUserCache("a@b.com");
      expect(invalidateUserAuthCache).toHaveBeenCalledWith(5);
    });
  });
});
