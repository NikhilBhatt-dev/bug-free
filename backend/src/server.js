require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { validateEnvironment } = require("./config/env");
const { configurePassport } = require("./config/passport");
const { configureCloudinary } = require("./config/cloudinary");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  validateEnvironment();
  configurePassport();
  configureCloudinary();
  await connectDatabase();

  app.listen(port, () => {
    console.log(`JobPilot API listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start JobPilot API", { message: error.message });
  process.exit(1);
});
