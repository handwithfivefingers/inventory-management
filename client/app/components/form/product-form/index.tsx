import { useFormContext } from "react-hook-form";
import { Icon } from "~/components/icon";
import { useTranslation } from "~/i18n";
import { ICategory } from "~/types/category";
import { FormControl } from "../form-control";
import { TextInput } from "../text-input";
import { MultiSelectInput } from "../multi-select-input";
import { ProductSchemaType } from "~/constants/schema/product";
import { IProduct, IProductVariant } from "~/types/product";

/** Simple products keep their sellable fields on their single default variant. */
export const getSimpleVariant = (
  product: Pick<IProduct, "variants">
): IProductVariant | undefined => {
  const variants = product.variants || [];
  return (variants.find((variant) => Number((variant as any).type) === 0) ||
    variants[0]) as IProductVariant | undefined;
};

export const mapSimpleVariantToProductForm = (
  product: IProduct,
  variant = getSimpleVariant(product)
) => {
  const quantity = variant?.inventories?.length
    ? variant.inventories.reduce(
        (sum, inventory) => sum + Number(inventory.quantity || 0),
        0
      )
    : variant?.quantity ?? product.quantity;

  return {
    skuCode: variant?.skuCode ?? product.skuCode ?? "",
    quantity,
    VAT: variant?.VAT ?? product.VAT ?? 0,
    image: variant?.imageUrl ?? product.image ?? undefined,
    isNegative: variant?.isNegative ?? product.isNegative ?? false,
  } satisfies Partial<ProductSchemaType>;
};

interface Props {
  categories: ICategory[];
  tags: ICategory[];
}
export const ProductForm = ({
  categories,
  tags,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-4">
        <div className="grid grid-cols-12 col-span-12 border rounded-md p-3 sm:p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10 dark:bg-slate-800/60 dark:shadow-black/20">
          <div className="col-span-12 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
            <Icon name="package" fontSize={16} />
            Thông tin cơ bản / Basic Information
          </div>
          <FormControl name="name" className="col-span-12">
            <TextInput
              label={t("product.name")}
              required
              prefix={
                <Icon name="package" fontSize={16} className="text-slate-400" />
              }
            />
          </FormControl>
          <FormControl name="categories" className="col-span-12 sm:col-span-4">
            {(field) => {
              return (
                <MultiSelectInput
                  options={
                    categories?.map((cate: any) => ({
                      label: cate.name,
                      value: cate.id,
                    })) || []
                  }
                  label={t("product.categories")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
          <FormControl name="tags" className="col-span-12 sm:col-span-4">
            {(field) => {
              return (
                <MultiSelectInput
                  options={
                    tags?.map((tag: any) => ({
                      label: tag.name,
                      value: tag.id,
                    })) || []
                  }
                  label={t("product.tags")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>

          <FormControl name="description" className="col-span-12">
            <TextInput label={t("product.description")} multiline rows={3} />
          </FormControl>
        </div>
      </div>
    </div>
  );
};
const ImagePreview = () => {
  const form = useFormContext();
  const image = form.watch("image") as string | undefined;
  if (!image) {
    return (
      <div className="w-full aspect-square rounded-lg bg-slate-50 dark:bg-slate-700 border-2 border-dashed border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm text-slate-400">
        <Icon name="image" fontSize={100} />
      </div>
    );
  }
  return (
    <img
      src={image}
      alt="preview"
      className="w-full aspect-square rounded-lg object-cover border"
      onError={(e: any) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
};
