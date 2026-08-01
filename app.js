require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require("./models/blog");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");
const { estimateReadingTime } = require("./services/helpers");

const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

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
  res.locals.flash = typeof req.query.msg === "string" ? req.query.msg : null;
  next();
});


// Routes
app.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const tag = (req.query.tag || "").trim().toLowerCase();
    const isAdmin = req.user && req.user.role === "ADMIN";

    // Visibility: everyone sees published posts; the admin also sees their own drafts.
    const visibility = isAdmin
      ? { $or: [{ status: "published" }, { status: "draft", createdBy: req.user._id }] }
      : { status: "published" };

    const filters = [visibility];
    if (tag) filters.push({ tags: tag });
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filters.push({ $or: [{ title: regex }, { body: regex }, { tags: regex }] });
    }

    const allBlogs = await Blog.find({ $and: filters })
      .sort({ createdAt: -1 })
      .populate("createdBy");

    const allTags = await Blog.distinct("tags", { status: "published" });

    res.render("home", {
      blogs: allBlogs,
      tags: allTags.sort(),
      q,
      activeTag: tag,
      active: "home", //  pass active page
      estimateReadingTime,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


app.use("/user", userRoute);
app.use("/blog", blogRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", { active: "" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    active: "",
    message: process.env.NODE_ENV === "production" ? "Something went wrong." : err.message,
  });
});

// Start server
app.listen(PORT, () => console.log(`Server started at PORT ${PORT}`));
