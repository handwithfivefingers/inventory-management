const { DataTypes } = require("sequelize");
const Inventory = (sequelize) => {
  const Model = sequelize.define(
    "inventory",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
      },
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
  };
  return Model;
};

module.exports = Inventory;
