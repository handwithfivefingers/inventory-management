const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const basename = path.basename(__filename);
const db = {};

console.log("basename", basename);
const folderPath = path.join(__dirname, "models");

const sequelize = new Sequelize("inventory", "root", "mysql", {
  host: "localhost",
  dialect: "mysql",
  logging:false,
  // logging: (query, ...msg) => console.log(query),
  define: {
    charset: "utf8",
    collate: "utf8_general_ci",
    timestamps: true,
  },
});

fs.readdirSync(folderPath)
  .filter((file) => {
    return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
  })
  .forEach((file) => {
    const model = require(path.join(folderPath, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

db.connect = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully");
    return true;
  } catch (error) {
    console.log("Unable to connect to the database", error);
    return false;
  }
};
db.sync = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Connection has been established successfully");
    return true;
  } catch (error) {
    console.log("Unable to connect to the database", error);
    return false;
  }
};

module.exports = db;
