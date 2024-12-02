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
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
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
  };
  return Model;
};

module.exports = Warehouse;
