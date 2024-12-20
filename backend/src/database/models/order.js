const { DataTypes } = require("sequelize");
const Order = (sequelize) => {
  const Model = sequelize.define(
    "order",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      VAT: {
        type: DataTypes.INTEGER,
      },
      paid: {
        type: DataTypes.BIGINT,
      },
      surcharge: {
        type: DataTypes.BIGINT,
      },
      price: {
        type: DataTypes.BIGINT,
      },
      paymentType: {
        type: DataTypes.ENUM,
        values: ["cash", "transfer"],
        defaultValue: "cash",
      },
    },
    {
      timestamps: true,
    }
  );
  Model.associate = (models) => {
    Model.hasMany(models.orderDetail, { foreignKey: "orderId" });
    Model.belongsTo(models.provider, { foreignKey: "providerId" });
  };
  return Model;
};

module.exports = Order;
