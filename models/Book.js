import mongoose from "mongoose";

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

export default mongoose.model("Book", bookSchema);