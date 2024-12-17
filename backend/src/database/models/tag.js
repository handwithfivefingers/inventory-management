const { DataTypes } = require("sequelize");
const Tag = (sequelize) => {
  const Model = sequelize.define(
    "tag",
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
    Model.belongsToMany(models.product, { through: "product_tag" });
  };
  return Model;
};

module.exports = Tag;
