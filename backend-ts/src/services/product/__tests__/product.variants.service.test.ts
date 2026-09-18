import { describe, it, expect, vi, beforeEach } from "vitest";

// Matches the variant-only ProductService (HEAD c000eb6):
// create() takes flat CreateProductParams (no { body, user } wrapper, no
// vendorScope arg) and variant rows are created via ProductVariant.create
// (not .build). Variant payloads reference attribute values by id
// (`attributeValues: [11]`) or by `{attrName: value}` maps
// (`optionValues`/`options`); the old { name, values } matrix + generateAll
// API no longer exists.
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
    "product",
    "inventory",
    "transfer",
    "setting",
    "category",
    "tag",
    "unit",
    "units",
    "warehouse",
    "order",
    "orderDetail",
    "invoice",
    "invoiceDetail",
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
    fn: vi.fn((f: string, v: any) => ({ f, v })),
    query: vi.fn().mockResolvedValue([[{ seq: 1 }], []]),
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
vi.mock("#/database/models/transfer", () => ({ default: db.transfer, Transfer: db.transfer }));
vi.mock("#/database/models/category", () => ({ default: db.category, Category: db.category }));
vi.mock("#/database/models/tag", () => ({ default: db.tag, Tag: db.tag }));
vi.mock("#/database/models/units", () => ({ default: db.units, Unit: db.units }));
vi.mock("#/database/models/order", () => ({ default: db.order, Order: db.order }));
vi.mock("#/database/models/orderDetail", () => ({ default: db.orderDetail, OrderDetail: db.orderDetail }));
vi.mock("#/database/models/invoice", () => ({ default: db.invoice, Invoice: db.invoice }));
vi.mock("#/database/models/invoiceDetail", () => ({ default: db.invoiceDetail, InvoiceDetail: db.invoiceDetail }));
vi.mock("#/database/models/setting", () => ({ default: db.setting, Setting: db.setting }));
vi.mock("#/utils/entity-cache", () => ({
  getCachedEntity: vi.fn((_model: string, _id: unknown, loader: () => Promise<unknown>) => loader()),
  setCachedEntity: vi.fn(),
  evictCachedEntity: vi.fn(),
}));
import database from "#/database";
import { ProductService } from "../index";

const makeTx = () => ({ commit: vi.fn(), rollback: vi.fn() });

const makeInstanceFactory = () => {
  let seq = 100;
  return (dataValues: Record<string, unknown>, extra: any = {}) => {
    seq += 1;
    const instance: any = {
      id: seq,
      dataValues: { id: seq, ...dataValues },
      $set: vi.fn().mockResolvedValue(undefined),
      setAttributeValues: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockImplementation(async (patch: any) => {
        Object.assign(instance.dataValues, patch);
        return instance;
      }),
      destroy: vi.fn().mockResolvedValue(undefined),
      ...extra,
    };
    instance.save = vi.fn().mockResolvedValue(instance);
    return instance;
  };
};

const attrValueRow = (id: number, attributeId: number, value: string, vendorId = 1) => ({
  id,
  attributeId,
  value,
  attribute: { vendorId },
});

