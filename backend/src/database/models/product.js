const { DataTypes } = require("sequelize");
const Product = (sequelize) => {
  const Model = sequelize.define(
    "product",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      skuCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      salePrice: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      regularPrice: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      wholeSalePrice: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      costPrice: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      costPrice: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      sold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    Model.hasMany(models.inventory, { foreignKey: "productId" });
    Model.hasMany(models.orderDetail, { foreignKey: "productId" });
    Model.hasMany(models.transfer, { foreignKey: "productId" });
    Model.belongsToMany(models.category, { through: "product_category" });
    Model.belongsToMany(models.tag, { through: "product_tag" });
    Model.belongsTo(models.unit, { foreignKey: "unitId" });
  };

  return Model;
};

module.exports = Product;
