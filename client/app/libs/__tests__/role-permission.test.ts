import { describe, it, expect } from "vitest";
import { MODULES } from "~/constants/modules";
import {
  buildEmptyMatrix,
  flatPermissionsToMatrix,
  isModuleFullyGranted,
  matrixToGrants,
  matrixToModuleNames,
  roleFormSchema,
} from "~/libs/role-permission";
import type { IPermission } from "~/types/user";

const perm = (name: string, method: IPermission["method"]): IPermission => ({ name, method }) as IPermission;

describe("buildEmptyMatrix", () => {
  it("covers every known module with all-false flags", () => {
    const matrix = buildEmptyMatrix();

    expect(Object.keys(matrix).sort()).toEqual(MODULES.map((m) => m.key).sort());
    for (const flags of Object.values(matrix)) {
      expect(flags).toEqual({ C: false, R: false, U: false, D: false });
    }
  });
});

describe("flatPermissionsToMatrix", () => {
  it("maps flat rows onto CRUD flags", () => {
    const { matrix, unknownModules } = flatPermissionsToMatrix([
      perm("product", "CREATE"),
      perm("product", "READ"),
      perm("order", "DELETE"),
    ]);

    expect(matrix.product).toEqual({ C: true, R: true, U: false, D: false });
    expect(matrix.order).toEqual({ C: false, R: false, U: false, D: true });
    expect(unknownModules).toEqual([]);
  });

  it("collects unknown modules instead of dropping them silently", () => {
    const { matrix, unknownModules } = flatPermissionsToMatrix([
      perm("legacy-module", "READ"),
      perm("legacy-module", "READ"),
      perm("product", "READ"),
    ]);

    expect(unknownModules).toEqual(["legacy-module"]);
    expect(matrix.product.R).toBe(true);
  });

  it("handles undefined and empty input", () => {
    expect(flatPermissionsToMatrix(undefined).unknownModules).toEqual([]);
    expect(flatPermissionsToMatrix([]).matrix.product).toEqual({ C: false, R: false, U: false, D: false });
  });
});

describe("matrixToGrants", () => {
  it("emits one grant per module entry", () => {
    const matrix = buildEmptyMatrix();
    matrix.product.R = true;

    const grants = matrixToGrants(matrix);
    expect(grants).toHaveLength(MODULES.length);
    expect(grants).toContainEqual({ name: "product", C: false, R: true, U: false, D: false });
  });
});

describe("matrixToModuleNames", () => {
  it("includes only modules with at least one grant", () => {
    const matrix = buildEmptyMatrix();
    matrix.product.R = true;
    matrix.order.D = true;

    expect(matrixToModuleNames(matrix).sort()).toEqual(["order", "product"]);
    expect(matrixToModuleNames(buildEmptyMatrix())).toEqual([]);
  });
});

describe("isModuleFullyGranted", () => {
  it("detects full and partial grants", () => {
    const matrix = buildEmptyMatrix();
    expect(isModuleFullyGranted(matrix, "product")).toBe(false);

    matrix.product = { C: true, R: true, U: true, D: true };
    expect(isModuleFullyGranted(matrix, "product")).toBe(true);
    expect(isModuleFullyGranted(matrix, "order")).toBe(false);
    expect(isModuleFullyGranted(undefined, "product")).toBe(false);
    expect(isModuleFullyGranted(matrix, "nope")).toBe(false);
  });
});

describe("roleFormSchema", () => {
  const validPermissions = { product: { C: true, R: true, U: false, D: false } };

  it("accepts a valid role form", () => {
    const parsed = roleFormSchema.safeParse({ name: "Seller", description: "Shop staff", permissions: validPermissions });
    expect(parsed.success).toBe(true);
  });

  it("rejects blank and over-long names", () => {
    expect(roleFormSchema.safeParse({ name: "  ", permissions: {} }).success).toBe(false);
    expect(roleFormSchema.safeParse({ name: "x".repeat(101), permissions: {} }).success).toBe(false);
  });

  it("rejects unknown permission modules so typos never reach the API", () => {
    const parsed = roleFormSchema.safeParse({
      name: "Seller",
      permissions: { prodcut: { C: true, R: true, U: false, D: false } },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-boolean flags", () => {
    const parsed = roleFormSchema.safeParse({
      name: "Seller",
      permissions: { product: { C: "yes", R: true, U: false, D: false } },
    });
    expect(parsed.success).toBe(false);
  });
});
