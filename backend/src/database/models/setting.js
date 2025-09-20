const { DataTypes } = require("sequelize");
const Setting = (sequelize) => {
  const Model = sequelize.define(
    "setting",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      payment: {
        type: DataTypes.STRING,
        set: (value) => {
          this.setDataValue("payment", JSON.stringify(value));
        },
        get() {
          const val = this.getDataValue("payment");
          const parsed = JSON.parse(val);
          return parsed || {};
        },
      },
    },
    {
      timestamps: true,
    }
  );
  Model.associate = (models) => {
    Model.belongsTo(models.vendor, { foreignKey: "vendorId" });
  };
  return Model;
};

module.exports = Setting;
