import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, HasOne, HasMany } from 'sequelize-typescript'
import bcrypt from 'bcryptjs'
import { Staff } from './staff'
import { Vendor } from './vendor'

@Table({ tableName: 'users', modelName: 'user', timestamps: true })
export class User extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number

  @Column({ type: DataType.STRING, allowNull: false, unique: 'email' })
  declare email: string

  @Column({
    type: DataType.STRING,
    set(value: string) {
      this.setDataValue('password', bcrypt.hashSync(value, 10))
    }
  })
  declare password: string

  @Column({ type: DataType.ENUM('free', 'paid'), defaultValue: 'free' })
  declare subscription: string

  @Column(DataType.STRING)
  declare secret: string

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return {
        id: (this as any).id,
        email: (this as any).email,
        subscription: (this as any).subscription,
        createdAt: (this as any).createdAt,
        updatedAt: (this as any).updatedAt
      }
    }
  })
  declare parsed: any

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @HasOne(() => Staff)
  declare staff: Staff

  @HasMany(() => Vendor)
  declare vendors: Vendor[]
}

export default User
