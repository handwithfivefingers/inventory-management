const { DataTypes } = require("sequelize");
const Provider = (sequelize) => {
  const Model = sequelize.define(
    "provider",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        required: true,
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
    },
    {
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    // Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
    Model.hasMany(models.order, { foreignKey: "providerId" });
  };
  return Model;
};

module.exports = Provider;
