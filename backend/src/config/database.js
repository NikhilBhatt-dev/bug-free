const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI must be set before starting the API");
  }

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", { message: error.message });
  });

  await mongoose.connect(uri, {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    serverSelectionTimeoutMS: 10000,
  });

  console.log("Connected to MongoDB");
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
