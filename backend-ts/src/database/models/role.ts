import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany
} from 'sequelize-typescript'
import { Vendor } from './vendor'
import { Permission } from './permission'
import { RolePermission } from './role_permission'
import { Staff } from './staff'

@Table({ tableName: 'roles', modelName: 'role', timestamps: true })
export class Role extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column(DataType.STRING)
  declare name: string

  @Column(DataType.STRING)
  declare description: string

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare vendorId: number | null

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isGlobal: boolean

  @Column({ type: DataType.BOOLEAN, defaultValue: false, comment: 'System default role - cannot be deleted' })
  declare isSystem: boolean

  @Column({ type: DataType.BOOLEAN, defaultValue: false, comment: 'System Role' })
  declare isAdmin: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Vendor, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare vendor: Vendor

  @BelongsToMany(() => Permission, () => RolePermission)
  declare permissions: Permission[]

  @HasMany(() => RolePermission)
  declare rolePermissions: RolePermission[]

  @HasMany(() => Staff)
  declare staffs: Staff[]
}

export default Role
