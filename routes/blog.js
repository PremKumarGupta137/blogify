const { Router } = require("express");
const multer = require("multer");
const Blog = require("../models/blog");
const Comment = require("../models/comment");
const { uploadBufferToCloudinary } = require("../services/cloudinary");

const router = Router();

// Multer setup — buffer in memory, forwarded to Cloudinary (no local disk writes,
// so uploads survive redeploys/restarts on hosts with ephemeral filesystems)
const upload = multer({ storage: multer.memoryStorage() });

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
    if (!title || !body) {
      return res.render("addBlog", { active: "add-blog", error: "Title and body are required." });
    }

    let coverImageURL = "";
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "blogify/covers");
      coverImageURL = result.secure_url;
    }

    const blog = await Blog.create({
      title,
      body,
      coverImageURL,
      createdBy: req.user._id,
    });

    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render("addBlog", { active: "add-blog", error: "Error creating blog. Please try again." });
  }
});

// View blog with comments
router.get("/:id", async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) return res.status(404).render("404", { active: "" });

    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");
    res.render("blog", { blog, comments });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404", { active: "" });
    next(err);
  }
});

// Add comment
router.post("/comment/:blogId", async (req, res, next) => {
  if (!req.user) return res.redirect("/user/signin");
  if (!req.body.content) return res.redirect(`/blog/${req.params.blogId}`);

  try {
    await Comment.create({
      content: req.body.content,
      blogId: req.params.blogId,
      createdBy: req.user._id,
    });
    res.redirect(`/blog/${req.params.blogId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
