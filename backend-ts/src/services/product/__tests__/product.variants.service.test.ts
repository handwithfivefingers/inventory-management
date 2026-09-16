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
    "bulkCreate",
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
    "warehouse",
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
vi.mock("#/database/models/product", () => ({ default: db.product, Product: db.product }));
vi.mock("#/database/models/productVariant", () => ({ default: db.productVariant, ProductVariant: db.productVariant }));
vi.mock("#/database/models/productAttribute", () => ({ default: db.productAttribute, ProductAttribute: db.productAttribute }));
vi.mock("#/database/models/productAttributeValue", () => ({
  default: db.productAttributeValue,
  ProductAttributeValue: db.productAttributeValue,
}));
vi.mock("#/database/models/inventory", () => ({ default: db.inventory, Inventory: db.inventory }));
vi.mock("#/database/models/category", () => ({ default: db.category, Category: db.category }));
vi.mock("#/database/models/tag", () => ({ default: db.tag, Tag: db.tag }));
vi.mock("#/database/models/units", () => ({ default: db.units, Unit: db.units }));
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
      $set: vi.fn().mockResolvedValue(undefined),
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
  // Registry of materialized attribute values (by auto-assigned id) so the
  // vendor-validation reads in create() echo realistic rows.
  const valueById = new Map<number, any>();
  const trackBuiltValue = (row: any) => {
    valueById.set(Number(row.id), row);
    return row;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    valueById.clear();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    database.setting.findOne.mockResolvedValue(null);
    database.product.count.mockResolvedValue(0);
    database.product.findOne.mockResolvedValue(null);
    // S1: tenant checks resolve the warehouse (platform-admin scope here).
    database.warehouse.findByPk.mockResolvedValue({ vendorId: 1 });
    // Matrix materialization always creates fresh rows in these tests.
    database.productAttribute.findOne.mockResolvedValue(null);
    database.productAttributeValue.findOne.mockResolvedValue(null);
    database.productAttributeValue.findAll.mockImplementation(async (opts: any) => {
      const raw = opts?.where?.id;
      const ids = (Array.isArray(raw) ? raw : raw !== undefined ? [raw] : []).map(Number);
      return ids
        .map((id: number) => valueById.get(id))
        .filter(Boolean)
        .map((row: any) => ({
          id: row.id,
          attributeId: row.dataValues.attributeId,
          value: row.dataValues.value,
          attribute: { vendorId: 1 },
        }));
    });
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
    database.productAttributeValue.build.mockImplementation((data: any) =>
      trackBuiltValue(make({ ...data })),
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
      user: { vendorIds: [1] },
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
    database.productAttributeValue.build.mockImplementation((data: any) =>
      trackBuiltValue(make({ ...data })),
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
      user: { vendorIds: [1] },
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
    database.productAttributeValue.build.mockImplementation((data: any) =>
      trackBuiltValue(make({ ...data })),
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
      user: { vendorIds: [1] },
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
      user: { vendorIds: [1] },
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
        user: { vendorIds: [1] },
      } as any),
    ).rejects.toThrow("db down");
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
        body: { vendorId: 1, quantity: 5, attributes: [{ name: "Color", values: ["Red"] }] },
        user: { vendorIds: [1] },
      } as any),
    ).rejects.toThrow("warehouseId is required");
  });
});

