import database from '#/database'
import { IInventoryStatic } from '#/types/inventory'
import { IOrderDetailStatic } from '#/types/orderDetail'
import { IOrderStatic } from '#/types/order'
import { getVendorScope, TVendorScope } from '#/utils/tenant'
import { FindAttributeOptions, Op, Sequelize } from 'sequelize'

export class StatsService {
  order: IOrderStatic = database.order
  orderDetail: IOrderDetailStatic = database.orderDetail
  inventory: IInventoryStatic = database.inventory
  sequelize: Sequelize = database.sequelize

  /**
   * Aggregated numbers for the dashboard:
   * - revenue & order count per day (sales orders only, providerId IS NULL)
   * - period KPIs: totalRevenue, totalOrders, avgOrderValue
   * - top selling products in the period
   * - low stock alerts per warehouse
   */
  async getDashboard({
    days,
    from,
    to,
    groupBy,
    warehouseId,
    lowStockThreshold,
    vendorScope = null
  }: {
    days?: string
    from?: string
    to?: string
    groupBy?: string
    warehouseId?: string
    lowStockThreshold?: string
    /** Multi-tenant scope from auth middleware (null = platform admin). */
    vendorScope?: TVendorScope
  }) {
    try {
      const threshold = Math.max(0, Number(lowStockThreshold) || 10)

      // Resolve the reporting range: explicit from/to wins, otherwise "last N days"
      let start: Date
      let end: Date
      const fromDate = from ? new Date(`${from}T00:00:00`) : null
      const toDate = to ? new Date(`${to}T00:00:00`) : null
      if (fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        start = fromDate
        end = toDate.getTime() >= fromDate.getTime() ? toDate : fromDate
      } else {
        const dayCount = Math.max(1, Number(days) || 7)
        end = this.startOfDay(new Date())
        start = this.startOfDay(new Date(end))
        start.setDate(start.getDate() - (dayCount - 1))
      }

      const spanDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1

      // Grouping granularity: explicit param wins, otherwise adapt to the span
      // so long ranges stay readable on charts (e.g. 90 days -> ~13 weekly points)
      const granularity =
        groupBy === 'week' || groupBy === 'month'
          ? groupBy
          : spanDays > 62
            ? 'month'
            : spanDays > 10
              ? 'week'
              : 'day'

      const endExclusive = new Date(end)
      endExclusive.setDate(endExclusive.getDate() + 1)

      // S1: scoped callers only ever aggregate their own vendors' orders.
      const salesWhere: any = {
        providerId: { [Op.eq]: null },
        createdAt: { [Op.gte]: start, [Op.lt]: endExclusive }
      }
      if (warehouseId) salesWhere.warehouseId = Number(warehouseId)
      if (vendorScope !== null) {
        salesWhere.vendorId = { [Op.in]: vendorScope.length ? vendorScope : [-1] }
      }

      // Revenue & order count grouped by day
      const grouped = (await this.order.findAll({
        where: salesWhere,
        attributes: [
          [this.sequelize.fn('DATE_FORMAT', this.sequelize.col('createdAt'), '%Y-%m-%d'), 'date'],
          [this.sequelize.fn('SUM', this.sequelize.col('paid')), 'revenue'],
          [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'orders']
        ] as FindAttributeOptions,
        group: ['date'],
        raw: true
      })) as any[]

      // Fill buckets with zeros so charts have a continuous axis.
      // Buckets are day/week/month sized depending on the granularity.
      const byDay = new Map<string, { revenue: number; orders: number }>()
      grouped.forEach((row) => {
        byDay.set(String(row.date), {
          revenue: Number(row.revenue) || 0,
          orders: Number(row.orders) || 0
        })
      })

      const series: { date: string; label: string; revenue: number; orders: number }[] = []
      let totalRevenue = 0
      let totalOrders = 0

      const pad = (n: number) => String(n).padStart(2, '0')
      const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const labelOf = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`

      for (
        let bucketStart = new Date(start);
        bucketStart <= end;
        bucketStart = this.nextBucketStart(bucketStart, granularity)
      ) {
        let bucketEnd = new Date(bucketStart)
        if (granularity === 'day') {
          // full single day
        } else if (granularity === 'week') {
          bucketEnd.setDate(bucketEnd.getDate() + 6)
          if (bucketEnd > end) bucketEnd = new Date(end)
        } else {
          bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 0)
          if (bucketEnd > end) bucketEnd = new Date(end)
        }

        let revenue = 0
        let orders = 0
        const cursor = new Date(bucketStart)
        while (cursor <= bucketEnd) {
          const entry = byDay.get(keyOf(cursor)) ?? { revenue: 0, orders: 0 }
          revenue += entry.revenue
          orders += entry.orders
          cursor.setDate(cursor.getDate() + 1)
        }
        totalRevenue += revenue
        totalOrders += orders

        series.push({
          date: keyOf(bucketStart),
          label:
            granularity === 'month'
              ? `${pad(bucketStart.getMonth() + 1)}/${bucketStart.getFullYear()}`
              : labelOf(bucketStart),
          revenue,
          orders
        })
      }

      const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0

      // Top selling products in the period.
      // P5: single JOIN aggregate instead of loading every order id into an
      // IN-list first; joins the sales-filtered orders straight onto their
      // details.
      const topProducts = (await this.orderDetail.findAll({
        attributes: [
          [this.sequelize.col('orderDetail.productId'), 'productId'],
          [this.sequelize.col('product.name'), 'productName'],
          [this.sequelize.col('product.code'), 'productCode'],
          [this.sequelize.fn('SUM', this.sequelize.col('orderDetail.quantity')), 'quantitySold'],
          [
            this.sequelize.fn(
              'SUM',
              this.sequelize.literal('`orderDetail`.`quantity` * `orderDetail`.`price`')
            ),
            'revenue'
          ]
        ] as FindAttributeOptions,
        include: [
          { model: database.product, attributes: [] },
          {
            model: database.order,
            attributes: [],
            required: true,
            where: salesWhere
          }
        ],
        group: [
          this.sequelize.col('orderDetail.productId'),
          this.sequelize.col('product.id'),
          this.sequelize.col('product.name'),
          this.sequelize.col('product.code')
        ],
        order: [[this.sequelize.literal('`quantitySold`'), 'DESC']],
        limit: 5,
        raw: true
      })) as any[]

      const mappedTopProducts = topProducts.map((row) => ({
        ...row,
        quantitySold: Number(row.quantitySold) || 0,
        revenue: Number(row.revenue) || 0
      }))

      // Low stock alerts (product-level rows only; variant rows are aggregated separately)
      const inventoryWhere: any = {
        quantity: { [Op.lte]: threshold },
        variantId: { [Op.eq]: null }
      }
      if (warehouseId) inventoryWhere.warehouseId = Number(warehouseId)

      const lowStockCount = await this.inventory.count({ where: inventoryWhere })
      const lowStock = await this.inventory.findAll({
        where: inventoryWhere,
        attributes: ['id', 'quantity'],
        include: [
          { model: database.product, attributes: ['id', 'name', 'code'] },
          { model: database.warehouse, attributes: ['id', 'name'] }
        ],
        order: [['quantity', 'ASC']],
        limit: 10
      })

      return {
        range: {
          days: spanDays,
          from: start.toISOString(),
          to: end.toISOString(),
          granularity
        },
        series,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        topProducts: mappedTopProducts,
        lowStock,
        lowStockCount
      }
    } catch (error) {
      console.log('getDashboard error', error)
      throw error
    }
  }

  /** Local midnight of the given date. */
  private startOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  /** First day of the next bucket (next day / next Monday-aligned week / next month). */
  private nextBucketStart(bucketStart: Date, granularity: 'day' | 'week' | 'month') {
    const next = new Date(bucketStart)
    if (granularity === 'month') {
      return new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 1)
    }
    next.setDate(next.getDate() + (granularity === 'week' ? 7 : 1))
    return this.startOfDay(next)
  }
}

export default StatsService
