const { DataTypes } = require("sequelize");
const Warehouse = (sequelize) => {
  const Model = sequelize.define(
    "warehouse",
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
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isMain: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );
  Model.associate = (models) => {
    Model.hasMany(models.inventory, { foreignKey: "warehouseId" });
    Model.hasMany(models.orderDetail, { foreignKey: "warehouseId" });
    Model.hasMany(models.transfer, { foreignKey: "warehouseId" });
  };
  return Model;
};

module.exports = Warehouse;
