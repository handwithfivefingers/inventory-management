/**
 * Debug script: reproduce ProductService.getProductById output shape.
 * Run: npx tsx --env-file .env scripts/debug-product.ts [productId]
 */
import database from '#/database'
import { ProductService } from '#/services/product'

async function main() {
  await database.load()
  await database.connect()
  const productId = process.argv[2] || '164'
  const resp = await new ProductService().getProductById({
    params: { id: productId },
    query: { warehouseId: '1' },
  } as any)
  const json = JSON.parse(JSON.stringify(resp))
  console.log('top-level keys:', Object.keys(json))
  console.log('attributes:', JSON.stringify(json.attributes)?.slice(0, 400))
  console.log('variants count:', (json.variants || []).length)
  if ((json.variants || []).length) {
    console.log('variant0 keys:', Object.keys(json.variants[0]))
    console.log(
      'variant0.attributeValues:',
      JSON.stringify(json.variants[0].attributeValues)?.slice(0, 300),
    )
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
