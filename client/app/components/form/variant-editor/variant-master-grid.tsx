import { useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '~/components/icon';
import { PermissionGuard } from '~/components/permission-guard';
import { TMButton } from '~/components/tm-button';
import { MODULE_ENUM } from '~/constants/modules';
import type { ProductSchemaType } from '~/constants/schema/product';
import { useTranslation } from '~/i18n';
import { getBaseUnit } from '~/libs/product-unit';
import { SwitchInput } from '../switch-input';
import { SelectInput } from '../select-input';
import { TextInput } from '../text-input';
import { PricingUnitDrawer } from './pricing-unit-drawer';
import type { IVariantAttributeDraft, IVariantDraft } from './types';

export function VariantMasterGrid({ fields, units, type, attributes = [], onRemove }: { fields: { id: string }[]; units: { id: number | string; name: string }[]; type: number; attributes?: IVariantAttributeDraft[]; onRemove: (index: number) => void }) {
  const form = useFormContext<ProductSchemaType>();
  const { t } = useTranslation();
  const variants = (useWatch({ control: form.control, name: 'variants' }) || []) as IVariantDraft[];
  const nameOf = (variant: IVariantDraft) => Object.values(variant.options || {}).filter(Boolean).join(' / ') || t('product.newVariant');
  return <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
    <div className="hidden grid-cols-[minmax(160px,1.5fr)_minmax(110px,1fr)_minmax(100px,.7fr)_auto] gap-3 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 md:grid dark:bg-slate-800 dark:text-slate-300">
      <span>{t('product.variant', { defaultValue: 'Biến thể' })}</span><span>SKU</span><span>{t('product.stock', { defaultValue: 'Tồn kho' })}</span><span />
    </div>
    {fields.map((field, index) => {
      const variant = variants[index] || ({ options: {} } as IVariantDraft);
      const base = getBaseUnit(variant.barcodes);
      const quantity = Number(variant.quantity || 0);
      return <div key={field.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-3 md:grid-cols-[minmax(160px,1.5fr)_minmax(110px,1fr)_minmax(100px,.7fr)_auto] md:items-center dark:border-slate-700">
        <div><p className="font-medium">{nameOf(variant)}</p><div className="mt-1 flex flex-wrap gap-1">{attributes.map((attribute) => <SelectInput key={attribute.name} inputSize="xs" placeholder={attribute.name} value={variant.options?.[attribute.name] || ''} options={(attribute.values || []).map((value: any) => ({ label: value.label || value.value, value: value.value || value }))} onSelect={(value) => form.setValue(`variants.${index}.options`, { ...(variant.options || {}), [attribute.name]: String(value) }, { shouldDirty: true })} />)}</div><p className="mt-1 text-xs text-slate-500">{base?.barcode || '—'}</p></div>
        <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product} fallback={<span className="text-sm">{variant.skuCode || '—'}</span>}><TextInput inputSize="xs" aria-label="SKU" value={String(variant.skuCode || '')} onChange={(event) => form.setValue(`variants.${index}.skuCode`, event.target.value, { shouldDirty: true, shouldValidate: true })} /></PermissionGuard>
        <div>{variant.variantId ? <span className="font-medium">{quantity}</span> : <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product} fallback={<span className="font-medium">{quantity}</span>}><input aria-label={t('product.stock', { defaultValue: 'Tồn kho ban đầu' })} type="number" min="0" className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" value={quantity} onChange={(event) => form.setValue(`variants.${index}.quantity`, event.target.value, { shouldDirty: true, shouldValidate: true })} /></PermissionGuard>}{quantity === 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{t('product.outOfStock', { defaultValue: 'Hết hàng' })}</span>}</div>
        <div className="flex items-center justify-end gap-1">
          <PricingUnitDrawer index={index} units={units} trigger={t('product.configurePricing', { defaultValue: 'Cấu hình Giá & Đơn vị' })} />
          <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}><SwitchInput checked={variant.isActive !== false} onChange={(event: any) => form.setValue(`variants.${index}.isActive`, event.target.checked, { shouldDirty: true })} /></PermissionGuard>
          {type === 1 && <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}><TMButton type="button" variant="ghost" size="xs" onClick={() => onRemove(index)} aria-label={t('common.delete')}><Icon name="trash-2" fontSize={15} /></TMButton></PermissionGuard>}
        </div>
      </div>;
    })}
  </div>;
}
