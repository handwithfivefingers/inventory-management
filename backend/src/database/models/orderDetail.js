const { DataTypes } = require("sequelize");
const OrderDetail = (sequelize) => {
  const Model = sequelize.define(
    "orderDetail",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
      },
      price: {
        type: DataTypes.BIGINT,
      },
      buyPrice: {
        type: DataTypes.BIGINT,
      },
      note: {
        type: DataTypes.STRING,
      },
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    Model.belongsTo(models.product, { foreignKey: "productId" });
    Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
  };
  return Model;
};

module.exports = OrderDetail;
