const { DataTypes } = require("sequelize");
const Role = (sequelize) => {
  const Model = sequelize.define(
    "role",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.STRING,
      },
    },
    {
      // Other model options go here
      timestamps: true,
    }
  );

  Model.associate = (models) => {
    Model.belongsToMany(models.permission, { through: "role_permission" });
    Model.belongsToMany(models.user, { through: "user_role" });

  };
  return Model;
};

module.exports = Role;
