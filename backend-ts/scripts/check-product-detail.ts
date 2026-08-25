/**
 * Diagnostic script: reproduces the getProductById query used by the client's
 * product detail page. Run: npx tsx scripts/check-product-detail.ts <productId>
 */
import database from '../src/database'

const run = async () => {
  await database.load()
  const id = Number(process.argv[2] || 164)
  try {
    const resp = await (database.product as any).findOne({
      where: { id },
      include: [
        { model: database.inventory, attributes: [] },
        { model: database.category, attributes: ['id', 'name'], through: { attributes: [] } },
        { model: database.tag, attributes: ['id', 'name'], through: { attributes: [] } },
        { model: database.unit, attributes: ['id', 'name'] },
        {
          model: database.productAttribute,
          as: 'attributes',
          attributes: ['id', 'name'],
          include: [{ model: database.productAttributeValue, as: 'values', attributes: ['id', 'value'] }]
        },
        {
          model: database.productVariant,
          as: 'variants',
          include: [
            {
              model: database.productAttributeValue,
              as: 'attributeValues',
              attributes: ['id', 'value'],
              through: { attributes: [] }
            }
          ]
        }
      ],
      attributes: {
        include: [
          [database.sequelize.col('inventories.quantity'), 'quantity'],
          [database.sequelize.col('unit.id'), 'unitId'],
          [database.sequelize.col('unit.name'), 'unitName']
        ]
      }
    })
    console.log('OK', JSON.stringify(resp?.toJSON(), null, 2).slice(0, 1500))
  } catch (e) {
    console.error('FAILED:', (e as Error).message)
  }
  process.exit(0)
}
run()
