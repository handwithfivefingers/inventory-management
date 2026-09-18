/**
 * Convert the form's permissive draft objects into the product API contract.
 * Price fields belong to a barcode; variant state belongs to the variant.
 */
const BARCODE_FIELDS = [
  "id",
  "barcode",
  "unitId",
  "conversionRate",
  "costPrice",
  "retailPrice",
  "wholesalePrice",
  "promoPrice",
  "promoStartAt",
  "promoEndAt",
] as const;

const VARIANT_FIELDS = [
  "id",
  "variantId",
  "skuCode",
  "quantity",
  "VAT",
  "imageUrl",
  "isNegative",
  "isActive",
  "options",
  "attributes",
  "attributeValues",
] as const;

type Draft = Record<string, unknown>;

const pickDefined = (source: Draft, fields: readonly string[]) => {
  const result: Draft = {};
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
};

export const serializeBarcode = (barcode: Draft): Draft => pickDefined(barcode, BARCODE_FIELDS);

/** Drops retired fields such as `salePrice` before POST/PUT /products. */
export const serializeProductVariant = (variant: Draft): Draft => ({
  ...pickDefined(variant, VARIANT_FIELDS),
  ...(Array.isArray(variant.barcodes) ? { barcodes: variant.barcodes.map((barcode) => serializeBarcode(barcode as Draft)) } : {}),
});
