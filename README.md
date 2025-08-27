# 📝 Blogify  
Blogify is a full-stack blogging application built using Node.js, Express, EJS, and MongoDB. It allows users to create, edit, and view blogs with user authentication and profile management.  

## 🚀 Features
- ✅ User Authentication (Login/Register)
- ✅ Create, Edit, Delete Blogs
- ✅ Responsive UI
- ✅ Secure Authentication with JWT & Cookies

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository:
```bash
git clone https://github.com/PremKumarGupta137/blogging
cd blogify
```
---
### 2️⃣ Install dependencies:
```bash
npm install
```
---
### 3️⃣Create a .env file in the root directory and add:

```ini
PORT=8000
MONGO_URI=your-mongodb-connection-string
SESSION_SECRET=your-secret-key
```
---
### 4️⃣ Run the application:
```bash
npm start
```
---
### 5️⃣ Open your browser and visit:
```aurdino
http://localhost:8000
```
---
### 📂 Folder Structure
```csharp
blogify/
│
├── views/        # EJS Templates
├── public/       # Static Files (CSS, JS, Images)
├── routes/       # Route Files
├── models/       # MongoDB Models
├── controllers/  # Controller Logic
├── app.js        # Main App File
└── package.json
```
---
### 💡Future Enhancements
- 🔍 Search Functionality for blogs
- 🖼 Image Upload Feature for blogs
- 👍 Like & Comment System
- 👤 User Profile Page
- 🏷 Tags & Categories for blogs



