import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Products list – soft-delete wiring.
// Logic: a product must be removable from the list, but the backend keeps the
// row (paranoid soft-delete) so orders / stock / finance history that
// references it still shows its value.
// ---------------------------------------------------------------------------

const ROUTE_FILE = path.resolve(__dirname, "../index.tsx");
const SERVICE_FILE = path.resolve(__dirname, "../../../../action.server/products.service.ts");
const BACKEND_ROUTER_FILE = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/routers/product/index.ts",
);
const BACKEND_PRODUCT_MODEL = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/database/models/product.ts",
);
const BACKEND_VARIANT_MODEL = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/database/models/productVariant.ts",
);
const BACKEND_ORDER_DETAIL_MODEL = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/database/models/orderDetail.ts",
);
const BACKEND_INVENTORY_MODEL = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/database/models/inventory.ts",
);
const BACKEND_TRANSFER_MODEL = path.resolve(
  __dirname,
  "../../../../../../backend-ts/src/database/models/transfer.ts",
);

const readSource = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

describe("products list – delete action (client)", () => {
  const source = readSource(ROUTE_FILE);

  it("handles an explicit delete intent in the route action", () => {
    expect(source).toContain('intent") === "delete"');
  });

  it("delegates the delete to productService.deleteProduct", () => {
    expect(source).toContain("productService.deleteProduct");
  });

  it("rejects a delete without an id", () => {
    expect(source).toContain("Missing id");
  });

  it("preserves the variantOf branch used by the order flow", () => {
    expect(source).toContain('form.get("variantOf")');
    expect(source).toContain("productService.getProductVariants");
  });
});

describe("products list – delete icon (client UI)", () => {
  const source = readSource(ROUTE_FILE);

  it("renders a delete icon in the table actions column", () => {
    expect(source).toMatch(/name="trash/);
  });

  it("guards the delete button with the DELETE product permission", () => {
    expect(source).toContain('permission="DELETE"');
    expect(source).toContain("MODULE_ENUM.product");
  });

  it("asks for confirmation before deleting", () => {
    expect(source).toContain("common.confirmDelete");
  });

  it("does not trigger row navigation when the delete button is clicked", () => {
    expect(source).toContain("stopPropagation");
  });
});

describe("products service – delete endpoint (client)", () => {
  const source = readSource(SERVICE_FILE);

  it("exposes deleteProduct against DELETE /products/:id", () => {
    expect(source).toContain("deleteProduct");
    expect(source).toContain("http.delete");
    expect(source).toContain("${API_PATH.products}/${id}");
  });
});

describe("products router – soft-delete keeps related records (backend)", () => {
  it("registers DELETE /:id for soft-delete (not hard destroy)", () => {
    const source = readSource(BACKEND_ROUTER_FILE);
    expect(source).toContain("Router.delete(");
    expect(source).toContain("deleteProduct");
    expect(source).toMatch(/Soft-delete|paranoid/);
  });

  it("keeps product and variant rows via paranoid mode", () => {
    expect(readSource(BACKEND_PRODUCT_MODEL)).toContain("paranoid: true");
    expect(readSource(BACKEND_VARIANT_MODEL)).toContain("paranoid: true");
  });

  it("never cascades product removal into history tables", () => {
    for (const file of [BACKEND_ORDER_DETAIL_MODEL, BACKEND_INVENTORY_MODEL, BACKEND_TRANSFER_MODEL]) {
      const source = readSource(file);
      expect(source, `${path.basename(file)} must not cascade from product`).not.toMatch(
        /BelongsTo\(\(\) => Product[^)]*onDelete:\s*['"]CASCADE['"]/,
      );
    }
  });
});

describe("products resource – unified search branch (client)", () => {
  const source = readSource(ROUTE_FILE);

  it("routes context=POS|ADMIN fetcher submits to the unified search", () => {
    expect(source).toContain('form.get("context")');
    expect(source).toContain("productService.searchProducts");
  });

  it("forwards the scan query and warehouse scope for POS stock", () => {
    expect(source).toContain("warehouse_id");
    expect(source).toContain("query");
  });

  it("paginates unified searches with page/limit", () => {
    expect(source).toContain("page");
    expect(source).toContain("limit");
  });

  it("keeps the legacy s/variantOf branches for existing flows", () => {
    expect(source).toContain('form.get("s")');
    expect(source).toContain('form.get("variantOf")');
  });
});

describe("products service – unified search endpoint (client)", () => {
  const source = readSource(SERVICE_FILE);

  it("exposes searchProducts against POST /products/search", () => {
    expect(source).toContain("searchProducts");
    expect(source).toContain("`${API_PATH.products}/search`");
    expect(source).toContain("http.post");
  });
});
