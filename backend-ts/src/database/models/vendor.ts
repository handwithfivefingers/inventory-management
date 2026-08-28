import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany, BelongsToMany } from 'sequelize-typescript'
import { User } from './user'
import { Warehouse } from './warehouse'
import { Category } from './category'
import { Tag } from './tag'
import { Unit } from './units'
import { Staff } from './staff'
import { StaffVendor } from './staff_vendor'

@Table({ tableName: 'vendors', modelName: 'vendor', timestamps: true })
export class Vendor extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.STRING)
  declare name: string

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  declare userId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => User)
  declare user: User

  @HasMany(() => Warehouse)
  declare warehouses: Warehouse[]

  @HasMany(() => Category)
  declare categories: Category[]

  @HasMany(() => Tag)
  declare tags: Tag[]

  @HasMany(() => Unit)
  declare units: Unit[]

  @BelongsToMany(() => Staff, () => StaffVendor)
  declare staffs: Staff[]
}

export default Vendor
