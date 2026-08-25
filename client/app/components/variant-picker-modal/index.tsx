import { NumericFormat } from "react-number-format";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { IProduct, IProductVariant } from "~/types/product";

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

/**
 * Shown when a variable product is selected in the order flow:
 * lets the user pick which variant (attribute combination) to add.
 */
export const VariantPickerModal = ({ show, close, product, variants, loading, onSelect }: Props) => {
  const { t } = useTranslation();
  return (
    <TMModal open={show} close={close} width={600}>
      <div className="flex flex-col gap-2 w-full">
        <div className="py-2 font-medium">
          {product?.name} — {t("product.pickVariant")}
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
                      <span key={attrValue.id} className="bg-slate-100 rounded px-1.5 py-0.5 text-xs">
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
                render: (r: IProductVariant) =>
                  (r.inventories || []).reduce((sum, inv) => sum + Number(inv.quantity || 0), 0),
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
                render: (r: IProductVariant) => (
                  <TMButton variant="light" size="xs" onClick={() => onSelect(r)}>
                    {t("common.choose")}
                  </TMButton>
                ),
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
