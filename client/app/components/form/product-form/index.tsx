import { useFormContext } from "react-hook-form";
import { Icon } from "~/components/icon";
import { useTranslation } from "~/i18n";
import { ICategory } from "~/types/category";
import { FormControl } from "../form-control";
import { TextInput } from "../text-input";
import { NumberStepper } from "../number-stepper";
import { DatePicker } from "../date-picker";
import { CheckboxInput } from "../checkbox-input";
import { SelectInput } from "../select-input";
import { MultiSelectInput } from "../multi-select-input";
import { NumberInput } from "../number-input";

interface Props {
  categories: ICategory[];
  units: ICategory[];
  tags: ICategory[];
  moneyStep: number;
}
export const ProductForm = ({ categories, units, tags, moneyStep }: Props) => {
  const { t } = useTranslation();
  const form = useFormContext();
  const watchedAttrs = (form.watch("variantAttributes") || []) as any[];
  const hasVariantAttrs = watchedAttrs.some(
    (a) => (a?.name || "").trim() && (Array.isArray(a?.values) ? a.values.length > 0 : String(a?.values || "").trim()),
  );
  return (
    <div className="w-full flex gap-4">
      {/* Image column */}
      <div className="w-full max-w-xs flex flex-col gap-1">
        {/* <span className="font-medium text-sm">{t("product.image")}</span> */}
        <ImagePreview />
      </div>

      {/* Fields column */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        <div className="grid grid-cols-12 col-span-12 border rounded-md p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10">
          <div className="col-span-12 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
            <Icon name="package" fontSize={16} />
            Thông tin cơ bản / Basic Information
          </div>
          <FormControl name="name" className="col-span-12">
            <TextInput
              label={t("product.name")}
              required
              prefix={<Icon name="package" fontSize={16} className="text-slate-400" />}
            />
          </FormControl>
          <FormControl name="code" className="col-span-6">
            <TextInput
              label={t("product.code")}
              prefix={<Icon name="hash" fontSize={16} className="text-slate-400" />}
            />
          </FormControl>
          <FormControl name="skuCode" className="col-span-6">
            {(field) => (
              <>
                <TextInput
                  label={t("product.sku")}
                  value={(field.value as string) || ""}
                  onChange={(e: any) => field.onChange(e.target.value)}
                  //   placeholder={settings?.skuTemplate ? `{CODE} → ${settings.skuTemplate}` : undefined}
                  prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
                />
                <p className="text-xs text-gray-500 mt-1">{t("product.skuAutoHint")}</p>
              </>
            )}
          </FormControl>

          <FormControl name="categories" className="col-span-4">
            {(field) => {
              return (
                <MultiSelectInput
                  options={categories?.map((cate: any) => ({ label: cate.name, value: cate.id })) || []}
                  label={t("product.categories")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
          <FormControl name="tags" className="col-span-4">
            {(field) => {
              return (
                <MultiSelectInput
                  options={tags?.map((tag: any) => ({ label: tag.name, value: tag.id })) || []}
                  label={t("product.tags")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>

          <FormControl name="unit" className="col-span-4">
            {(field) => {
              return (
                <SelectInput
                  options={units?.map((unit: any) => ({ label: unit.name, value: unit.id })) || []}
                  label={t("product.unit")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="grid grid-cols-4 col-span-12 border rounded-md p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10">
          <div className="col-span-4 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
            <Icon name="dollar-sign" fontSize={16} className="text-primary" />
            Giá cả & Thuế phí / Pricing & Tax
          </div>

          <FormControl name="costPrice">
            {(field) => {
              return (
                <NumberInput
                  label={t("product.costPrice")}
                  disabled={hasVariantAttrs}
                  {...field}
                  value={field.value as any}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
          <FormControl name="regularPrice">
            {(field) => {
              return (
                <NumberInput
                  label={t("product.regularPrice")}
                  disabled={hasVariantAttrs}
                  {...field}
                  value={field.value as any}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
          <FormControl name="salePrice">
            {(field) => {
              return (
                <NumberInput
                  label={t("product.salePrice")}
                  disabled={hasVariantAttrs}
                  {...field}
                  value={field.value as any}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
          {/* <FormControl name="wholeSalePrice">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.wholeSalePrice")}
                  disabled={hasVariantAttrs}
                  value={field.value as any}
                  step={moneyStep}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl> */}
          <FormControl name="VAT">
            {(field) => {
              return (
                <NumberInput
                  label="VAT(%)"
                  {...field}
                  value={field.value as any}
                  onValueChange={(v) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>

        <div className="grid grid-cols-3 col-span-12 border rounded-md p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10">
          <div className="col-span-3 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
            <Icon name="truck" fontSize={16} className="text-primary" />
            Kho hàng & Vận chuyển / Inventory & Logistics
          </div>
          <FormControl name="expiredAt">
            {(field) => {
              return <DatePicker label={t("product.expiredAt")} {...field} />;
            }}
          </FormControl>
          <FormControl name="quantity">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.stock")}
                  {...field}
                  value={field.value as any}
                  step={1}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>

          <FormControl name="isNegative">
            {(field) => {
              return (
                <CheckboxInput
                  label={t("product.allowNegative")}
                  disabled={hasVariantAttrs}
                  {...field}
                  checked={!!field.value}
                />
              );
            }}
          </FormControl>

          <FormControl name="description" className="col-span-3">
            <TextInput label={t("product.note")} multiline rows={3} />
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
      <div className="w-full aspect-square rounded-lg bg-slate-50 border-2 border-dashed flex items-center justify-center text-sm text-slate-400">
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
