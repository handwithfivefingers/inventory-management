import { normalizeValues } from "~/libs/normalize";
import type { IVariantAttributeDraft } from "./types";

export const buildCombos = (
  attributes: { name: string; values: unknown }[]
): Record<string, string>[] => {
  const usableAttributes = attributes
    .map((attribute) => ({
      name: (attribute?.name || "").trim(),
      values: normalizeValues(attribute?.values),
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);

  return usableAttributes
    .reduce<Record<string, string>[]>(
      (combinations, attribute) =>
        combinations.flatMap((combination) =>
          attribute.values.map((value) => ({
            ...combination,
            [attribute.name]: value,
          }))
        ),
      [{}]
    )
    .filter((combination) => Object.keys(combination).length > 0);
};

/** Keep variant options in sync with the attributes currently selected above. */
export const filterVariantOptionsByAttributes = (
  options: Record<string, string> | undefined,
  attributes: IVariantAttributeDraft[]
): Record<string, string> => {
  const selectedAttributes = new Map(
    attributes
      .map((attribute) => {
        const name = String(attribute?.name || "").trim();
        const values = Array.isArray(attribute?.values)
          ? attribute.values
              .map((value) =>
                typeof value === "string" ? value : value?.value
              )
              .map((value) =>
                String(value || "")
                  .trim()
                  .toLowerCase()
              )
              .filter(Boolean)
          : [];

        return [name.toLowerCase(), { name, values: new Set(values) }] as const;
      })
      .filter(([name, attribute]) => name && attribute.values.size > 0)
  );

  return Object.entries(options || {}).reduce<Record<string, string>>(
    (result, [name, value]) => {
      const selectedAttribute = selectedAttributes.get(
        name.trim().toLowerCase()
      );
      const normalizedValue = String(value ?? "").trim();
      if (
        selectedAttribute &&
        selectedAttribute.values.has(normalizedValue.toLowerCase())
      ) {
        result[selectedAttribute.name] = normalizedValue;
      }
      return result;
    },
    {}
  );
};

export const optionKeyOf = (options: Record<string, string> | undefined) =>
  Object.entries(options || {})
    .filter(([, value]) => String(value ?? "").trim() !== "")
    .map(([name, value]) => `${name}:${String(value).trim().toLowerCase()}`)
    .sort()
    .join("|");

export const hasVariantOptionsChanged = (
  current: Record<string, string>,
  next: Record<string, string>
) =>
  Object.keys(current).length !== Object.keys(next).length ||
  Object.entries(next).some(([name, value]) => current[name] !== value);
