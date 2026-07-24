# 🧠 Pattern Vault — The Interview Bible

> **Codename:** Project Disguise  
> **Purpose:** Technical interview preparation material detailing every concept, pattern, and architectural decision used in Pattern Vault.  
> **Branch Analyzed:** `main` (Latest Version)

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Node.js & Runtime Concepts](#2-nodejs--runtime-concepts)
3. [Express.js Framework Deep Dive](#3-expressjs-framework-deep-dive)
4. [MongoDB & Mongoose (Incl. OCC)](#4-mongodb--mongoose-incl-occ)
5. [Authentication & Security](#5-authentication--security)
6. [Frontend Architecture](#6-frontend-architecture)
7. [File Handling & Storage](#7-file-handling--storage)
8. [Algorithms & Data Structures](#8-algorithms--data-structures)
9. [Interview Questions & Answers](#9-interview-questions--answers)

---

## 1. Tech Stack Overview

Pattern Vault utilizes a customized **MEVN Stack** variant (MongoDB, Express, Vanilla JS, Node.js). 

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, custom CSS (`kuizu-theme.css`, `style.css`), DOMPurify, Marked.js.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB Atlas (NoSQL) with Mongoose ODM.
- **Security:** bcrypt (password hashing), jsonwebtoken (JWT), HttpOnly Cookies.
- **File Handling:** Multer.

---

## 2. Node.js & Runtime Concepts

### Event-Driven, Non-Blocking I/O
Node.js operates on a single-threaded event loop. In Pattern Vault, when `server.js` queries MongoDB (e.g., `await User.findOne()`), the main thread doesn't stop. It registers a callback/promise and moves on to serve other HTTP requests, handling the DB result once it returns.

### Environment Variables (`.env`)
Secrets are never hardcoded. `dotenv` loads variables from a `.env` file into `process.env`.
- `MONGO_URI`: The connection string for the database.
- `JWT_SECRET`: The cryptographic key used to sign and verify JSON Web Tokens.

---

## 3. Express.js Framework Deep Dive

### The Middleware Pipeline
Express is essentially a pipeline of middleware functions that modify the `req` (request) and `res` (response) objects before sending a final response.

1. **`express.json()`**: Parses incoming JSON payloads and attaches them to `req.body`.
2. **`cookieParser()`**: Parses `Cookie` headers and populates `req.cookies`. Critical for the new HTTP-only auth flow.
3. **`express.static('public')`**: Serves static HTML, CSS, and JS files without needing manual route definitions.

### Routing Architecture
Pattern Vault uses Express Routers (`express.Router()`) to modularize concerns:
- `auth.js` (Auth logic)
- `leaderboard.js` (Rankings)
- `pages.js` (Markdown documents)
- `albums.js` (Photo galleries)
- `groups.js` (Collaboration)

---

## 4. MongoDB & Mongoose (Incl. OCC)

### NoSQL vs SQL
MongoDB is a document-based NoSQL database. Instead of rigid tables, it stores JSON-like BSON documents. This is perfect for the Vault, where documents (like `User`) have varying array lengths (like `groups`, `personal_photos`).

### Mongoose ODM & Validation
Mongoose provides structure on top of MongoDB:
- **Schemas**: Enforce data types and constraints (e.g., `email: { type: String, unique: true, required: true }`).
- **References & Population**: The `Group` schema has an array of `ObjectId`s pointing to Users. `User.populate('groups')` resolves these IDs into actual Group objects.

### Optimistic Concurrency Control (OCC)
In `pages.js`, multiple users might edit a shared document simultaneously. Pattern Vault solves this using OCC via Mongoose's native `__v` (version) field.
- **Read**: Client fetches page and its `__v`.
- **Write**: Client sends update with `__v`.
- **Backend**: `Page.findOneAndUpdate({ _id: id, __v: version }, ...)`
- **Result**: If the version matches, the document updates and `__v` increments. If it doesn't match, it means another user edited it first, and the backend returns a `409 Conflict`.

---

## 5. Authentication & Security

### JSON Web Tokens (JWT)
JWTs are stateless auth tokens. 
1. Server signs a payload (`{ id: user._id }`) using `JWT_SECRET`.
2. Server sends token to client.
3. Client sends token back on subsequent requests.
4. Server verifies signature mathematically. No database lookup required to know *who* the user is.

### HttpOnly Cookies (Upgraded Security)
In older branches, JWTs were stored in `localStorage`. In the `main` branch, security is upgraded:
- `res.cookie('token', token, { httpOnly: true, secure: true })`
- **HttpOnly** prevents JavaScript from accessing the cookie, meaning even if an attacker injects malicious JS (XSS), they cannot steal the token.
- A secondary cookie `isAuthenticated=true` is used just so the frontend UI knows the login state.

### Password Hashing (bcrypt)
Passwords are never saved as plain text. 
- **Salting**: Adding random strings to passwords before hashing to defeat rainbow tables.
- **Hashing**: A one-way mathematical function. `bcrypt.compare()` compares the plain text input against the stored hash.

### DOMPurify
Used in the Markdown editor to sanitize HTML output before rendering it to the DOM, preventing Cross-Site Scripting (XSS) attacks.

---

## 6. Frontend Architecture

### Multi-Page + SPA Hybrid
The application architecture is a hybrid:
1. **Multi-Page Application (MPA)**: `landing.html`, `login.html`, `leaderboard.html`. These rely on browser navigation. Better for SEO and clear separation of public logic.
2. **Single Page Application (SPA)**: `app.html` (The Quiz + Vault). Once loaded, JavaScript manipulates the DOM dynamically to swap between "screens" (loading → captcha → intro → quiz → vault) without refreshing the page.

### Intersection Observers (`landing.js`)
Used on the landing page for scroll animations (`kz-animate`). The observer watches when an element enters the viewport and adds a `visible` class, triggering a CSS transition. Highly performant compared to binding scroll event listeners.

### Theming System
The UI utilizes CSS Variables (Custom Properties) heavily in `kuizu-theme.css`. Changing themes is as simple as overriding a `:root` variable like `--primary-color`.

---

## 7. File Handling & Storage

### Multer Middleware
Multer processes `multipart/form-data` (the encoding used for file uploads).
- **`diskStorage`**: Configured to save files locally in `public/uploads/`.
- **`upload.single('photo')`** vs **`upload.array('photos', 20)`**: Handles singular profile/vault photos versus batch uploads for Albums.
- File names are prefixed with `Date.now()` to prevent collisions.

---

## 8. Algorithms & Data Structures

### The Fisher-Yates Shuffle (`quiz-logic.js`)
When generating quiz questions, options must be randomized so the correct answer isn't always in the same spot. Fisher-Yates achieves this in $O(n)$ time by iterating backwards and swapping elements with random indices.

### The QWERTY Cipher
A deterministic mapping that maps characters to fixed sets based on keyboard layout. It extracts five letters from an email, maps them to Zones (A, B, C, D), and generates the required pattern. Time complexity is $O(1)$ because the output length is fixed at five.

The complete contract lives in `shared/qwerty-cipher.js`. Node.js imports this file directly, while the browser loads the same file from `/shared/qwerty-cipher.js`; therefore normalization, fallback handling, padding, and zone mapping have one source of truth. The server remains responsible for deriving the expected pattern from the authenticated user's stored email and for rejecting malformed submissions. Because browser code is inspectable, the cipher is an unlock-flow rule—not a replacement for authentication or a secret cryptographic key.

---

## 9. Interview Questions & Answers

**Q: Why use HttpOnly cookies instead of localStorage for JWTs?**
> A: LocalStorage is accessible by any JavaScript running on the page, making it highly vulnerable to Cross-Site Scripting (XSS) attacks. If an attacker injects a script, they can steal the token. HttpOnly cookies are automatically sent with HTTP requests by the browser, but are completely invisible to JavaScript, neutralizing this threat.

**Q: How does the application handle two users editing the same page simultaneously?**
> A: We implemented Optimistic Concurrency Control (OCC). Every page document has a version number (`__v`). When a client saves an edit, they include the version they were editing. The backend only allows the update if the database version matches the client's version. If it fails, the client is prompted to handle the conflict.

**Q: Explain how the quiz disguise actually works from a technical perspective.**
> A: The quiz tracks every button click (A, B, C, or D). After the fifth question, it sends the sequence to `/verify-pattern`. The authenticated backend derives the expected pattern from the user's stored email with the shared `qwerty-cipher` module and compares it only after validating that the request contains exactly five A–D values. If it matches, the backend sends an unlock signal. If not, the frontend stores a `patternFailed` flag in `sessionStorage` and continues the quiz normally (if > 5 questions), keeping the user entirely unaware of the vault's existence.

**Q: Why use Multer? How are file collisions prevented?**
> A: Express cannot natively parse `multipart/form-data`. Multer buffers the incoming file stream and writes it to disk. Collisions are prevented by modifying the filename using `Date.now()` and a random number generator before appending the original extension, guaranteeing uniqueness.

**Q: What is the purpose of DOMPurify in this project?**
> A: The vault includes a Markdown editor. Marked.js converts the markdown to HTML, which we then inject into the DOM using `innerHTML`. This is dangerous. If a user wrote `<script>alert('hack')</script>`, it would execute. DOMPurify strips out any dangerous tags or attributes before the HTML hits the DOM.

---

> **End of Theory.md**  
> Review these concepts thoroughly before discussing the architecture of Pattern Vault.
