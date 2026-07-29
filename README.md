# Blogify

A full-stack blogging platform — sign up, write posts with a cover image, and comment on
other people's posts. Server-rendered with EJS, backed by MongoDB, with image uploads
streamed straight to Cloudinary so they survive redeploys.

| | |
|---|---|
| **Live app** | [blogging-plrz.onrender.com](https://blogging-plrz.onrender.com) |
| **Repository** | [github.com/PremKumarGupta137/blogify](https://github.com/PremKumarGupta137/blogify) |

> **Note:** the free Render instance sleeps after 15 minutes of inactivity — the first load
> after a quiet spell can take 30–60 seconds while it wakes up.

---

## Tech stack

**Backend** — Node.js · Express · Mongoose (MongoDB) · JWT (cookie-based sessions) · Multer
(in-memory) · Cloudinary (image storage)
**Frontend** — Server-rendered EJS views · vanilla CSS design system (`public/css/style.css`)
**Infrastructure** — MongoDB Atlas (database) · Cloudinary (media) · Render (app hosting)

No frontend framework or build step — Express renders EJS templates directly, so there's one
service to deploy, not two.

---

## Architecture

```
┌──────────────┐     HTTPS      ┌──────────────────────┐
│   Browser    │ ─────────────► │  Express (EJS views)  │
│              │ ◄───────────── │       (Render)         │
└──────────────┘   HTML pages   └──────┬───────────┬────┘
                                        │           │
                                Mongoose│           │Cloudinary SDK
                                        ▼           ▼
                              ┌──────────────┐  ┌────────────┐
                              │ MongoDB Atlas │  │ Cloudinary │
                              └──────────────┘  └────────────┘
```

### Request pipeline

```
dotenv → express.urlencoded → cookieParser → checkForAuthenticationCookie(JWT)
       → route handler → view render (EJS)
       → notFoundHandler (404) → errorHandler (500)
```

- **`checkForAuthenticationCookie`** reads the `token` cookie, verifies the JWT, and attaches
  `req.user` if valid — silently continues as a guest if the cookie is missing or invalid.
- Every view gets `res.locals.user` and `res.locals.active` (for nav highlighting), set once
  in `app.js` rather than passed manually to every `res.render`.
- **`notFoundHandler`** and **`errorHandler`** are the last two middlewares in the chain, so
  any unmatched route or thrown error renders a proper page (`views/404.ejs`,
  `views/error.ejs`) instead of Express's default HTML stack trace.

---

## Two decisions worth explaining

### 1. Uploads go to Cloudinary, never to local disk

Multer is configured with `memoryStorage()`, not `diskStorage()`. The file buffer is streamed
directly to Cloudinary (`services/cloudinary.js`) and only the resulting `secure_url` is
saved to MongoDB.

This matters because most free hosts — Render included — wipe the local filesystem on every
restart or redeploy. A disk-based upload would work at the moment it's created and then
silently 404 the next time the service restarts. Routing through Cloudinary means uploaded
images are decoupled from the app's own lifecycle.

### 2. Passwords: salted HMAC-SHA256, not bcrypt

`models/user.js` generates a random salt per user and hashes the password with
`crypto.createHmac('sha256', salt)` in a `pre('save')` hook — no third-party dependency, uses
Node's built-in `crypto`. It's a legitimate approach (unique salt defeats rainbow tables), but
it lacks bcrypt's deliberate slowness, which is what makes bcrypt resistant to brute-force
attempts at scale. Fine for this project's scope; worth swapping to bcrypt before handling
real user data at volume.

---

## Pages & routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | any | Home feed — all posts, newest first |
| GET | `/user/signup` | any | Signup form |
| POST | `/user/signup` | any | Create account (optional profile photo) |
| GET | `/user/signin` | any | Signin form |
| POST | `/user/signin` | any | Authenticate, sets `token` cookie |
| GET | `/user/logout` | any | Clears the session cookie |
| GET | `/blog/add-new` | signed in | New post form |
| POST | `/blog` | signed in | Create a post (optional cover image) |
| GET | `/blog/:id` | any | Read a post + its comments |
| POST | `/blog/comment/:blogId` | signed in | Add a comment to a post |

Unauthenticated requests to protected pages redirect to `/user/signin` rather than erroring.

---

## Running locally

**Prerequisites:** Node 18+, a MongoDB connection (local install or a free
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster), and a free
[Cloudinary](https://cloudinary.com) account for image uploads.

```bash
git clone https://github.com/PremKumarGupta137/blogify.git
cd blogify
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

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signing key for session tokens |
| `PORT` | no (`8000`) | Listen port; Render injects this in production |
| `NODE_ENV` | no | `production` suppresses internal error detail |
| `CLOUDINARY_CLOUD_NAME` | yes | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | yes | Cloudinary API secret |

`.env` is gitignored; `.env.example` is the committed template. No secret lives in the
repository or commit history.

---

## Deployment

Three free services, no card required. Deploy in this order — each step needs credentials
from the previous one.

### 1. Database — MongoDB Atlas

1. Create a free **M0** cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user (username + password).
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) — Render's free tier has
   no static IP to allowlist instead.
4. Click **Connect → Drivers**, copy the connection string, and insert your database name:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/blogify?retryWrites=true&w=majority
   ```

### 2. Images — Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com) (free, no card).
2. From the dashboard, copy **Cloud name**, **API Key**, and **API Secret**.

### 3. App — Render

1. **New → Web Service**, connect this repo.
2. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start`
3. Environment variables:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | Atlas connection string from step 1 |
   | `JWT_SECRET` | long random string (same generator command as above) |
   | `NODE_ENV` | `production` |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
   | `CLOUDINARY_API_KEY` | from Cloudinary |
   | `CLOUDINARY_API_SECRET` | from Cloudinary |

4. Deploy. Render builds and starts the service automatically on every push to `main`.

`render.yaml` in the repo root declares this same setup as a Blueprint (**New → Blueprint**)
if you prefer one-click provisioning over manual settings.

---

## Known limitations

- **Passwords use salted HMAC-SHA256, not bcrypt** — see "Two decisions worth explaining"
  above.
- **No password reset or email verification flow.**
- **No pagination on the home feed** — fine at demo scale, would need it for a large post
  count.
- **No automated test suite.**
- **Sessions have no refresh mechanism** — an expired JWT requires signing in again.

---

## Repository layout

```
blogify/
├── app.js                    # middleware chain, route mounting, error handlers
├── middlewares/
│   └── authentication.js     # reads + validates the JWT cookie
├── services/
│   ├── authentication.js     # JWT sign/verify
│   └── cloudinary.js         # buffer → Cloudinary upload helper
├── models/                   # Mongoose schemas: user, blog, comment
├── routes/                   # user + blog routers
├── views/                    # EJS templates + partials (nav, head, footer)
├── public/
│   ├── css/style.css         # design tokens + component styles
│   └── images/default.png    # fallback avatar
├── render.yaml                # Render Blueprint
└── .env.example
```
