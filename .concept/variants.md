## This is a variant example for Variant Generation

```tsx
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { FormControl } from '~/components/common/formControl'
import { Input } from '~/components/common/input'
import { RadioGroup } from '~/components/common/radio'
import { SearchSelect } from '~/components/common/select/searchSelect'
import { VariantModel } from '~/models/variant'
import type { AttributeSchema, ProductSchema, VariationSchema } from '~/schema/product'
export const Variant = memo(
  ({
    variant,
    index: variantIndex,
    onRemove,
  }: {
    variant: VariationSchema
    index: number
    onRemove: (i: number) => void
  }) => {
    const form = useFormContext()
    const title = useMemo(() => {
      return Object.keys(variant.attributes)
        .map((key) => `${key}: ${variant.attributes[key] || '---'}`)
        .join(' ,  ')
    }, [variant.attributes])
    const attributes = form.getValues('attributes') || []

    // const onRemove = useCallback(() => {
    //   const currentVariants = form.getValues('variations') || []
    //   const nextState = currentVariants.filter((_: VariantModel, index: number) => index !== variantIndex)
    //   form.setValue('variations', nextState)
    // }, [form, variantIndex])

    return (
      <div
        className="p-1.5 shadow-primary rounded bg-slate-50/50 flex flex-col gap-2 border border-slate-300"
        tabIndex={0}
      >
        <div className="border-b border-slate-300 pb-1 flex justify-between">
          <h5 className="text-base ">{title}</h5>
          <span
            onClick={() => onRemove(variantIndex)}
            className=" text-red-500/80 hover:bg-red-500/80 hover:text-white transition-colors p-0.5 rounded px-0.75 cursor-pointer flex items-center justify-center"
          >
            <IconTrash size={16} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <FormControl name={`variations.${variantIndex}.price`}>
            <Input label="Giá khuyến mãi" inputType="number" />
          </FormControl>
          <FormControl name={`variations.${variantIndex}.regular_price`}>
            <Input label="Giá niêm yết" inputType="number" />
          </FormControl>

          <FormControl name={`variations.${variantIndex}.stock_status`}>
            <RadioGroup
              name={`variations.${variantIndex}.stock_status`}
              label="Trạng thái tồn kho:"
              options={[
                { label: 'Còn hàng', value: 'instock' },
                { label: 'Hết hàng', value: 'outofstock' },
              ]}
            />
          </FormControl>
          <FormControl name={`variations.${variantIndex}.purchasable`}>
            <RadioGroup
              name={`variations.${variantIndex}.purchasable`}
              label="Trạng thái hiển thị:"
              options={[
                { label: 'Hiển thị', value: 'true' },
                { label: 'Ẩn', value: 'false' },
              ]}
            />
          </FormControl>

          <div className="col-span-2 flex gap-2 flex-wrap">
            {attributes?.map((attr: AttributeSchema, index: number) => {
              return (
                <FormControl
                  key={[attr.name, index].toString()}
                  name={`variations.${variantIndex}.attributes.${attr.name}`}
                >
                  <SearchSelect
                    label={attr.name}
                    options={attr.value?.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                </FormControl>
              )
            })}
          </div>
        </div>
      </div>
    )
  },
)

export const VariantConfig = memo(() => {
  const form = useFormContext<ProductSchema>()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: 'variations',
  })
  const addNewVariant = () => {
    const newV = new VariantModel()
    append(newV)
    setTimeout(() => {
      if (wrapperRef.current) wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight
    }, 250)
  }

  /**
   * Generates all possible variant combinations from product attributes
   * Uses cartesian product to create all combinations of attribute values
   */
  const generateVariant = useCallback(() => {
    const attributes = form.getValues('attributes') || []

    // Filter out attributes that have no values
    const validAttributes = attributes.filter((attr) => attr.value && attr.value.length > 0)

    if (validAttributes.length === 0) {
      console.warn('No attributes with values found. Please add attributes first.')
      return
    }

    /**
     * Recursive function to generate all combinations of attributes
     * @param data - Array of attributes with their values
     * @param index - Current index in the attributes array
     * @param currentObj - Current combination being built
     * @param result - Array to store all combinations
     */
    const generateCombinations = (
      data: NonNullable<ProductSchema['attributes']>,
      index: number,
      currentObj: Record<string, string>,
      result: VariationSchema[],
    ): void => {
      if (!data || index >= data.length) {
        // Base case: we've processed all attributes, add the combination
        result.push({
          attributes: { ...currentObj },
          price: 0,
          regular_price: undefined,
          stock_status: 'instock',
          purchasable: true,
        })
        return
      }

      const currentAttribute = data[index]
      if (currentAttribute?.value && currentAttribute.value.length > 0) {
        // For each value of the current attribute, recurse
        for (const value of currentAttribute.value) {
          if (value && currentAttribute.name) {
            generateCombinations(data, index + 1, { ...currentObj, [currentAttribute.name]: value }, result)
          }
        }
      } else {
        // If attribute has no values, skip it and continue
        generateCombinations(data, index + 1, currentObj, result)
      }
    }

    // Generate all combinations
    const combinations: VariationSchema[] = []
    generateCombinations(validAttributes, 0, {}, combinations)

    if (combinations.length === 0) {
      console.warn('No valid combinations generated. Please check your attributes.')
      return
    }

    // Get current variations and merge with new ones
    const currentVariants = form.getValues('variations') || []

    // Convert combinations to VariantModel instances
    const newVariants = combinations.map((combo) => new VariantModel(combo))

    // Merge with existing variants (avoid duplicates based on attribute combination)
    const existingAttributeKeys = new Set(currentVariants.map((v) => JSON.stringify(v.attributes || {})))

    const uniqueNewVariants = newVariants.filter((v) => !existingAttributeKeys.has(JSON.stringify(v.attributes)))

    if (uniqueNewVariants.length === 0) {
      console.warn('All generated variants already exist.')
      return
    }

    // Set the merged variations
    const nextState = [...currentVariants, ...uniqueNewVariants]
    form.setValue('variations', nextState)
    // Scroll to bottom after a short delay to show new variants
    setTimeout(() => {
      if (wrapperRef.current) {
        wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight
      }
    }, 250)
  }, [form])

  return (
    <div className="flex flex-col gap-2 h-full ">
      <div className="overflow-auto flex flex-col gap-2 scroll-el" ref={wrapperRef}>
        {fields?.map((field, index) => (
          <Variant key={field.id} variant={field} index={index} onRemove={remove} />
        ))}

        <div className="w-full h-full justify-center grid grid-cols-2 sticky bottom-0 gap-2 bg-white">
          <div
            className="flex flex-col gap-1 justify-center border rounded  items-center py-1 border-dashed bg-slate-100 border-slate-400 hover:bg-slate-600 cursor-pointer hover:text-white transition-colors"
            onClick={generateVariant}
          >
            <IconPlus size={16} />
            <span className="text-xs">Tự sinh biến thể </span>
          </div>
          <div
            className="flex flex-col gap-1 justify-center  border rounded  items-center py-1 border-dashed bg-slate-100 border-slate-400 hover:bg-slate-600 cursor-pointer hover:text-white transition-colors"
            onClick={addNewVariant}
          >
            <IconPlus size={16} />
            <span className="text-xs">Thêm biến thể</span>
          </div>
        </div>
      </div>
    </div>
  )
})

VariantConfig.displayName = 'VariantConfig'
Variant.displayName = 'Variant'

```