describe("ProductService.create with variants", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    database.setting.findOne.mockResolvedValue({ skuTemplate: "{CODE}" });
    database.product.count.mockResolvedValue(0);
    database.product.findOne.mockResolvedValue(null);
    // Global SKU uniqueness defaults to free.
    database.productVariant.findOne.mockResolvedValue(null);
    database.orderDetail.findOne.mockResolvedValue(null);
    const stockRow = (data: any) => {
      const row: any = { dataValues: { ...data } };
      row.save = vi.fn().mockResolvedValue(row);
      row.update = vi.fn().mockResolvedValue(row);
      return row;
    };
    database.inventory.build.mockImplementation(stockRow);
    database.transfer.build.mockImplementation(stockRow);
  });

  const makeProduct = (make: ReturnType<typeof makeInstanceFactory>) => {
    const prod = make({ name: "Ao thun", type: 1, vendorId: 1 });
    database.product.create.mockResolvedValue(prod);
    return prod;
  };

  const mockCatalog = (values: ReturnType<typeof attrValueRow>[]) => {
    database.productAttributeValue.findAll.mockImplementation(async (opts: any) => {
      const raw = opts?.where?.id;
      if (raw === undefined) return values;
      const ids = (Array.isArray(raw) ? raw : [raw]).map(Number);
      return values.filter((v) => ids.includes(Number(v.id)));
    });
  };

  it("creates one variant per payload entry with generated SKUs", async () => {
    const make = makeInstanceFactory();
    const prod = makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red"), attrValueRow(12, 5, "Blue")]);
    database.productVariant.create.mockImplementation(async (fields: any) => make({ ...fields }));

    const result = await service.create({
      vendorId: 1,
      warehouseId: 1,
      name: "Ao thun",
      type: 1,
      skuCode: "SKU1",
      variants: [{ attributeValues: [11] }, { attributeValues: [12] }],
    } as any);

    expect(result.variants).toHaveLength(2);
    const skus = database.productVariant.create.mock.calls.map(([arg]: any) => arg.skuCode);
    expect(new Set(skus).size).toBe(2);
    expect(skus[0]).toContain("SKU1");
    expect(database.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({ productId: prod.id }),
      expect.anything(),
    );
    // Every variant is linked to its attribute values; no stock without quantity.
    expect(result.variants[0]).toHaveProperty("skuCode");
    expect(database.inventory.build).not.toHaveBeenCalled();
    expect(database.transfer.build).not.toHaveBeenCalled();
  });

  it("applies per-variant overrides (opening stock -> inventory + IN transfer)", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red"), attrValueRow(12, 5, "Blue")]);
    database.productVariant.create.mockImplementation(async (fields: any) => make({ ...fields }));

    await service.create({
      vendorId: 1,
      warehouseId: 2,
      name: "Ao thun",
      type: 1,
      skuCode: "SKU1",
      variants: [{ attributeValues: [11], quantity: 4, salePrice: 120, skuCode: "SKU1-RED" }],
    } as any);

    expect(database.inventory.build).toHaveBeenCalledTimes(1);
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 2, quantity: 4, variantId: expect.any(Number) }),
    );
    expect(database.transfer.build).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 4, type: "0", variantId: expect.any(Number) }),
    );
    expect(database.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({ skuCode: "SKU1-RED", salePrice: 120 }),
      expect.anything(),
    );
  });

  it("accepts explicit manual SKUs and validates their format", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Blue")]);
    database.productVariant.create.mockImplementation(async (fields: any) => make({ ...fields }));

    const result = await service.create({
      vendorId: 1,
      warehouseId: 1,
      name: "Ao thun",
      type: 1,
      skuCode: "SKU1",
      variants: [
        { attributeValues: [11], quantity: 3, costPrice: 100, wholeSalePrice: 300, isNegative: true, skuCode: "SKU1-BLUE" },
      ],
    } as any);

    expect(result.variants).toHaveLength(1);
    expect(database.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({ skuCode: "SKU1-BLUE", costPrice: 100, wholeSalePrice: 300, isNegative: true }),
      expect.anything(),
    );
    expect(database.inventory.build).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3, variantId: expect.any(Number) }),
    );
  });

  it("rejects a duplicate manual SKU (409)", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red")]);
    database.productVariant.findOne.mockResolvedValue({ id: 999 });

    await expect(
      service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        skuCode: "SKU1",
        variants: [{ attributeValues: [11], skuCode: "TAKEN-001" }],
      } as any),
    ).rejects.toThrow("already in use by another variant");
  });

  it("resolves optionValues maps through the vendor catalog", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([
      { id: 11, attributeId: 5, value: "Red", attribute: { name: "Color", vendorId: 1 } },
    ]);
    database.productVariant.create.mockImplementation(async (fields: any) => make({ ...fields }));

    const result = await service.create({
      vendorId: 1,
      warehouseId: 1,
      name: "Ao thun",
      type: 1,
      skuCode: "SKU1",
      variants: [{ optionValues: { Color: "Red" }, quantity: 1 }],
    } as any);

    expect(result.variants).toHaveLength(1);
    expect(database.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({ productId: expect.any(Number) }),
      expect.anything(),
    );
  });

  it("throws when optionValues reference unknown catalog values", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([]);

    await expect(
      service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        skuCode: "SKU1",
        variants: [{ optionValues: { Color: "Magenta" } }],
      } as any),
    ).rejects.toThrow("not ready");
  });

  it("rejects unknown attributeValue ids", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red")]);

    await expect(
      service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        skuCode: "SKU1",
        variants: [{ attributeValues: [999] }],
      } as any),
    ).rejects.toThrow("Invalid attributeValues");
  });

  it("rejects attribute values from another vendor", async () => {
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red", 9)]);

    await expect(
      service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        skuCode: "SKU1",
        variants: [{ attributeValues: [11] }],
      } as any),
    ).rejects.toThrow("Attribute value vendor mismatch");
  });

  it("rolls back when variant persistence fails", async () => {
    const tx = makeTx();
    database.sequelize.transaction.mockResolvedValue(tx);
    const make = makeInstanceFactory();
    makeProduct(make);
    mockCatalog([attrValueRow(11, 5, "Red")]);
    database.productVariant.create.mockRejectedValue(new Error("db down"));

    await expect(
      service.create({
        vendorId: 1,
        warehouseId: 1,
        name: "Ao thun",
        type: 1,
        skuCode: "SKU1",
        variants: [{ attributeValues: [11] }],
      } as any),
    ).rejects.toThrow("db down");
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
  });
});

