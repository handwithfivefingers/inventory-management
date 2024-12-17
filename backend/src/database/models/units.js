const { DataTypes } = require("sequelize");
const Unit = (sequelize) => {
  const Model = sequelize.define(
    "unit",
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
      timestamps: true,
    }
  );
  Model.associate = (models) => {
    // Model.hasMany(models.product, { through: "unitId" });
  };
  return Model;
};

module.exports = Unit;
