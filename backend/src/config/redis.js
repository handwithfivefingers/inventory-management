const Redis = require("ioredis");

const redisClient = new Redis(`redis://localhost:6379`, {
  enableOfflineQueue: false,
  retryStrategy: () => 5000,
//   tls: {},
});

redisClient.on("error", (err) => {
  console.log("Redis error ", err);
});

redisClient.on("connect", () => {
  console.log("Redis connection has been established successfully");
});

module.exports = redisClient;
