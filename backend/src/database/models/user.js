const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { cacheSet, cacheKey } = require("@src/libs/redis");
const User = (sequelize) => {
  const Models = sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: "email",
        validator: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
      },
      subscription: {
        type: DataTypes.ENUM,
        values: ["free", "paid"],
        defaultValue: "free",
      },
    },
    {
      timestamps: true,
    }
  );
  Models.associate = (models) => {
    Models.belongsToMany(models.role, { through: "user_role" });
    Models.hasMany(models.vendor, { foreignKey: "userId" });
  };

  return Models;
};

module.exports = User;
