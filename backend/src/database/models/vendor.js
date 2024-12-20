const { DataTypes } = require("sequelize");
const Vendor = (sequelize) => {
  const Models = sequelize.define(
    "vendor",
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
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );

  Models.associate = (model) => {
    Models.hasMany(model.warehouse, { foreignKey: "vendorId" });
    Models.hasMany(model.category, { foreignKey: "vendorId" });
    Models.hasMany(model.tag, { foreignKey: "vendorId" });
    Models.hasMany(model.unit, { foreignKey: "vendorId" });
    // Models.hasMany(model.provider, { foreignKey: "vendorId" });
  };
  return Models;
};

module.exports = Vendor;
