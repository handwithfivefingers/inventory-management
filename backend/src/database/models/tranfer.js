const { DataTypes } = require("sequelize");
const Transfer = (sequelize) => {
  const Model = sequelize.define(
    "transfer",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.ENUM,
        values: ["0", "1"],
        comment: "0: IN, 1: OUT",
        allowNull: false,
        get(v) {
          return v == "0" ? "Input" : "Output";
        },
      },
    },
    {
      timestamps: true,
      // paranoid: false,
    }
  );

  Model.associate = (models) => {
    // Model.belongsTo(models.warehouse, { foreignKey: "warehouseId" });
  };
  return Model;
};

module.exports = Transfer;
