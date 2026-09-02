import { describe, it, expect, vi, beforeEach } from "vitest";

// Raw-table mocks — service uses Product / Inventory / ProductVariant / OrderDetail directly
const productMock = vi.hoisted(() => ({
  findByPk: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
}));
const productVariantMock = vi.hoisted(() => ({
  findByPk: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
}));
const inventoryMock = vi.hoisted(() => ({
  findOne: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
}));
const orderDetailMock = vi.hoisted(() => ({
  build: vi.fn(),
  findAll: vi.fn(),
  destroy: vi.fn(),
  create: vi.fn(),
}));

// Keep database mock only for sequelize + transfer (used by TransferService)
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
  const database: any = {};
  for (const name of ["order", "transfer", "financialRecord", "setting", "orderDetail", "inventory", "product", "productVariant"]) {
    database[name] = makeModelMock();
  }
  database.sequelize = {
    transaction: vi.fn(),
    literal: vi.fn((v: any) => v),
    col: vi.fn((v: any) => v),
  };
  return database;
});

vi.mock("#/database", () => ({ default: db }));
vi.mock("#/database/models/product", () => ({ default: productMock, Product: productMock }));
vi.mock("#/database/models/productVariant", () => ({ default: productVariantMock, ProductVariant: productVariantMock }));
vi.mock("#/database/models/inventory", () => ({ default: inventoryMock, Inventory: inventoryMock }));
vi.mock("#/database/models/orderDetail", () => ({ default: orderDetailMock, OrderDetail: orderDetailMock }));

