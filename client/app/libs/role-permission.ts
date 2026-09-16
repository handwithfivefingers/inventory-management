import { z } from "zod";
import { MODULES } from "~/constants/modules";
import type { IPermission, IPermissionGrant, PermissionMethod } from "~/types/user";

/** Matrix form state: one CRUD flag set per module key. */
export type PermissionMatrix = Record<string, { C: boolean; R: boolean; U: boolean; D: boolean }>;

const METHOD_TO_FLAG: Record<PermissionMethod, "C" | "R" | "U" | "D"> = {
  CREATE: "C",
  READ: "R",
  UPDATE: "U",
  DELETE: "D",
};

const KNOWN_MODULES: ReadonlySet<string> = new Set(MODULES.map((m) => m.key));

const crudFlags = z.object({
  C: z.boolean(),
  R: z.boolean(),
  U: z.boolean(),
  D: z.boolean(),
});

/**
 * Client-side schema. `description` mirrors the backend DTO (optional string).
 * `permissions` keys should be canonical module keys; unknown keys are
 * rejected so a typo can never reach the API.
 */
export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Tên vai trò là bắt buộc").max(100, "Tên vai trò tối đa 100 ký tự"),
  description: z.string().trim().max(255, "Mô tả tối đa 255 ký tự").optional().default(""),
  permissions: z.record(crudFlags).superRefine((matrix, ctx) => {
    for (const key of Object.keys(matrix)) {
      if (!KNOWN_MODULES.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Module không hợp lệ: ${key}` });
      }
    }
  }),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

/** Empty matrix with every known module set to all-false. */
export function buildEmptyMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const module of MODULES) {
    matrix[module.key] = { C: false, R: false, U: false, D: false };
  }
  return matrix;
}

/** Result of converting flat catalog rows into the editor matrix. */
export interface FlatToMatrixResult {
  matrix: PermissionMatrix;
  /** Rows whose module key is unknown (legacy data) - surfaced, never dropped silently. */
  unknownModules: string[];
}

/**
 * Convert backend flat rows [{ name, method }] into the editor matrix.
 * Unknown module keys are collected (not thrown) so legacy roles still load.
 */
export function flatPermissionsToMatrix(permissions: IPermission[] | undefined): FlatToMatrixResult {
  const matrix = buildEmptyMatrix();
  const unknownModules: string[] = [];
  for (const perm of permissions ?? []) {
    if (!KNOWN_MODULES.has(perm.name)) {
      if (!unknownModules.includes(perm.name)) unknownModules.push(perm.name);
      continue;
    }
    const flag = METHOD_TO_FLAG[perm.method];
    if (flag) matrix[perm.name][flag] = true;
  }
  return { matrix, unknownModules };
}

/** Matrix -> full grant list (one entry per module). */
export function matrixToGrants(matrix: PermissionMatrix): IPermissionGrant[] {
  return Object.entries(matrix).map(([name, flags]) => ({ name, ...flags }));
}

/**
 * Matrix -> backend `permissions: string[]` (validator requires strings).
 * Only modules with at least one grant are included.
 */
export function matrixToModuleNames(matrix: PermissionMatrix): string[] {
  return Object.entries(matrix)
    .filter(([, flags]) => flags.C || flags.R || flags.U || flags.D)
    .map(([name]) => name);
}

/** True when every flag of a module is granted. */
export function isModuleFullyGranted(matrix: PermissionMatrix | undefined, moduleKey: string): boolean {
  const flags = matrix?.[moduleKey];
  return !!flags && flags.C && flags.R && flags.U && flags.D;
}