describe("ProductService.updateProduct (variant branch)", () => {
  let service: ProductService;
  const makeTx2 = () => ({ commit: vi.fn(), rollback: vi.fn() });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx2());
    database.setting.findOne.mockResolvedValue(null);
    database.warehouse.findByPk.mockResolvedValue({ vendorId: 1 });
  });

  const makeVariantInstance = (id: number, extra: any = {}) => ({
    id,
    productId: 1,
    get: (key: string) => {
      if (key === "id") return id;
      if (key === "productId") return 1;
      if (key === "skuCode") return `SKU1-V${id}`;
      if (key === "code") return `P1-V${id}`;
      if (key === "attributeValues") return [];
      return (extra as any)[key] ?? null;
    },
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    $set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
    ...extra,
  });

  const makeProduct = (overrides: any = {}) => {
    const data: any = { id: 1, vendorId: 1, code: "P1", skuCode: "SKU1", type: 1, ...overrides };
    return {
      ...data,
      id: 1,
      get: (key: string) => (data as any)[key] ?? null,
      update: vi.fn().mockImplementation(function (this: any, fields: any) {
        Object.assign(data, fields);
        return Promise.resolve(this);
      }),
      $set: vi.fn().mockResolvedValue(undefined),
    };
  };

  it("removes deleted variants and upserts the rest with barcodes", async () => {
    const product = makeProduct();
    database.product.findByPk.mockResolvedValue(product);
    database.productVariant.count.mockResolvedValue(2);
    database.product.findOne.mockResolvedValue(null); // no code/sku clash
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([
      { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 1 } },
      { id: 12, value: "Blue", attributeId: 5, attribute: { vendorId: 1 } },
    ]);

    const removed = makeVariantInstance(99);
    const redVariant = makeVariantInstance(21);
    database.productVariant.findByPk.mockImplementation(async (id: number) => {
      if (Number(id) === 99) return removed;
      if (Number(id) === 21) return redVariant;
      return null;
    });
    database.productVariant.findAll.mockResolvedValue([redVariant]);
    database.inventory.destroy.mockResolvedValue(1);
    database.product.findOne
      .mockResolvedValueOnce(null) // duplicate guard
      .mockResolvedValueOnce({ id: 1 }); // refreshed product

    let seq = 30;
    database.productVariant.build.mockImplementation((data: any) => makeVariantInstance(++seq, data));
    const stockRow = (data: any) => ({ dataValues: data, save: vi.fn().mockResolvedValue(undefined) });
    database.inventory.build.mockImplementation((data: any) => stockRow(data));
    database.transfer.build.mockImplementation((data: any) => stockRow(data));

    await service.updateProduct({
      params: { id: "1" },
      body: {
        type: 1,
        name: "Ao thun",
        removedVariantIds: [99],
        variants: [
          { variantId: 21, attributeValues: [11], code: "P1-RED", salePrice: 200, isNegative: true },
          { attributeValues: [12], quantity: 4 },
        ],
      },
      query: { warehouseId: "2" },
      user: { vendorIds: [1] },
    } as any);

    // Removed variant soft-deleted (paranoid); inventory history is kept
    expect(removed.destroy).toHaveBeenCalled();
    expect(database.inventory.destroy).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { variantId: 99 } }),
    );

    // Existing variant updated with manual barcode kept
    expect(redVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ code: "P1-RED", salePrice: 200, isNegative: true }),
      expect.anything(),
    );

    // New Blue variant auto-extends the parent barcode (P1-...)
    expect(database.productVariant.build).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 1, code: expect.stringMatching(/^P1-/) }),
    );
  });

  it("clears a variant barcode when an explicit blank is sent", async () => {
    const product = makeProduct();
    database.product.findByPk.mockResolvedValue(product);
    database.productVariant.count.mockResolvedValue(1);
    database.product.findOne.mockResolvedValue(null);
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([
      { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 1 } },
    ]);
    const redVariant = makeVariantInstance(21);
    database.productVariant.findByPk.mockResolvedValue(redVariant);
    database.productVariant.findAll.mockResolvedValue([redVariant]);
    database.product.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1 });

    await service.updateProduct({
      params: { id: "1" },
      body: { type: 1, variants: [{ variantId: 21, attributeValues: [11], code: "" }] },
      user: { vendorIds: [1] },
    } as any);

    expect(redVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ code: null }),
      expect.anything(),
    );
  });

  it("rejects attribute values from another vendor", async () => {
    const product = makeProduct();
    database.product.findByPk.mockResolvedValue(product);
    database.productVariant.count.mockResolvedValue(0);
    database.product.findOne.mockResolvedValue(null);
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([
      { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 9 } },
    ]);
    database.productVariant.findAll.mockResolvedValue([]);

    await expect(
      service.updateProduct({
        params: { id: "1" },
        body: { type: 1, variants: [{ attributeValues: [11] }] },
        user: { vendorIds: [1] },
      } as any),
    ).rejects.toThrow("Attribute value vendor mismatch");
  });
});