import Product from "#/database/models/product";
import ProductVariant from "#/database/models/productVariant";
import Inventory from "#/database/models/inventory";
import OrderDetail from "#/database/models/orderDetail";
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
      // simple product import (type 0) skips Product lookup, directly increments inventory
      (Inventory as any).increment.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        warehouseId: 2,
        quantity: 5,
        transaction: tx,
        type: "0",
      });

      expect(Inventory.increment).toHaveBeenCalledWith(
        "quantity",
        expect.objectContaining({
          by: 5,
          where: { productId: 1, warehouseId: 2, variantId: null },
        }),
      );
    });

    it("targets the variant inventory row when variantId is given", async () => {
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
        get: (k: string) => (k === "name" ? "T-Shirt" : false),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      (Inventory as any).findOne.mockResolvedValue({ get: () => 10 } as any);
      (Inventory as any).decrement.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        variantId: 33,
        warehouseId: 2,
        quantity: 4,
        transaction: tx,
        type: "1",
      });

      const where = (Inventory as any).decrement.mock.calls[0][1].where;
      // C2: the availability check is part of the atomic write - the WHERE
      // clause must require quantity >= requested.
      expect(where).toEqual({
        productId: 1,
        warehouseId: 2,
        variantId: 33,
        quantity: { [require("sequelize").Op.gte]: 4 },
      });
      // Stock guard reads the same variant-specific row (isolated to variant)
      expect(Inventory.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 1, warehouseId: 2, variantId: 33 } }),
      );
      // isolated: variant.isNegative governs, product.isNegative ignored
      expect(ProductVariant.findByPk).toHaveBeenCalledWith(33, expect.anything());
    });

    it("blocks the sale when the variant has insufficient stock", async () => {
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
        get: (k: string) => (k === "name" ? "T-Shirt" : false),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      // Row exists but the atomic decrement matches 0 rows -> oversell blocked
      (Inventory as any).findOne.mockResolvedValue({ get: () => 3 } as any);
      (Inventory as any).decrement.mockResolvedValue([0]);

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

      // The guard lives inside the UPDATE's WHERE clause
      const where = (Inventory as any).decrement.mock.calls[0][1].where;
      expect(where.quantity).toEqual({ [require("sequelize").Op.gte]: 5 });
    });

    it("reports a missing inventory row distinctly from insufficient stock", async () => {
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "Ghost",
        isNegative: false,
        get: (k: string) => (k === "name" ? "Ghost" : false),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "GHOST-XL"),
      });
      (Inventory as any).findOne.mockResolvedValue(null);

      await expect(
        service.updateInventory({
          productId: 1,
          variantId: 33,
          warehouseId: 2,
          quantity: 5,
          transaction: tx,
          type: "1",
        }),
      ).rejects.toThrow("Inventory not found for variant 33");

      expect(Inventory.decrement).not.toHaveBeenCalled();
    });

    it("skips the stock guard when the variant itself allows negative stock", async () => {
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
        get: (k: string) => (k === "name" ? "T-Shirt" : false),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? true : "TS-RED-XL"),
      });
      (Inventory as any).decrement.mockResolvedValue([1]);

      await service.updateInventory({
        productId: 1,
        variantId: 33,
        warehouseId: 2,
        quantity: 5,
        transaction: tx,
        type: "1",
      });

      expect(Inventory.decrement).toHaveBeenCalledWith(
        "quantity",
        expect.objectContaining({ by: 5 }),
      );
      // isolated check: Product.isNegative is NOT consulted for variant rows
      // so Inventory.findOne must NOT be called when variant allows negative
      expect(Inventory.findOne).not.toHaveBeenCalled();
    });

    it("throws when the target inventory row does not exist", async () => {
      (Inventory as any).increment.mockResolvedValue([0]);

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
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "Cola",
        isNegative: true,
        get: (k: string) => (k === "name" ? "Cola" : true),
      });
      (Inventory as any).decrement.mockResolvedValue([1]);

      await expect(
        service.updateInventory({
          productId: 1,
          warehouseId: 2,
          quantity: 100,
          transaction: tx,
          type: "1",
        }),
      ).resolves.toBeUndefined();
      expect(Inventory.findOne).not.toHaveBeenCalled();
    });

    it("isolated: variant with isNegative=false blocks even if product allows negative", async () => {
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: true, // parent allows, but variant does not
        get: (k: string) => (k === "name" ? "T-Shirt" : k === "isNegative" ? true : "T-Shirt"),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      (Inventory as any).findOne.mockResolvedValue({ get: () => 2 } as any);
      (Inventory as any).decrement.mockResolvedValue([0]);

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
    });
  });

  describe("updateProductQuantity", () => {
    it("bumps only the product counter for simple products", async () => {
      // The service uses atomic increment(); Sequelize resolves with
      // [affectedCount, affectedRows].
      (Product as any).increment.mockResolvedValue([{ sold: 7 }]);
      (ProductVariant as any).increment.mockResolvedValue([{}]);

      await service.updateProductQuantity({ quantity: 2, productId: 1, transaction: tx });

      expect(Product.increment).toHaveBeenCalledWith(
        "sold",
        { by: 2, where: { id: 1 }, transaction: tx },
      );
      expect(ProductVariant.increment).not.toHaveBeenCalled();
    });

    it("also bumps the variant counter when a variant sold", async () => {
      (Product as any).increment.mockResolvedValue([{ sold: 7 }]);
      (ProductVariant as any).increment.mockResolvedValue([{ sold: 3 }]);

      await service.updateProductQuantity({
        quantity: 2,
        productId: 1,
        variantId: 33,
        transaction: tx,
      });

      expect(ProductVariant.increment).toHaveBeenCalledWith(
        "sold",
        { by: 2, where: { id: 33 }, transaction: tx },
      );
    });

    it("throws when the product increment affects no rows", async () => {
      (Product as any).increment.mockResolvedValue([]);
      await expect(
        service.updateProductQuantity({ quantity: 2, productId: 999, transaction: tx }),
      ).rejects.toThrow("Product not found");
    });
  });

  describe("createOrderDetails", () => {
    it("records the variant on the order detail and propagates it downstream", async () => {
      const orderDetailInstance = { save: vi.fn().mockResolvedValue(undefined) };
      (OrderDetail as any).build.mockReturnValue(orderDetailInstance);
      (Product as any).findByPk.mockResolvedValue({
        id: 1,
        name: "T-Shirt",
        isNegative: false,
        get: (k: string) => (k === "name" ? "T-Shirt" : false),
      });
      (ProductVariant as any).findByPk.mockResolvedValue({
        get: (key: string) => (key === "isNegative" ? false : "TS-RED-XL"),
      });
      (Inventory as any).findOne.mockResolvedValue({ get: () => 10 } as any);
      (Inventory as any).decrement.mockResolvedValue([1]);
      (database as any).transfer.build.mockReturnValue({
        save: vi.fn().mockResolvedValue(undefined),
      });

      (Product as any).increment.mockResolvedValue([{ sold: 1 }]);
      (ProductVariant as any).increment.mockResolvedValue([{ sold: 1 }]);

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

      expect(OrderDetail.build).toHaveBeenCalledWith(
        expect.objectContaining({ variantId: 33 }),
      );
      // Transfer created with the variant pointer
      expect((database as any).transfer.build).toHaveBeenCalledWith(
        expect.objectContaining({ variantId: 33, type: "1" }),
      );
    });
  });
});
