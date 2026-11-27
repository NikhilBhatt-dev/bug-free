require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { validateEnvironment } = require("./config/env");
const { configurePassport } = require("./config/passport");
const { configureCloudinary } = require("./config/cloudinary");
const emailWorker = require("./services/email.worker");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  validateEnvironment();
  configurePassport();
  configureCloudinary();
  await connectDatabase();
  emailWorker.startWorker();

  const server = app.listen(port, () => {
    console.log(`JobPilot API listening on port ${port}`);
  });

  let shuttingDown = false;
  async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`JobPilot API received ${signal}; persisting worker state`);
    await emailWorker.stopWorker();
    server.close(() => process.exit(0));
  }
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer().catch((error) => {
  console.error("Unable to start JobPilot API", { message: error.message });
  process.exit(1);
});
