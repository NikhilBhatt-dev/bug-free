require("dotenv").config();

const app = require("./app");
const { validateEnvironment } = require("./config/env");

const port = Number(process.env.PORT) || 5000;

validateEnvironment();

app.listen(port, () => {
  console.log(`JobPilot API listening on port ${port}`);
});
