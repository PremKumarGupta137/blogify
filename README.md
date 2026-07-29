# Blogify

A simple full-stack blogging platform. Sign up, write posts with a cover image, and comment
on others' posts.

**Tech stack** — Node.js · Express · EJS · MongoDB (Mongoose) · JWT auth (cookie-based) ·
Cloudinary (image uploads)

---

## Running locally

**Prerequisites:** Node 18+, a MongoDB connection (local install or a free
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster), and a free
[Cloudinary](https://cloudinary.com) account for image uploads.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```ini
MONGO_URL=mongodb://localhost:27017/blogify   # or an Atlas connection string
JWT_SECRET=<generate one — see below>
PORT=8000
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=<from Cloudinary dashboard>
CLOUDINARY_API_KEY=<from Cloudinary dashboard>
CLOUDINARY_API_SECRET=<from Cloudinary dashboard>
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
npm run dev
```

Open `http://localhost:8000`.

---

## Why Cloudinary

Uploaded images (blog covers, profile photos) are streamed straight to Cloudinary instead of
written to local disk. Most free hosts (Render, Railway, Fly) wipe the local filesystem on
every restart or redeploy, so disk-based uploads would silently disappear after the first
deploy. Cloudinary's free tier persists them independently of the app's lifecycle.

---

## Deployment

Two free services, no card required.

### 1. Database — MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) — Render's IPs aren't
   static on the free tier.
3. Under **Database Access**, create a database user.
4. Copy the connection string (`mongodb+srv://...`) for `MONGO_URL`.

### 2. Images — Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com).
2. From the dashboard, copy **Cloud name**, **API Key**, and **API Secret**.

### 3. App — Render

1. **New → Web Service**, connect this repo.
2. Settings:
   - **Build Command:** `npm install --include=dev`
   - **Start Command:** `npm run start`
3. Environment variables:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | Atlas connection string |
   | `JWT_SECRET` | long random string |
   | `NODE_ENV` | `production` |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
   | `CLOUDINARY_API_KEY` | from Cloudinary |
   | `CLOUDINARY_API_SECRET` | from Cloudinary |

4. Deploy.

> **Note on `--include=dev`.** Render passes `NODE_ENV=production` into the build step too,
> which makes `npm install` skip `devDependencies` (`nodemon`) by default. `nodemon` isn't
> needed at runtime (`npm start` runs `node app.js` directly), so this only matters if a
> future dev-only build step gets added — flagged here since it caused a build failure in a
> sibling project under the same setup.

`render.yaml` in the repo root declares this same setup as a Blueprint, if you prefer
one-click provisioning (**New → Blueprint**).

> **Render free tier sleeps after 15 minutes of inactivity.** The first request afterwards
> takes 30–60 seconds to wake up.

---

## Known limitations

- Passwords are hashed with a per-user salt + HMAC-SHA256 (not bcrypt). Functionally sound
  for this scope, but bcrypt's deliberate slowness is the stronger choice if this grows
  beyond a demo.
- No password reset or email verification flow.
- No pagination on the home feed — fine at demo scale, would need it for a large post count.
- No automated test suite.
