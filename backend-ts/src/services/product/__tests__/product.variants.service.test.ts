import { describe, it, expect, vi, beforeEach } from "vitest";

// Self-contained Sequelize/database mock following the project's test pattern.
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
    "increment",
    "decrement",
  ];
  const makeModelMock = () => {
    const m: any = {};
    for (const method of MODEL_METHODS) m[method] = vi.fn();
    return m;
  };
  const models = [
    "product",
    "inventory",
    "transfer",
    "setting",
    "category",
    "tag",
    "unit",
    "productAttribute",
    "productAttributeValue",
    "productVariant",
  ];
  const database: any = {};
  for (const name of models) database[name] = makeModelMock();
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
  };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
import database from "#/database";
import { ProductService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

/** Build helper: instances returned by model.build() auto-increment their id */
const makeInstanceFactory = () => {
  let seq = 0;
  return (dataValues: Record<string, unknown>, extra: any = {}) => {
    seq += 1;
    const instance: any = {
      id: seq,
      dataValues: { id: seq, ...dataValues },
      setCategories: vi.fn(),
      setTags: vi.fn(),
      setAttributeValues: vi.fn().mockResolvedValue(undefined),
      ...extra,
    };
    // Real Sequelize save()/update() resolve to the instance itself
    instance.save = vi.fn().mockResolvedValue(instance);
    instance.update = vi.fn().mockResolvedValue(instance);
    return instance;
  };
};

describe("ProductService.create with variants", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    database.setting.findOne.mockResolvedValue(null);
    database.product.count.mockResolvedValue(0);
    database.product.findOne.mockResolvedValue(null);
  });

  const makeProduct = () => {
    const make = makeInstanceFactory();
    const prod = make({ name: "Áo thun", code: "A1", skuCode: "SKU1" });
    database.product.build.mockReturnValue(prod);
    return prod;
  };

  it("creates one variant per attribute combination with generated SKUs", async () => {
    const prod = makeProduct();
    const make = makeInstanceFactory();
    // Attribute rows: Color(id after product) then Size
    database.productAttribute.build.mockImplementation(({ name }: any) => make({ name }));
    database.productAttributeValue.build.mockImplementation(({ value }: any) =>
      make({ value }),
    );
    database.productVariant.build.mockImplementation(({ skuCode }: any) =>
      make({ skuCode }, {
        setAttributeValues: vi.fn().mockResolvedValue(undefined),
      }),
    );
    database.inventory.build.mockImplementation((data: any) => make(data));
    database.transfer.build.mockImplementation((data: any) => make(data));

    const req: any = {
      body: {
        warehouseId: 1,
        quantity: 5,
        name: "Áo thun",
        code: "A1",
        skuCode: "SKU1",
        attributes: [
          { name: "Color", values: ["Red", "Blue"] },
          { name: "Size", values: ["M"] },
        ],
        variants: [],
      },
    };

    const result = await service.create(req);

    expect(result.variants).toHaveLength(2);
    expect(database.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: prod.id, skuCode: "SKU1-RED-M" }),
    );
    expect(database.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: prod.id, skuCode: "SKU1-BLUE-M" }),
    );
    // Every variant is linked to its attribute values
    expect(database.productVariant.build.mock.results.length).toBe(2);
    // No product-level stock rows for variable products
    expect(database.inventory.build).not.toHaveBeenCalled();
    expect(database.transfer.build).not.toHaveBeenCalled();
  });

  it("applies per-combination overrides (opening stock -> inventory + IN transfer)", async () => {
    makeProduct();
    const make = makeInstanceFactory();
    database.productAttribute.build.mockImplementation(({ name }: any) => make({ name }));
    database.productAttributeValue.build.mockImplementation(({ value }: any) =>
      make({ value }),
    );
    database.productVariant.build.mockImplementation(({ skuCode }: any) =>
      make({ skuCode }, {
        setAttributeValues: vi.fn().mockResolvedValue(undefined),
      }),
    );
    database.inventory.build.mockImplementation((data: any) => make(data));
    database.transfer.build.mockImplementation((data: any) => make(data));

    await service.create({
      body: {
        warehouseId: 2,
        quantity: 9,
        name: "Áo thun",
        code: "A1",
        skuCode: "SKU1",
        attributes: [{ name: "Color", values: ["Red", "Blue"] }],
        variants: [{ optionValues: { Color: "Red" }, quantity: 4, salePrice: 120 }],
      },
    } as any);

    // Only the overridden combination gets opening stock
    expect(database.inventory.build).toHaveBeenCalledTimes(1);
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 2, quantity: 4, variantId: expect.any(Number) }),
    );
    expect(database.transfer.build).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 4, type: "0", variantId: expect.any(Number) }),
    );
    // Override price lands on the variant row
    const firstVariantCall = database.productVariant.build.mock.calls.find(
      ([arg]: any) => arg.skuCode === "SKU1-RED",
    );
    expect(firstVariantCall?.[0]).toEqual(expect.objectContaining({ salePrice: 120 }));
  });

  it("manual mode (generateAll: false) creates only the picked combinations", async () => {
    makeProduct();
    const make = makeInstanceFactory();
    database.productAttribute.build.mockImplementation(({ name }: any) => make({ name }));
    database.productAttributeValue.build.mockImplementation(({ value }: any) =>
      make({ value }),
    );
    database.productVariant.build.mockImplementation(({ skuCode }: any) =>
      make({ skuCode }, {
        setAttributeValues: vi.fn().mockResolvedValue(undefined),
      }),
    );
    database.inventory.build.mockImplementation((data: any) => make(data));
    database.transfer.build.mockImplementation((data: any) => make(data));

    const result = await service.create({
      body: {
        warehouseId: 1,
        quantity: 0,
        name: "Áo thun",
        code: "A1",
        skuCode: "SKU1",
        generateAll: false,
        attributes: [{ name: "Color", values: ["Red", "Blue"] }],
        // Only the Blue combination was manually picked
        variants: [
          {
            optionValues: { Color: "Blue" },
            quantity: 3,
            costPrice: 100,
            wholeSalePrice: 300,
            isNegative: true,
          },
        ],
      },
    } as any);

    expect(result.variants).toHaveLength(1);
    expect(database.productVariant.build).toHaveBeenCalledTimes(1);
    // Full override field set lands on the variant row
    expect(database.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({
        skuCode: "SKU1-BLUE",
        costPrice: 100,
        wholeSalePrice: 300,
        isNegative: true,
      }),
    );
    // ...and its opening stock still flows into inventory + IN transfer
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3, variantId: expect.any(Number) }),
    );
  });

  it("keeps legacy behaviour (single stock row + transfer) for simple products", async () => {
    const prod = makeProduct();
    const make = makeInstanceFactory();
    database.inventory.build.mockImplementation((data: any) => make(data));
    database.transfer.build.mockImplementation((data: any) => make(data));

    const result = await service.create({
      body: { warehouseId: 1, quantity: 7, name: "Cola", code: "C1" },
    } as any);

    expect(result.variants).toBeUndefined();
    expect(database.productVariant.build).not.toHaveBeenCalled();
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: prod.id, quantity: 7 }),
    );
    expect(result.inventory).toEqual(expect.objectContaining({ quantity: 7 }));
  });

  it("rolls back when variant persistence fails", async () => {
    const tx = makeTx();
    database.sequelize.transaction.mockResolvedValue(tx);
    makeProduct();
    const make = makeInstanceFactory();
    database.productAttribute.build.mockImplementation(({ name }: any) => make({ name }));
    database.productAttributeValue.build.mockRejectedValue(new Error("db down"));

    await expect(
      service.create({
        body: {
          warehouseId: 1,
          quantity: 5,
          name: "Áo thun",
          code: "A1",
          attributes: [{ name: "Color", values: ["Red"] }],
        },
      } as any),
    ).rejects.toThrow("Product creation failed");
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
  });
});

