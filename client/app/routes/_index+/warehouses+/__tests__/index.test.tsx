import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routeFile = path.resolve(__dirname, "../index.tsx");
const serviceFile = path.resolve(
  __dirname,
  "../../../../action.server/warehouse.service.ts"
);

describe("warehouses list deletion", () => {
  const routeSource = fs.readFileSync(routeFile, "utf-8");
  const serviceSource = fs.readFileSync(serviceFile, "utf-8");

  it("submits a delete action through the warehouse service", () => {
    expect(serviceSource).toContain("deleteWarehouse");
    expect(serviceSource).toContain('delete(API_PATH.warehouse + "/" + id)');
    expect(routeSource).toContain("warehouseService.deleteWarehouse");
    expect(routeSource).toContain('method: "post"');
  });

  it("protects the main warehouse in the UI and scopes deletion to DELETE permission", () => {
    expect(routeSource).toContain('permission="DELETE"');
    expect(routeSource).toContain("disabled={warehouse.isMain}");
    expect(routeSource).toContain("warehouses.mainCannotDelete");
  });

  it("shows the API rejection reason and stops row navigation when deleting", () => {
    expect(routeSource).toContain(
      'response.error || t("warehouses.deleteFailed")'
    );
    expect(routeSource).toContain("event.stopPropagation()");
  });
});
