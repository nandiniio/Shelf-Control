const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: String,
  image: String,
  author: String,
  list: String,
  status: String,
  dateAdded: {
    type: Date,
    default: Date.now
  },
  review: {
  type: String,
  default: ""
}, 
userId: String 
});

module.exports = mongoose.model("Book", bookSchema);