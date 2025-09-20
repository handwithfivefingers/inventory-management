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
    },
    {
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    // Model.hasMany(models.order, { foreignKey: "providerId" });
    Model.belongsTo(models.vendor, { foreignKey: "vendorId" });
  };
  return Model;
};

module.exports = Provider;
