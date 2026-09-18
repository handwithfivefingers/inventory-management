import { describe, it, expect, vi, beforeEach } from "vitest";

// Covers controllers/product: thin HTTP layer over the variant-only
// ProductService. The service is mocked; these tests pin request shaping
// (activeVendorId / tenant scope / warehouse resolution), response shapes
// and error forwarding to `next`.
const serviceMock = vi.hoisted(() => ({
  create: vi.fn(),
  getProducts: vi.fn(),
  search: vi.fn(),
  getProductById: vi.fn(),
  getProductVariants: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  restoreProduct: vi.fn(),
  deleteVariant: vi.fn(),
  exportExcel: vi.fn(),
  importTemplateExcel: vi.fn(),
  importExcel: vi.fn(),
}));

const db = vi.hoisted(() => ({
  warehouse: { findByPk: vi.fn() },
}));

vi.mock("#/services/product", () => ({ ProductService: vi.fn(() => serviceMock) }));
vi.mock("#/database", () => ({ default: db }));

import { ProductController } from "../index";

const res = () => {
  const r: any = {};
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  r.send = vi.fn().mockReturnValue(r);
  r.setHeader = vi.fn().mockReturnValue(r);
  return r;
};
const next = vi.fn();

const authedReq = (extra: any = {}) =>
  ({
    activeVendorId: 1,
    tenant: { scope: [1] },
    query: { warehouseId: 1 },
    body: {},
    params: {},
    headers: {},
    ...extra,
  }) as any;

