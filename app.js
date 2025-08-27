require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require("./models/blog");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB connection
mongoose
  .connect("process.env.MONGO_URL")//mongodb://localhost:27017/blogify
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

// View engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

// Make user globally available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.active = res.locals.active || ""; // default empty
  next();
});


// Routes
app.get("/", async (req, res) => {
  try {
    const allBlogs = await Blog.find({}).populate("createdBy");
    res.render("home", {
      blogs: allBlogs,
      active: "home", //  pass active page
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


app.use("/user", userRoute);
app.use("/blog", blogRoute);

// Start server
app.listen(PORT, () => console.log(`✅ Server started at PORT ${PORT}`));
