import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, HasMany } from 'sequelize-typescript'
import { Vendor } from './vendor'
import { Inventory } from './inventory'
import { OrderDetail } from './orderDetail'
import { Transfer } from './transfer'
import { Order } from './order'

@Table({ tableName: 'warehouses', modelName: 'warehouse', timestamps: true })
export class Warehouse extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isMain: boolean

  @ForeignKey(() => Vendor)
  @Column(DataType.INTEGER)
  declare vendorId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @HasMany(() => Inventory)
  declare inventories: Inventory[]

  @HasMany(() => OrderDetail)
  declare orderDetails: OrderDetail[]

  @HasMany(() => Transfer, { foreignKey: 'fromWarehouseId', as: 'outgoingTransfers' })
  declare outgoingTransfers: Transfer[]

  @HasMany(() => Transfer, { foreignKey: 'toWarehouseId', as: 'incomingTransfers' })
  declare incomingTransfers: Transfer[]

  @HasMany(() => Order)
  declare orders: Order[]
}

export default Warehouse