describe("ProductService.create validation (shared with variants flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still requires warehouseId even when attributes are provided", async () => {
    const service = new ProductService();
    await expect(
      service.create({
        body: { quantity: 5, attributes: [{ name: "Color", values: ["Red"] }] },
      } as any),
    ).rejects.toThrow("warehouseId is required");
  });
});

describe("ProductService.syncProductVariants", () => {
  let service: ProductService;
  const makeTx2 = () => ({ commit: vi.fn(), rollback: vi.fn() });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx2());
    database.setting.findOne.mockResolvedValue(null);
  });

  const makeVariantInstance = (id: number, values: string[], extra: any = {}) => ({
    id,
    get: (key: string) => {
      if (key === "attributeValues") return values.map((v) => ({ get: () => v }));
      if (key === "skuCode") return `SKU1-${values.join("-")}`;
      if (key === "id") return id;
      if (key === "productId") return 1;
      return null;
    },
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    setAttributeValues: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
    ...extra,
  });

  it("manual mode: syncs attributes without backfill, removes and upserts variants", async () => {
    // Parent product
    database.product.findByPk.mockResolvedValue({ skuCode: "SKU1", code: "A1", vendorId: 1 });

    // Attribute lookup (rename check) + value list replacement
    database.productAttribute.findByPk.mockResolvedValue({ get: () => "Color" });
    database.productAttributeValue.findAll.mockResolvedValue([
      { get: (k: string) => (k === "value" ? "Red" : 11) },
      { get: (k: string) => (k === "value" ? "Blue" : 12) },
    ]);
    // productAttributeValue.findOne: with include -> option resolution; without -> syncAttribute existing
    database.productAttributeValue.findOne.mockImplementation(({ where, include }: any) => {
      if (include) {
        return Promise.resolve({ get: (k: string) => (k === "id" ? (where.value === "Red" ? 11 : 12) : where.value) });
      }
      return Promise.resolve({});
    });

    // Existing variant "Red"; variant 99 was removed in the editor
    const redVariant = makeVariantInstance(21, ["Red"]);
    database.productVariant.findAll
      .mockResolvedValueOnce([redVariant]) // upsert scan
      .mockResolvedValue([]); // deleteVariantsByValueIds (none expected)
    database.productVariant.findByPk.mockResolvedValue(makeVariantInstance(99, ["Red"]));
    database.inventory.destroy.mockResolvedValue(1);

    // New variant build ("Blue")
    let seq = 30;
    database.productVariant.build.mockImplementation((data: any) => makeVariantInstance(++seq, [], data));
    const stockRow = (data: any) => ({ dataValues: data, save: vi.fn().mockResolvedValue(undefined) });
    database.inventory.build.mockImplementation((data: any) => stockRow(data));
    database.transfer.build.mockImplementation((data: any) => stockRow(data));

    await service.syncProductVariants({
      params: { id: "1" },
      body: {
        generateAll: false,
        warehouseId: 2,
        attributes: [{ id: 5, name: "Color", values: ["Red", "Blue"] }],
        deletedAttributeIds: [],
        removedVariantIds: [99],
        variants: [
          { optionValues: { Color: "Red" }, salePrice: 200, isNegative: true },
          { optionValues: { Color: "Blue" }, quantity: 4 },
        ],
      },
    } as any);

    // Manual mode must NOT backfill combinations on its own
    expect(database.productAttribute.findAll).not.toHaveBeenCalled();

    // Existing "Red" combo updated with the new fields
    expect(redVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ salePrice: 200, isNegative: true }),
      expect.anything(),
    );

    // Missing "Blue" combo created from base SKU + opening stock
    expect(database.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 1, skuCode: "SKU1-BLUE" }),
    );
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 2, quantity: 4 }),
    );

    // Removed variant destroyed together with its stock rows
    expect(database.inventory.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { variantId: 99 }, transaction: expect.anything() }),
    );
  });
});
