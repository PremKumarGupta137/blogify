const { Router } = require("express");
const multer = require("multer");
const User = require("../models/user");
const { uploadBufferToCloudinary } = require("../services/cloudinary");
const { createTokenForUser } = require("../services/authentication");

const router = Router();

// Multer setup — buffer in memory, forwarded to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

router.get("/signup", (req, res) => {
  res.render("signup", { active: "signup" });
});

router.get("/signin", (req, res) => {
  res.render("signin", { active: "signin" });
});


// Sign up with optional profile image
router.post("/signup", upload.single("profileImage"), async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.render("signup", { active: "signup", error: "All fields are required." });
  }

  try {
    let profileImageURL = "/images/default.png";
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "blogify/profiles");
      profileImageURL = result.secure_url;
    }

    await User.create({ fullName, email, password, profileImageURL });
    res.redirect("/user/signin");
  } catch (err) {
    if (err.code === 11000) {
      return res.render("signup", { active: "signup", error: "An account with that email already exists." });
    }
    console.error(err);
    res.render("signup", { active: "signup", error: "Signup failed. Please try again." });
  }
});

// Sign in
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);
    res.cookie("token", token, { httpOnly: true }).redirect("/");
  } catch (err) {
    res.render("signin", { active: "signin", error: "Incorrect Email or Password" });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/");
});

// Edit profile (name + photo)
router.get("/edit", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  const user = await User.findById(req.user._id);
  res.render("editProfile", { active: "", profile: user });
});

router.post("/edit", upload.single("profileImage"), async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect("/user/signin");

    const { fullName } = req.body;
    if (!fullName) {
      return res.render("editProfile", { active: "", profile: user, error: "Full name is required." });
    }

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "blogify/profiles");
      user.profileImageURL = result.secure_url;
    }

    user.fullName = fullName;
    await user.save();

    // Re-issue the token so the new name/photo show up immediately (they're baked into the JWT).
    const token = createTokenForUser(user);
    res
      .cookie("token", token, { httpOnly: true })
      .redirect(`/user/edit?msg=${encodeURIComponent("Profile updated.")}`);
  } catch (err) {
    console.error(err);
    res.render("editProfile", { active: "", profile: req.user, error: "Update failed. Please try again." });
  }
});

module.exports = router;