describe("ProductService.create validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    database.setting.findOne.mockResolvedValue({ skuTemplate: "{CODE}" });
    database.product.count.mockResolvedValue(0);
    database.product.findOne.mockResolvedValue(null);
    database.productVariant.findOne.mockResolvedValue(null);
  });

  it("rejects an invalid parent barcode", async () => {
    const service = new ProductService();
    await expect(
      service.create({ vendorId: 1, warehouseId: 1, name: "X", code: "!!!", type: 1, variants: [] } as any),
    ).rejects.toThrow();
  });

  it("rejects an invalid parent SKU", async () => {
    const service = new ProductService();
    await expect(
      service.create({ vendorId: 1, warehouseId: 1, name: "X", skuCode: "bad sku!", type: 1, variants: [] } as any),
    ).rejects.toThrow();
  });
});

describe("ProductService.updateProduct (variant branch)", () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductService();
    database.sequelize.transaction.mockResolvedValue(makeTx());
    database.setting.findOne.mockResolvedValue({ skuTemplate: "{CODE}" });
    database.productVariant.findOne.mockResolvedValue(null);
    database.orderDetail.findOne.mockResolvedValue(null);
  });

  const makeVariantInstance = (id: number, extra: any = {}) => ({
    id,
    productId: 1,
    get: (key: string) => {
      const map: any = { id, productId: 1, skuCode: `SKU1-V${id}`, code: `P1-V${id}`, attributeValues: [], ...extra };
      return map[key] ?? null;
    },
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    $set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    ...extra,
  });

  const makeProduct = (overrides: any = {}) => {
    const data: any = { id: 1, vendorId: 1, type: 1, ...overrides };
    return {
      ...data,
      get: (key: string) => (data as any)[key] ?? null,
      update: vi.fn().mockImplementation(async function (this: any, fields: any) {
        Object.assign(data, fields);
        return this;
      }),
      $set: vi.fn().mockResolvedValue(undefined),
    };
  };

  it("removes deleted variants and upserts the rest", async () => {
    database.product.findByPk.mockResolvedValue(makeProduct());
    database.productVariant.count.mockResolvedValue(2);
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

    await service.updateProduct({
      id: 1,
      type: 1,
      warehouseId: 2,
      removedVariantIds: [99],
      variants: [{ id: 21, attributeValues: [11], salePrice: 200, isNegative: true }],
    } as any);

    expect(removed.destroy).toHaveBeenCalled();
    expect(redVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ salePrice: 200, isNegative: true }),
      expect.anything(),
    );
  });

  it("clears a variant barcode when an explicit blank is sent", async () => {
    database.product.findByPk.mockResolvedValue(makeProduct());
    database.productVariant.count.mockResolvedValue(1);
    database.productAttribute.findAll.mockResolvedValue([{ id: 5, name: "Color" }]);
    database.productAttributeValue.findAll.mockResolvedValue([
      { id: 11, value: "Red", attributeId: 5, attribute: { vendorId: 1 } },
    ]);
    const redVariant = makeVariantInstance(21);
    database.productVariant.findByPk.mockResolvedValue(redVariant);
    database.productVariant.findAll.mockResolvedValue([redVariant]);

    await service.updateProduct({
      id: 1,
      type: 1,
      variants: [{ id: 21, attributeValues: [11], code: "" }],
    } as any);

    expect(redVariant.update).toHaveBeenCalledWith(expect.objectContaining({ code: null }), expect.anything());
  });

  it("rejects attribute values from another vendor", async () => {
    database.product.findByPk.mockResolvedValue(makeProduct());
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

  it("blocks simple-to-variant conversion while a draft order exists", async () => {
    database.product.findByPk.mockResolvedValue(makeProduct({ type: 0 }));
    database.productVariant.count.mockResolvedValue(0);
    database.orderDetail.findOne.mockResolvedValue({ id: 1 });

    await expect(service.updateProduct({ id: 1, type: 1, variants: [] } as any)).rejects.toThrow(
      "being processed",
    );
  });
});
