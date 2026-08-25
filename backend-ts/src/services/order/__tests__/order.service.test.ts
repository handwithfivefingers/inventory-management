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
    "order",
    "orderDetail",
    "inventory",
    "product",
    "productVariant",
    "transfer",
    "financialRecord",
    "setting",
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
import OrderService from "../index";

describe("OrderService stock handling with product variants", () => {
  let service: OrderService;
  const tx = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderService();
  });

  describe("updateInventory", () => {
    it("increments the legacy product-level row (variantId NULL) for simple products", async () => {
      database.product.findByPk.mockResolvedValue({ id: 1, name: "Cola" });
      database.inventory.increment.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        warehouseId: 2,
        quantity: 5,
        transaction: tx,
        type: "0",
      });

      expect(database.inventory.increment).toHaveBeenCalledWith(
        "quantity",
        expect.objectContaining({
          by: 5,
          where: { productId: 1, warehouseId: 2, variantId: null },
        }),
      );
    });

    it("targets the variant inventory row when variantId is given", async () => {
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
      });
      database.productVariant.findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      database.inventory.findOne.mockResolvedValue({ get: () => 10 });
      database.inventory.decrement.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        variantId: 33,
        warehouseId: 2,
        quantity: 4,
        transaction: tx,
        type: "1",
      });

      const where = database.inventory.decrement.mock.calls[0][1].where;
      expect(where).toEqual({ productId: 1, warehouseId: 2, variantId: 33 });
      // Stock guard reads the same variant-specific row
      expect(database.inventory.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 1, warehouseId: 2, variantId: 33 } }),
      );
    });

    it("blocks the sale when the variant has insufficient stock", async () => {
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
      });
      database.productVariant.findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      database.inventory.findOne.mockResolvedValue({ get: () => 3 });

      await expect(
        service.updateInventory({
          productId: 1,
          variantId: 33,
          warehouseId: 2,
          quantity: 5,
          transaction: tx,
          type: "1",
        }),
      ).rejects.toThrow('Insufficient stock for product "T-Shirt [TS-RED-XL]"');

      expect(database.inventory.decrement).not.toHaveBeenCalled();
    });

    it("skips the stock guard when the variant itself allows negative stock", async () => {
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
      });
      database.productVariant.findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? true : "TS-RED-XL"),
      });
      database.inventory.findOne.mockResolvedValue({ get: () => 1 });
      database.inventory.decrement.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        variantId: 33,
        warehouseId: 2,
        quantity: 5,
        transaction: tx,
        type: "1",
      });

      expect(database.inventory.decrement).toHaveBeenCalledWith(
        "quantity",
        expect.objectContaining({ by: 5 }),
      );
    });

    it("throws when the target inventory row does not exist", async () => {
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "Cola",
        isNegative: false,
      });
      database.inventory.findOne.mockResolvedValue({ get: () => 10 });
      database.inventory.increment.mockResolvedValue([0]);

      await expect(
        service.updateInventory({
          productId: 1,
          warehouseId: 2,
          quantity: 5,
          transaction: tx,
          type: "0",
        }),
      ).rejects.toThrow("Inventory not found");
    });

    it("skips the guard when the product allows negative stock", async () => {
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "Cola",
        isNegative: true,
      });
      database.inventory.decrement.mockResolvedValue([1]);

      await expect(
        service.updateInventory({
          productId: 1,
          warehouseId: 2,
          quantity: 100,
          transaction: tx,
          type: "1",
        }),
      ).resolves.toBeUndefined();
      expect(database.inventory.findOne).not.toHaveBeenCalled();
    });
  });

  describe("updateProductQuantity", () => {
    it("bumps only the product counter for simple products", async () => {
      const prod = { sold: 5, save: vi.fn().mockResolvedValue(undefined) };
      database.product.findByPk.mockResolvedValue(prod);

      await service.updateProductQuantity({ quantity: 2, productId: 1, transaction: tx });

      expect(prod.sold).toBe(7);
      expect(prod.save).toHaveBeenCalled();
      expect(database.productVariant.findByPk).not.toHaveBeenCalled();
    });

    it("also bumps the variant counter when a variant sold", async () => {
      const prod = { sold: 5, save: vi.fn().mockResolvedValue(undefined) };
      const variant = {
        get: () => 1,
        save: vi.fn().mockResolvedValue(undefined),
      };
      database.product.findByPk.mockResolvedValue(prod);
      database.productVariant.findByPk.mockResolvedValue(variant);

      await service.updateProductQuantity({
        quantity: 2,
        productId: 1,
        variantId: 33,
        transaction: tx,
      });

      expect(prod.sold).toBe(7);
      expect(variant.sold).toBe(3);
    });
  });

  describe("createOrderDetails", () => {
    it("records the variant on the order detail and propagates it downstream", async () => {
      const orderDetailInstance = { save: vi.fn().mockResolvedValue(undefined) };
      database.orderDetail.build.mockReturnValue(orderDetailInstance);
      database.product.findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
      });
      database.productVariant.findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      database.inventory.findOne.mockResolvedValue({ get: () => 10 });
      database.inventory.decrement.mockResolvedValue([1]);
      database.transfer.build.mockReturnValue({
        save: vi.fn().mockResolvedValue(undefined),
      });

      const prod = {
        sold: 0,
        get: () => 0,
        save: vi.fn().mockResolvedValue(undefined),
      };
      const variant = {
        get: () => 0,
        save: vi.fn().mockResolvedValue(undefined),
      };
      database.product.findByPk
        .mockResolvedValueOnce({ id: 1, name: "T-Shirt", isNegative: true })
        .mockResolvedValue(prod);
      database.productVariant.findByPk.mockResolvedValue(variant);

      await service.createOrderDetails({
        name: "T-Shirt Red XL",
        quantity: 1,
        productId: 1,
        variantId: 33,
        warehouseId: 2,
        orderId: 9,
        price: 100,
        buyPrice: 80,
        note: "",
        type: "1",
        transaction: tx,
      });

      expect(database.orderDetail.build).toHaveBeenCalledWith(
        expect.objectContaining({ variantId: 33 }),
      );
      // Transfer created with the variant pointer
      expect(database.transfer.build).toHaveBeenCalledWith(
        expect.objectContaining({ variantId: 33, type: "1" }),
      );
    });
  });
});
