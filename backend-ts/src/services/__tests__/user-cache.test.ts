import { describe, it, expect, vi, beforeEach } from "vitest";

// Covers services/user-cache.ts: profile/role updates with unified-auth-cache
// invalidation plus the admin cache-purge endpoints.
const db = vi.hoisted(() => {
  const makeModelMock = () => ({
    findOne: vi.fn(),
    findAll: vi.fn(),
    findAndCountAll: vi.fn(),
    create: vi.fn(),
    build: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    findByPk: vi.fn(),
    count: vi.fn(),
    bulkCreate: vi.fn(),
  });
  return {
    user: makeModelMock(),
    role: makeModelMock(),
    sequelize: { transaction: vi.fn() },
  };
});

const redisMock = vi.hoisted(() => ({
  cacheKey: vi.fn((...args: Array<string | number>) => args.join(":")),
  cacheDelPattern: vi.fn(),
}));

vi.mock("#/database", () => ({ default: db }));
vi.mock("#/configs/redis", () => ({ default: redisMock }));
vi.mock("#/services/authenticate/userAuth", () => ({ invalidateUserAuthCache: vi.fn() }));
vi.mock("#/utils/entity-cache", () => ({ evictCachedEntity: vi.fn() }));

import redisClient from "#/configs/redis";
import database from "#/database";
import { invalidateUserAuthCache } from "#/services/authenticate/userAuth";
import { evictCachedEntity } from "#/utils/entity-cache";
import {
  invalidateAllUserCaches,
  invalidateUserCache,
  updateUserProfile,
  updateUserRoles,
} from "../user-cache";

const res = () => {
  const r: any = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  return r;
};
const next = vi.fn();

describe("updateUserProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the profile and invalidates caches", async () => {
    const user: any = { id: 1, update: vi.fn().mockResolvedValue(undefined) };
    database.user.findByPk.mockResolvedValue(user);
    const r = res();

    await updateUserProfile({ user: { id: 1 }, body: { firstName: "A" } } as any, r, next);

    expect(database.user.findByPk).toHaveBeenCalledWith(1);
    expect(user.update).toHaveBeenCalledWith({ firstName: "A" });
    expect(invalidateUserAuthCache).toHaveBeenCalledWith(1);
    expect(evictCachedEntity).toHaveBeenCalledWith("user", 1);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ data: { message: "Profile updated successfully" } });
    expect(next).not.toHaveBeenCalled();
  });

  it("resolves the user id from locals when user is absent", async () => {
    const user: any = { id: 2, update: vi.fn().mockResolvedValue(undefined) };
    database.user.findByPk.mockResolvedValue(user);

    await updateUserProfile({ locals: { id: 2 }, body: {} } as any, res(), next);

    expect(database.user.findByPk).toHaveBeenCalledWith(2);
  });

  it("returns 401 without a user id", async () => {
    const r = res();

    await updateUserProfile({ body: {} } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(401);
    expect(r.json).toHaveBeenCalledWith({ error: "Unauthorized", status: 401 });
    expect(database.user.findByPk).not.toHaveBeenCalled();
  });

  it("returns 404 when the user is missing", async () => {
    database.user.findByPk.mockResolvedValue(null);
    const r = res();

    await updateUserProfile({ user: { id: 9 }, body: {} } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(404);
    expect(invalidateUserAuthCache).not.toHaveBeenCalled();
  });

  it("forwards DB failures to next", async () => {
    database.user.findByPk.mockRejectedValue(new Error("db down"));

    await updateUserProfile({ user: { id: 1 }, body: {} } as any, res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("updateUserRoles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("replaces roles (single-role policy keeps the first id) and invalidates", async () => {
    const user: any = { id: 1, setRoles: vi.fn().mockResolvedValue(undefined) };
    database.user.findByPk.mockResolvedValue(user);
    database.role.findAll.mockResolvedValue([{ id: 3 }]);
    const r = res();

    await updateUserRoles({ user: { id: 1 }, body: { roleIds: [3, 4] } } as any, r, next);

    expect(database.user.findByPk).toHaveBeenCalledWith(1, { include: [database.role] });
    expect(database.role.findAll).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(user.setRoles).toHaveBeenCalledWith([{ id: 3 }]);
    expect(invalidateUserAuthCache).toHaveBeenCalledWith(1);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it("accepts a scalar role id", async () => {
    const user: any = { id: 1, setRoles: vi.fn().mockResolvedValue(undefined) };
    database.user.findByPk.mockResolvedValue(user);
    database.role.findAll.mockResolvedValue([{ id: 5 }]);

    await updateUserRoles({ user: { id: 1 }, body: { roleIds: 5 } } as any, res(), next);

    expect(database.role.findAll).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("returns 401 without a user id", async () => {
    const r = res();

    await updateUserRoles({ body: { roleIds: [1] } } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when the user is missing", async () => {
    database.user.findByPk.mockResolvedValue(null);
    const r = res();

    await updateUserRoles({ user: { id: 9 }, body: { roleIds: [1] } } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when no role id is supplied", async () => {
    database.user.findByPk.mockResolvedValue({ id: 1 });
    const r = res();

    await updateUserRoles({ user: { id: 1 }, body: { roleIds: [] } } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith({ error: "roleIds must contain at least one role", status: 400 });
  });

  it("returns 404 when the role does not exist", async () => {
    database.user.findByPk.mockResolvedValue({ id: 1 });
    database.role.findAll.mockResolvedValue([]);
    const r = res();

    await updateUserRoles({ user: { id: 1 }, body: { roleIds: [9] } } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("forwards DB failures to next", async () => {
    database.user.findByPk.mockRejectedValue(new Error("db down"));

    await updateUserRoles({ user: { id: 1 }, body: { roleIds: [1] } } as any, res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("invalidateUserCache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates a single user cache", async () => {
    const r = res();

    await invalidateUserCache({ body: { userId: 7 } } as any, r, next);

    expect(invalidateUserAuthCache).toHaveBeenCalledWith(7);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ data: { message: "Cache invalidated successfully" } });
  });

  it("returns 400 without a numeric userId", async () => {
    const r = res();

    await invalidateUserCache({ body: {} } as any, r, next);

    expect(r.status).toHaveBeenCalledWith(400);
    expect(invalidateUserAuthCache).not.toHaveBeenCalled();
  });

  it("forwards failures to next", async () => {
    vi.mocked(invalidateUserAuthCache).mockRejectedValueOnce(new Error("redis down"));

    await invalidateUserCache({ body: { userId: 7 } } as any, res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("invalidateAllUserCaches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("purges the UserAuth namespace and reports the count", async () => {
    redisMock.cacheDelPattern.mockResolvedValue(4);
    const r = res();

    await invalidateAllUserCaches({} as any, r, next);

    expect(redisClient.cacheKey).toHaveBeenCalledWith("UserAuth", "*");
    expect(redisClient.cacheDelPattern).toHaveBeenCalledWith("UserAuth:*");
    expect(r.json).toHaveBeenCalledWith({ data: { message: "Invalidated 4 user caches", count: 4 } });
  });

  it("forwards redis failures to next", async () => {
    redisMock.cacheDelPattern.mockRejectedValue(new Error("redis down"));

    await invalidateAllUserCaches({} as any, res(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