describe("ProductController", () => {
  let controller: ProductController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ProductController();
    db.warehouse.findByPk.mockResolvedValue({ vendorId: 1 });
  });

  describe("create", () => {
    it("creates with merged body + warehouse + vendor ids", async () => {
      serviceMock.create.mockResolvedValue({ product: { id: 1 } });
      const r = res();

      await controller.create(authedReq({ body: { name: "Cola", type: 1, variants: [] } }), r, next);

      expect(serviceMock.create).toHaveBeenCalledWith({ name: "Cola", type: 1, variants: [], warehouseId: 1, vendorId: 1 });
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json).toHaveBeenCalledWith({ data: { product: { id: 1 } } });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards to next when warehouseId is missing", async () => {
      const r = res();

      await controller.create(authedReq({ query: {}, body: { name: "Cola" } }), r, next);

      expect(serviceMock.create).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("forwards service failures to next", async () => {
      serviceMock.create.mockRejectedValue(new Error("db down"));

      await controller.create(authedReq({ body: { name: "Cola" } }), res(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getProducts", () => {
    it("returns total + rows", async () => {
      serviceMock.getProducts.mockResolvedValue({ count: 2, rows: [{ id: 1 }] });
      const r = res();

      await controller.getProducts(authedReq(), r, next);

      expect(r.json).toHaveBeenCalledWith({ total: 2, data: [{ id: 1 }] });
    });

    it("forwards failures to next", async () => {
      serviceMock.getProducts.mockRejectedValue(new Error("db down"));

      await controller.getProducts(authedReq(), res(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("search", () => {
    it("returns the exact-match envelope on barcode scans", async () => {
      serviceMock.search.mockResolvedValue({ exact_match: true, context: "POS", data: { id: 1 } });
      const r = res();

      await controller.search(authedReq({ body: { query: "123", context: "POS" } }), r, next);

      expect(serviceMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: "123", context: "POS" }),
        [1],
      );
      expect(r.json).toHaveBeenCalledWith({ exact_match: true, context: "POS", data: { id: 1 } });
    });

    it("returns the paginated envelope otherwise", async () => {
      serviceMock.search.mockResolvedValue({ context: "ADMIN", data: [], total_count: 0, page: 1, limit: 20 });
      const r = res();

      await controller.search(authedReq({ body: {} }), r, next);

      expect(r.json).toHaveBeenCalledWith(
        expect.objectContaining({ exact_match: false, total_count: 0, page: 1, limit: 20 }),
      );
    });

    it("forwards failures to next", async () => {
      serviceMock.search.mockRejectedValue(new Error("db down"));

      await controller.search(authedReq({ body: {} }), res(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getProductById", () => {
    it("passes id + warehouse + vendor with scope", async () => {
      serviceMock.getProductById.mockResolvedValue({ id: 7 });
      const r = res();

      await controller.getProductById(authedReq({ params: { id: "7" } }), r, next);

      expect(serviceMock.getProductById).toHaveBeenCalledWith(
        expect.objectContaining({ id: "7", warehouseId: 1 }),
        [1],
      );
      expect(r.json).toHaveBeenCalledWith({ data: { id: 7 } });
    });

    it("forwards failures to next", async () => {
      serviceMock.getProductById.mockRejectedValue(new Error("nope"));

      await controller.getProductById(authedReq({ params: { id: "7" } }), res(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getProductVariants", () => {
    it("returns total + rows", async () => {
      serviceMock.getProductVariants.mockResolvedValue({ count: 1, rows: [{ id: 21 }] });
      const r = res();

      await controller.getProductVariants(authedReq({ params: { id: "1" } }), r, next);

      expect(r.json).toHaveBeenCalledWith({ total: 1, data: [{ id: 21 }] });
    });
  });

  describe("updateProduct", () => {
    it("updates with merged params", async () => {
      serviceMock.updateProduct.mockResolvedValue(true);
      const r = res();

      await controller.updateProduct(authedReq({ params: { id: "1" }, body: { name: "New" } }), r, next);

      expect(serviceMock.updateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ id: "1", name: "New", warehouseId: 1, vendorId: 1 }),
      );
      expect(r.json).toHaveBeenCalledWith({ data: true });
    });

    it("forwards to next when warehouseId is missing", async () => {
      await controller.updateProduct(authedReq({ query: {}, params: { id: "1" }, body: {} }), res(), next);

      expect(serviceMock.updateProduct).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("delete / restore / deleteVariant", () => {
    it("deletes a product", async () => {
      serviceMock.deleteProduct.mockResolvedValue({ message: "ok", id: 1 });
      const r = res();

      await controller.deleteProduct(authedReq({ params: { id: "1" } }), r, next);

      expect(r.json).toHaveBeenCalledWith({ data: { message: "ok", id: 1 } });
    });

    it("restores a product", async () => {
      serviceMock.restoreProduct.mockResolvedValue({ message: "ok", id: 1 });
      const r = res();

      await controller.restoreProduct(authedReq({ params: { id: "1" } }), r, next);

      expect(r.json).toHaveBeenCalledWith({ data: { message: "ok", id: 1 } });
    });

    it("deletes a variant", async () => {
      serviceMock.deleteVariant.mockResolvedValue({ message: "ok", id: 21 });
      const r = res();

      await controller.deleteVariant(authedReq({ params: { id: "1", variantId: "21" } }), r, next);

      expect(r.json).toHaveBeenCalledWith({ data: { message: "ok", id: 21 } });
    });

    it("forwards failures to next", async () => {
      serviceMock.deleteProduct.mockRejectedValue(new Error("db down"));

      await controller.deleteProduct(authedReq({ params: { id: "1" } }), res(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("excel", () => {
    it("streams the export workbook with download headers", async () => {
      serviceMock.exportExcel.mockResolvedValue({ buffer: Buffer.from("x"), filename: "products-2026-01-01.xlsx" });
      const r = res();

      await controller.exportExcel(authedReq(), r, next);

      expect(r.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(r.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="products-2026-01-01.xlsx"',
      );
      expect(r.send).toHaveBeenCalled();
    });

    it("streams the import template", async () => {
      serviceMock.importTemplateExcel.mockResolvedValue(Buffer.from("t"));
      const r = res();

      await controller.importTemplate(authedReq(), r, next);

      expect(r.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="product-import-template.xlsx"');
      expect(r.send).toHaveBeenCalled();
    });

    it("returns the import report", async () => {
      serviceMock.importExcel.mockResolvedValue({ created: 1, updated: 0, failed: 0, errors: [] });
      const r = res();

      await controller.importExcel(authedReq(), r, next);

      expect(r.json).toHaveBeenCalledWith({ data: { created: 1, updated: 0, failed: 0, errors: [] } });
    });
  });
});
