require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const Book = require("./models/Book");

const app = express();
app.use(cors());

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running");
});

// save book api

app.post("/books", async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// find book api

app.get("/books", async (req, res) => {

const userId = req.query.userId;

const books = await Book.find({ userId: userId });

res.json(books);

});

app.get("/books/:id", async (req, res) => {

  try {
    const book = await Book.findById(req.params.id);
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//update book api

app.put("/books/:id", async (req, res) => {
  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updatedBook);
});

//delete book api

app.delete('/books/:id', async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const User = require("./models/User");

// signup api

app.post("/signup", async (req, res) => {

const { username, email, password } = req.body;

try {

const existingUser = await User.findOne({ email });

if(existingUser){
return res.json({ message: "User already exists" });
}

const user = new User({
username,
email,
password
});

await user.save();

res.json({ message: "Signup successful" });

} catch(error){

res.status(500).json({ error: error.message });

}

});
// login api

app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });

    if(!user){
      return res.json({ message: "User not found" });
    }

    if(user.password !== password){
      return res.json({ message: "Incorrect password" });
    }

   res.json({
message: "Login successful",
userId: user._id,
username: user.username,
email: user.email
});

  } catch(error){
    res.status(500).json({ error: error.message });
  }

});

