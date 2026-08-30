import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Role } from './role'
import { Permission } from './permission'

@Table({ tableName: 'role_permissions', modelName: 'role_permission', timestamps: true })
export class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true })
  declare roleId: number

  @ForeignKey(() => Permission)
  @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true })
  declare permissionId: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => Role, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare role: Role

  @BelongsTo(() => Permission, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  declare permission: Permission
}

export default RolePermission
