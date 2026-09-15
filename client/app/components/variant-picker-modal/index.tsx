import { useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { IProduct, IProductVariant } from "~/types/product";
import { cn } from "~/libs/utils";

interface Props {
  show: boolean;
  close: () => void;
  product?: IProduct | null;
  variants: IProductVariant[];
  loading?: boolean;
  onSelect: (variant: IProductVariant) => void;
}

const optionLabel = (variant: IProductVariant) =>
  (variant.attributeValues || [])
    .map((v: any) => v.value)
    .filter(Boolean)
    .join(" / ");

const stockOf = (variant: IProductVariant) =>
  (variant.inventories || []).reduce((sum, inv) => sum + Number(inv.quantity || 0), 0);

/** Oversell rule: variant stock must be positive unless the flag allows negatives */
const canPick = (variant: IProductVariant) => stockOf(variant) > 0 || !!(variant as any).isNegative;

/**
 * Shown when a variable product is selected in the order flow:
 * lets the user pick which variant (attribute combination) to add.
 * Out-of-stock variants (stock<=0 without isNegative) are disabled.
 */
export const VariantPickerModal = ({ show, close, product, variants, loading, onSelect }: Props) => {
  const { t } = useTranslation();

  const pickableCount = useMemo(() => variants.filter(canPick).length, [variants]);

  return (
    <TMModal open={show} close={close} width={640}>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between py-2">
          <div className="font-medium">
            {product?.name} — {t("product.pickVariant")}
          </div>
          <span className="text-xs text-slate-400">{pickableCount}/{(variants || []).length} còn hàng</span>
        </div>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">{t("common.loading")}</div>
        ) : (
          <TMTable
            scrollable
            columns={[
              {
                title: "Biến thể",
                dataIndex: "attributeValues",
                render: (r: IProductVariant) => (
                  <div className="flex flex-wrap gap-1">
                    {(r.attributeValues || []).map((attrValue: any) => (
                      <span key={attrValue.id} className="bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5 text-xs">
                        {attrValue.attribute?.name ? `${attrValue.attribute.name}: ` : ""}
                        {attrValue.value}
                      </span>
                    ))}
                  </div>
                ),
              },
              { title: "SKU", dataIndex: "skuCode" },
              {
                title: "Tồn kho",
                dataIndex: "inventories",
                render: (r: IProductVariant) => {
                  const stock = stockOf(r);
                  return (
                    <span className={cn("text-sm", stock <= 0 ? "text-red-500 font-medium" : "")}>
                      {stock}
                      {stock <= 0 && (r as any).isNegative ? " (cho âm)" : ""}
                    </span>
                  );
                },
              },
              {
                title: "Giá",
                dataIndex: "salePrice",
                render: (r: IProductVariant) => (
                  <NumericFormat
                    value={Number(r.salePrice ?? product?.regularPrice ?? 0)}
                    thousandSeparator=","
                    displayType="text"
                  />
                ),
              },
              {
                title: "",
                dataIndex: "action",
                width: 90,
                render: (r: IProductVariant) => {
                  const pickable = canPick(r);
                  return (
                    <TMButton
                      variant="light"
                      size="xs"
                      disabled={!pickable}
                      title={pickable ? undefined : "Hết hàng — không thể chọn"}
                      onClick={() => pickable && onSelect(r)}
                    >
                      {t("common.choose")}
                    </TMButton>
                  );
                },
              },
            ]}
            data={(variants || []) as any}
            rowKey="id"
          />
        )}
      </div>
    </TMModal>
  );
};
