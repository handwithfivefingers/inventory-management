import { ITagModel, ITagStatic } from '#/types/tag'
import { DataTypes, Sequelize } from 'sequelize'

const Tag = (sequelize: Sequelize) => {
  const Model = <ITagStatic>sequelize.define<ITagModel>(
    'tag',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      vendorId: DataTypes.INTEGER
    },
    {
      timestamps: true,
      tableName: 'tags'
    }
  )
  Model.associate = (models) => {
    Model.belongsToMany(models.product, { through: 'product_tags' })
  }
  return Model
}

export default Tag
