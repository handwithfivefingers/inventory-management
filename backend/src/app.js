const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  "@src": __dirname + "/src",
  "@libs": __dirname + "/src/libs",
  "@db": __dirname + "/src/database",
  "@api": __dirname + "/src/api",
  "@constant": __dirname + "/constant",
  "@middleware": __dirname + "/src/middleware",
});
moduleAlias();

const express = require("express");
const cors = require("cors");
const parser = require("cookie-parser");
const db = require("@db");
const morgan = require("morgan");
const helmet = require("helmet");
const appRouter = require("@api/routes");
const app = express();
app.use(express.json());
app.use(parser());
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());
app.use("/api", appRouter);
db.sync();
const errorHandler = async (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).send({
    error: err.stack || err.message || err,
    message: "Internal Server Error",
  });
};

app.use(errorHandler);

app.listen(3001, () => {
  console.log("Server listen PORT:", 3001);
});
