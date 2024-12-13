const { DataTypes } = require("sequelize");
const Category = (sequelize) => {
  const Model = sequelize.define(
    "category",
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
    Model.belongsToMany(models.product, { through: "product_category" });
  };
  return Model;
};

module.exports = Category;
