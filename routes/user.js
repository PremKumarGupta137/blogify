const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/user");

const router = Router();

// Multer setup for profile image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve("./public/uploads/"));
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});
const upload = multer({ storage });

router.get("/signup", (req, res) => {
  res.render("signup", { active: "signup" });
});

router.get("/signin", (req, res) => {
  res.render("signin", { active: "signin" });
});


// Sign up with optional profile image
router.post("/signup", upload.single("profileImage"), async (req, res) => {
  const { fullName, email, password } = req.body;
  let profileImageURL = "/images/default.png";
  if (req.file) {
    profileImageURL = `/uploads/${req.file.filename}`;
  }

  try {
    await User.create({
      fullName,
      email,
      password,
      profileImageURL,
    });
    res.redirect("/user/signin");
  } catch (err) {
    console.error(err);
    res.render("signup", { error: "Signup failed. Try again." });
  }
});

// Sign in
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);
    res.cookie("token", token).redirect("/");
  } catch (err) {
    res.render("signin", { error: "Incorrect Email or Password" });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/");
});

module.exports = router;
