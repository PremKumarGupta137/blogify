const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve("./public/uploads/")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Add new blog
router.get("/add-new", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  res.render("addBlog", {
    active: "add-blog", // mark Add Blog as active
  });
});


// Create blog
router.post("/", upload.single("coverImage"), async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const { title, body } = req.body;
    const coverImageURL = req.file ? `/uploads/${req.file.filename}` : "";

    const blog = await Blog.create({
      title,
      body,
      coverImageURL,
      createdBy: req.user._id,
    });

    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating blog");
  }
});

// View blog with comments
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");
    res.render("blog", { blog, comments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Blog not found");
  }
});

// Add comment
router.post("/comment/:blogId", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });

  res.redirect(`/blog/${req.params.blogId}`);
});

module.exports = router;
