// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   username: String,
//   email: String,
//   password: String
// });

// export default mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

module.exports = mongoose.model("User", userSchema);