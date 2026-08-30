import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany
} from 'sequelize-typescript'
import { User } from './user'
import { Role } from './role'
import { Vendor } from './vendor'
import { StaffVendor } from './staff_vendor'
import { Shift } from './shift'
import { FinancialRecord } from './financialRecord'

@Table({ tableName: 'staff', modelName: 'staff', timestamps: true })
export class Staff extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false, comment: 'Employee code, e.g. NV-0001' })
  declare code: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare fullName: string

  @Column({ type: DataType.ENUM('male', 'female', 'other'), allowNull: true })
  declare gender: 'male' | 'female' | 'other' | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare phone: string | null

  @Column({ type: DataType.BIGINT, allowNull: true })
  declare salary: number | null

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare hireDate: Date | null

  @Column({ type: DataType.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' })
  declare status: 'active' | 'inactive'

  @Column({ type: DataType.STRING, allowNull: true })
  declare address: string | null

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'FK -> users.id (auth account)' })
  declare userId: number | null

  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'FK -> roles.id' })
  declare roleId: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  get parsed() {
    return {
      staffId: (this as any).id,
      code: (this as any).code,
      fullName: (this as any).fullName,
      gender: (this as any).gender,
      phone: (this as any).phone,
      status: (this as any).status,
      address: (this as any).address
    }
  }

  @BelongsTo(() => User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare user: User

  @BelongsTo(() => Role, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  declare role: Role

  @BelongsToMany(() => Vendor, () => StaffVendor)
  declare vendors: Vendor[]

  @HasMany(() => Shift)
  declare shifts: Shift[]

  @HasMany(() => FinancialRecord)
  declare financialRecords: FinancialRecord[]
}

export default Staff
