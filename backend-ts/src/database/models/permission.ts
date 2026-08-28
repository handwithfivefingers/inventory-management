import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BelongsToMany, HasMany } from 'sequelize-typescript'
import { Role } from './role'
import { RolePermission } from './role_permission'

/**
 * Shared permission CATALOG: one row per canonical module
 * (see #/constant/modules). Holds NO action flags - the per-role C/R/U/D
 * grants live on the `role_permissions` join table (#/database/models/role_permission).
 */
@Table({ tableName: 'permissions', modelName: 'permission', timestamps: true })
export class Permission extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string

  @Column(DataType.STRING)
  declare description: string | null

  @Column(DataType.ENUM('CREATE', 'UPDATE', 'READ', 'DELETE'))
  declare method: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsToMany(() => Role, () => RolePermission)
  declare roles: Role[]

  @HasMany(() => RolePermission)
  declare rolePermissions: RolePermission[]
}

export default Permission
