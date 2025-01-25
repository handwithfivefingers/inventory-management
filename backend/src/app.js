const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  "@src": __dirname + "/",
  "@libs": __dirname + "/libs",
  "@db": __dirname + "/database",
  "@api": __dirname + "/api",
  "@constant": __dirname + "/constant",
  "@middleware": __dirname + "/middleware",
  "@validator": __dirname + "/validator",
  "@config": __dirname + "/config",
});
moduleAlias();
require("@config/sentry");
const express = require("express");
const cors = require("cors");
const parser = require("cookie-parser");
const db = require("@db");
const morgan = require("morgan");
const helmet = require("helmet");
const appRouter = require("@api/routes");
const app = express();
const Sentry = require("@sentry/node");

app.use(
  express.json({
    limit: "50mb",
  })
);
app.use(parser());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(helmet());
app.use("/api", appRouter);

Sentry.setupExpressErrorHandler(app);

const errorHandler = async (err, req, res, next) => {
  console.log("errorHandler ---------------", err);
  if (res.headersSent) {
    return next(err);
  }
  res.statusCode = 400;
  res.json({ message: err.message });
  // res.end(res.sentry + "\n");
};

app.use(errorHandler);
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});
app.listen(3001, () => {
  require("./config/redis"); // Auto register redis
  db.sync();
  console.log("Server listen PORT:", 3001);
});
