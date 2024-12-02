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
  };
  return Models;
};

module.exports = Vendor;
