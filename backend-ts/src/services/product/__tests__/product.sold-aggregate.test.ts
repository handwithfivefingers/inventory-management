import database from '#/database'
import Product from '#/database/models/product'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductService } from '../index'

vi.mock('#/utils/tenant', () => ({
  assertVendorAccess: vi.fn(),
  assertWarehouseAccess: vi.fn(),
  getRequestedVendorId: () => 1,
  getRequestedWarehouseId: () => 2,
  getVendorScope: () => [1]
}))

const product = vi.mocked(Product)
const soldExpression = (attributes: { include: [unknown, string][] }) =>
  attributes.include.find(([, alias]) => alias === 'sold')?.[0]

describe('Product sold read aggregate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('includes a zero-safe correlated variant sum on the product list, including historical variants', async () => {
    product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as never)
    await new ProductService().getProducts({ query: {}, headers: {} } as never)
    const options = product.findAndCountAll.mock.calls[0][0]!
    expect(soldExpression(options.attributes as never)).toBe(
      '(SELECT COALESCE(SUM(sold), 0) FROM productVariants WHERE productVariants.productId = product.id)'
    )
  })

  it('returns the same aggregate in detail reads without a stored product sold column', async () => {
    product.findOne.mockResolvedValue(null)
    await new ProductService().getProductById({ id: '1', warehouseId: 2, vendorId: 1 }, [1])
    const options = product.findOne.mock.calls[0][0]!
    expect(soldExpression(options.attributes as never)).toBe(
      '(SELECT COALESCE(SUM(sold), 0) FROM productVariants WHERE productVariants.productId = product.id)'
    )
    expect(database.sequelize.literal).toHaveBeenCalled()
  })
})
