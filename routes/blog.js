const { Router } = require("express");
const multer = require("multer");
const Blog = require("../models/blog");
const Comment = require("../models/comment");
const { uploadBufferToCloudinary } = require("../services/cloudinary");
const { estimateReadingTime, parseTags } = require("../services/helpers");

const router = Router();

// Multer setup — buffer in memory, forwarded to Cloudinary (no local disk writes,
// so uploads survive redeploys/restarts on hosts with ephemeral filesystems)
const upload = multer({ storage: multer.memoryStorage() });

function isOwner(blog, user) {
  if (!user || user.role !== "ADMIN") return false;
  const ownerId = blog.createdBy && blog.createdBy._id ? blog.createdBy._id : blog.createdBy;
  return String(ownerId) === String(user._id);
}

// Add new blog — only the site admin publishes posts here
router.get("/add-new", (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  if (req.user.role !== "ADMIN") return res.status(403).render("error", { active: "", code: 403, message: "Only the site admin can write posts." });

  res.render("addBlog", {
    active: "add-blog", // mark Add Blog as active
    blog: null,
  });
});

// Create blog
router.post("/", upload.single("coverImage"), async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  if (req.user.role !== "ADMIN") return res.status(403).render("error", { active: "", code: 403, message: "Only the site admin can write posts." });

  try {
    const { title, body, tags } = req.body;
    if (!title || !body) {
      return res.render("addBlog", { active: "add-blog", blog: null, error: "Title and body are required." });
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
      tags: parseTags(tags),
      status: req.body.status === "draft" ? "draft" : "published",
      createdBy: req.user._id,
    });

    const msg = blog.status === "draft" ? "Draft saved." : "Post published.";
    res.redirect(`/blog/${blog._id}?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.status(500).render("addBlog", { active: "add-blog", blog: null, error: "Error creating blog. Please try again." });
  }
});

// Edit blog form
router.get("/edit/:id", async (req, res, next) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).render("404", { active: "" });
    if (!isOwner(blog, req.user)) return res.status(403).render("error", { active: "", code: 403, message: "You can't edit this post." });

    res.render("addBlog", { active: "add-blog", blog });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404", { active: "" });
    next(err);
  }
});

// Update blog
router.post("/edit/:id", upload.single("coverImage"), async (req, res, next) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).render("404", { active: "" });
    if (!isOwner(blog, req.user)) return res.status(403).render("error", { active: "", code: 403, message: "You can't edit this post." });

    const { title, body, tags } = req.body;
    if (!title || !body) {
      return res.render("addBlog", { active: "add-blog", blog, error: "Title and body are required." });
    }

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "blogify/covers");
      blog.coverImageURL = result.secure_url;
    }

    blog.title = title;
    blog.body = body;
    blog.tags = parseTags(tags);
    blog.status = req.body.status === "draft" ? "draft" : "published";
    await blog.save();

    res.redirect(`/blog/${blog._id}?msg=${encodeURIComponent("Post updated.")}`);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404", { active: "" });
    next(err);
  }
});

// Delete blog
router.post("/delete/:id", async (req, res, next) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).render("404", { active: "" });
    if (!isOwner(blog, req.user)) return res.status(403).render("error", { active: "", code: 403, message: "You can't delete this post." });

    await Comment.deleteMany({ blogId: blog._id });
    await blog.deleteOne();

    res.redirect(`/?msg=${encodeURIComponent("Post deleted.")}`);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404", { active: "" });
    next(err);
  }
});

// View blog with comments
router.get("/:id", async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    if (!blog) return res.status(404).render("404", { active: "" });

    const owner = isOwner(blog, req.user);
    if (blog.status === "draft" && !owner) {
      return res.status(404).render("404", { active: "" });
    }

    // Don't inflate the count when the author is viewing their own post.
    if (!owner) {
      blog.views += 1;
      await blog.save();
    }

    const comments = await Comment.find({ blogId: req.params.id })
      .sort({ createdAt: -1 })
      .populate("createdBy");

    res.render("blog", {
      blog,
      comments,
      owner,
      readingTime: estimateReadingTime(blog.body),
    });
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

// Delete comment — the comment's author or the blog's owner can remove it
router.post("/comment/delete/:commentId", async (req, res, next) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).render("404", { active: "" });

    const blog = await Blog.findById(comment.blogId);
    const canDelete =
      String(comment.createdBy) === String(req.user._id) || (blog && isOwner(blog, req.user));

    if (!canDelete) return res.status(403).render("error", { active: "", code: 403, message: "You can't delete this comment." });

    await comment.deleteOne();
    res.redirect(`/blog/${comment.blogId}?msg=${encodeURIComponent("Comment deleted.")}`);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).render("404", { active: "" });
    next(err);
  }
});

module.exports = router;
