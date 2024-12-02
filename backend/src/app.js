const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  "@src": __dirname + "/",
  "@libs": __dirname + "/libs",
  "@db": __dirname + "/database",
  "@api": __dirname + "/api",
  "@constant": __dirname + "/constant",
  "@middleware": __dirname + "/middleware",
  "@validator": __dirname + "/validator",
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
app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);
app.use(morgan("dev"));
app.use(helmet());
app.use("/api", appRouter);
const errorHandler = async (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(400).send({
    error: err.message || err,
    stack: err.stack,
    message: "Internal Server Error",
  });
};

app.use(errorHandler);

app.listen(3001, () => {
  db.connect();
  console.log("Server listen PORT:", 3001);
});
