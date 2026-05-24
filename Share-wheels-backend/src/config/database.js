const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB Error:", err.message));

  console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
  if (process.env.MONGO_URI && process.env.MONGO_URI.includes("@")) {
    console.log("Using DB:", process.env.MONGO_URI.split("@")[1]);
  }
};

module.exports = {
  connectDatabase,
};
