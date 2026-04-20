// app.get("/", (req, res) => {
//   res.send("Backend is running 🚀");
// });

const BASE_URL = "https://shelf-control-dgex.onrender.com";
fetch(`${BASE_URL}/login`)
fetch(`${BASE_URL}/signup`)
fetch(`${BASE_URL}/books`)

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import Book from "./models/Book.js";
import User from "./models/User.js";

// console.log("TEST:", process.env.TEST_VAR);
console.log("MONGO:", process.env.MONGO_URI);

const app = express();
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});
// middleware
app.use(cors());
app.use(express.json());

// DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("Mongo Error:", err));

// ------------------ BOOK ROUTES ------------------

app.post("/books", async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.json(book);
  } catch (error) {
    console.log("BOOK CREATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/books", async (req, res) => {
  try {
    const userId = req.query.userId;
    const books = await Book.find({ userId });
    res.json(books);
  } catch (error) {
    console.log("BOOK FETCH ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/books/:id", async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedBook);
  } catch (error) {
    console.log("BOOK UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/books/:id", async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    console.log("BOOK DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------ AUTH ROUTES ------------------

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    console.log("SIGNUP BODY:", req.body);

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ message: "User already exists" });
    }

    const user = new User({ username, email, password });
    await user.save();

    res.json({ message: "Signup successful" });

  } catch (error) {
    console.log("SIGNUP ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    console.log("FOUND USER:", user);

    if (!user) {
      return res.json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ message: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      userId: user._id,
      username: user.username,
      email: user.email
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});