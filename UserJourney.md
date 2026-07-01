# 🔐 Pattern Vault — The Complete User Journey & Project Handbook

> **Codename:** Project Disguise  
> **Architecture:** Full-stack MEVN-variant (MongoDB · Express · Vanilla JS · Node.js)  
> **Branch Analyzed:** `main` (Latest Version)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture At a Glance](#2-architecture-at-a-glance)
3. [File & Directory Map](#3-file--directory-map)
4. [The Complete User Journey](#4-the-complete-user-journey)
   - Phase 1: Registration (Multi-Page Flow)
   - Phase 2: Login & Authentication
   - Phase 3: The Disguise Layer (Configurable Quiz)
   - Phase 4: Inside the Vault
   - Phase 5: Exit
5. [Data Flow Deep Dive](#5-data-flow-deep-dive)
6. [Backend: Every Route Explained](#6-backend-every-route-explained)
7. [Frontend: Every Module Explained](#7-frontend-every-module-explained)
8. [Database Schema Reference](#8-database-schema-reference)
9. [Security Architecture](#9-security-architecture)
10. [The QWERTY Cipher — How It Works](#10-the-qwerty-cipher--how-it-works)

---

## 1. Project Overview

Pattern Vault is a **full-stack privacy suite disguised as a trivia quiz game**. To the outside observer, the application looks like "MindMaster Trivia" — a fully-featured, multi-page web application with a global leaderboard, user profiles, and customizable quiz settings. But hidden behind a specific **pattern of quiz answers**, the app opens into a fully functional encrypted personal vault.

### The Three Layers

| Layer | What Users See | What Actually Happens |
|-------|---------------|----------------------|
| **🎮 Game Layer** | A multi-page trivia site with a global leaderboard | Serves as a highly convincing camouflage |
| **🔑 Auth Layer** | Standard login + "Verify you're human" quiz | Secretly captures a 5-answer pattern via QWERTY cipher |
| **🔐 Vault Layer** | Never seen by outsiders | Full document editor (with OCC), photo gallery, group collaboration |

### Key Innovation
There is **no visible login button** leading to the vault. The primary way in is by clicking quiz answers in a specific sequence (A, B, C, or D) derived from the user's email via the **QWERTY Cipher** algorithm during the first 5 questions of the quiz. A secret developer shortcut (`Ctrl + Shift + X`) also exists to bypass the quiz.

---

## 2. Architecture At a Glance

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────┐│
│  │ landing.html  │ │ leaderboard   │ │ app.html   ││
│  │ login.html    │ │ .html         │ │ (SPA)      ││
│  │ register.html │ │ profile.html  │ │            ││
│  └───────┬───────┘ └───────┬───────┘ └──────┬─────┘│
│          │                 │                │      │
│  ┌───────┴─────────────────┴────────────────┴────┐ │
│  │               JavaScript Layer                │ │
│  │ landing.js | register.js | leaderboard-page.js│ │
│  │ quiz-logic.js | ui.js | main.js               │ │
│  └───────────────────────┬───────────────────────┘ │
│                          │ fetch() / REST API      │
└──────────────────────────┼─────────────────────────┘
                           │ (Cookies + JWT)
                           ▼
┌──────────────────────────────────────────────────────┐
│                  SERVER (Node.js)                     │
│  server.js ──► Express App                           │
│       │                                               │
│  ┌────┴─────────────────────────────────────┐        │
│  │            Middleware Pipeline             │        │
│  │  express.json() → cookieParser() → Static  │       │
│  └────┬─────────────────────────────────────┘        │
│       │                                               │
│  ┌────┴──────────────────────────────────────┐       │
│  │              Route Layer                   │       │
│  │  /api/auth        → auth.js               │       │
│  │  /api/vault       → vault.js              │       │
│  │  /api/groups      → groups.js             │       │
│  │  /api/pages       → pages.js              │       │
│  │  /api/albums      → albums.js             │       │
│  │  /api/leaderboard → leaderboard.js        │       │
│  └────┬──────────────────────────────────────┘       │
│       │  authMiddleware.js (JWT via Cookies)          │
│  ┌────┴──────────────────────────────────────┐       │
│  │            Model Layer (Mongoose)          │       │
│  │  User.js │ Group.js │ Page.js │ Album.js  │       │
│  └────┬──────────────────────────────────────┘       │
│       │                                               │
└───────┼──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────┐      ┌──────────────────────┐
│   MongoDB Atlas       │      │   Local File System   │
│   (Cloud Database)    │      │   public/uploads/     │
│   - Users (Scores)    │      │   (Photo storage)     │
│   - Groups            │      │                       │
│   - Pages             │      │                       │
│   - Albums            │      │                       │
└──────────────────────┘      └──────────────────────┘
```

---

## 3. File & Directory Map

```
pattern_vault/
├── .env                          # Environment secrets (MONGO_URI, JWT_SECRET)
├── server.js                     # 🚀 APPLICATION ENTRY POINT
│
├── src/                          # Backend source code
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT token verification (reads from cookies)
│   ├── models/
│   │   ├── User.js               # Schema: email, password, displayName, highScore, vault data
│   │   ├── Group.js              # Schema: name, inviteCode, members, shared data
│   │   ├── Page.js               # Schema: title, content, user, group, __v (OCC)
│   │   └── Album.js              # Schema: name, photos, user, group
│   └── routes/
│       ├── auth.js               # Register, Login (HttpOnly cookie), Pattern Verification
│       ├── leaderboard.js        # Global ranking and score submission
│       ├── vault.js              # Personal notes/photos CRUD
│       ├── groups.js             # Collaboration logic
│       ├── pages.js              # Document editor CRUD with OCC
│       └── albums.js             # Photo albums CRUD
│
└── public/                       # Frontend (served statically)
    ├── landing.html              # Main marketing entry point
    ├── index.html                # Auto-redirects to landing.html
    ├── login.html, register.html # Auth pages
    ├── leaderboard.html          # Global rankings UI
    ├── app.html                  # Main SPA (Quiz + Vault)
    ├── about.html, faq.html      # Cover story pages
    ├── css/
    │   ├── kuizu-theme.css       # Modern UI design system for cover story
    │   └── style.css             # Vault UI styles
    ├── js/
    │   ├── landing.js            # Shared UI logic for public pages
    │   ├── leaderboard-page.js   # Fetches and renders rankings
    │   ├── quiz-logic.js         # Cipher map + 300 Qs + Shuffler
    │   ├── register.js           # Registration API handler
    │   └── main.js               # 🧠 CORE SPA LOGIC (Auth, Quiz flow, Vault, Editor)
    └── uploads/                  # User-uploaded photos
```

---

## 4. The Complete User Journey

### Phase 1: Registration (Multi-Page Flow)

```
 landing.html → Clicks "Register Free"
      │
      ▼
 register.html
      │
 User fills: Display Name + Email + Password
      │
      ▼
 register.js → POST /api/auth/register
      │
      ▼
 Backend (auth.js):
   1. Validates display name length
   2. Checks if email exists
   3. Hashes password with bcrypt
   4. Saves new User
      │
      ▼
 Success → Redirects to login.html
```

### Phase 2: Login & Authentication

```
 login.html
      │
 User fills: Email + Password
      │
      ▼
 POST /api/auth/login
      │
      ▼
 Backend:
   1. Verifies credentials
   2. Generates JWT
   3. Sets `token` (HttpOnly Cookie)
   4. Sets `isAuthenticated` (Regular Cookie)
      │
      ▼
 Success → Redirects to app.html
```

### Phase 3: The Disguise Layer (Quiz & Pattern Capture)

The app now utilizes a highly configurable quiz engine with 5, 10, or 20 questions. The secret pattern check always happens after the **5th question**.

```
 app.html
      │
 User configures Quiz: Length (5/10/20), Difficulty, Category
 Clicks "Start Quiz"
      │
      ▼
 [Optional Theater] Loading Screen → Fake Captcha (if first time)
      │
      ▼
 Quiz Starts:
   - User answers questions.
   - For every click, `currentPattern.push(A/B/C/D)` based on button position.
   - Game logic tracks `fakeScore`.
      │
      ▼
 Question 5 Reached:
   - `verifyPatternAndDecide()` called.
   - POST /api/auth/verify-pattern with `currentPattern`.
      │
      ├──✅ PATTERN CORRECT:
      │    → Hide quiz UI, show `#vault-screen`.
      │    → Load Vault Data. (Game discarded).
      │
      └──❌ PATTERN WRONG:
           → Sets `patternFailed = true` (sessionStorage).
           → If Quiz Length = 5: Game Over screen, submit score.
           → If Quiz Length > 5: Quiz continues as a normal game. Vault is permanently locked for this session.
```

### Phase 4: Inside the Vault

Once inside, the UI switches entirely. The user accesses their private or shared data.

- **Markdown Editor**: Supports live preview, auto-save (debounced), undo/redo history stack, and slash commands.
- **Optimistic Concurrency Control (OCC)**: When saving pages, the backend checks the `__v` version field to prevent overlapping edits.
- **Albums**: Grid view for photos, lightbox functionality, and Multer-powered uploads.
- **Groups**: Create/join with a 6-character code, shared notes, shared pages, and shared albums. Admin can delete the group.

### Phase 5: Exit (Logout)

```
 User clicks "Logout" in sidebar
      │
      ▼
 main.js → handleLogout()
      │
      ▼
 POST /api/auth/logout
   → Backend clears HttpOnly `token` cookie and `isAuthenticated` cookie.
   → Frontend clears sessionStorage `patternFailed`.
      │
      ▼
 Reloads page → Redirects to login/landing.
```

---

## 5. Data Flow Deep Dive

### 5.1: Authentication Data Flow (Cookies)

```
Browser                          Server                          Database
────────────────────────────────────────────────────────────────────────────
login.html                       auth.js                         MongoDB
   │                               │                               │
   │── POST /api/auth/login ──────►│                               │
   │   { email, password }         │── User.findOne({ email }) ──►│
   │                               │◄── user document ────────────│
   │                               │                               │
   │                               │── bcrypt.compare(pwd, hash)   │
   │                               │── jwt.sign({ id }, secret)    │
   │                               │                               │
   │◄── 200 OK ────────────────────│                               │
   │    Set-Cookie: token=... (HttpOnly)                           │
   │    Set-Cookie: isAuthenticated=true                           │
```

### 5.2: Pattern Verification Flow

```
Browser (app.html)               Server                          Database
────────────────────────────────────────────────────────────────────────────
main.js                          auth.js                         MongoDB
   │                               │                               │
   │ [User clicks 5 answers]       │                               │
   │                               │                               │
   │── POST /verify-pattern ──────►│                               │
   │   (Browser sends cookies automatically)                       │
   │   { pattern: ["A","B",...] }  │                               │
   │                               │── authMiddleware validates JWT│
   │                               │── User.findById(req.user.id)─►│
   │                               │◄── user document ────────────│
   │                               │                               │
   │                               │── expected = getPattern(email)│
   │                               │── compare patterns            │
   │                               │                               │
   │◄── 200 { unlocked: true/false}│                               │
```

### 5.3: Page Edit Data Flow (With OCC)

```
Browser (app.html)               Server                          Database
────────────────────────────────────────────────────────────────────────────
main.js                          pages.js                        MongoDB
   │                               │                               │
   │ [User edits text]             │                               │
   │ [Debounce triggers save]      │                               │
   │                               │                               │
   │── PUT /api/pages/:id ────────►│                               │
   │   { title, content, version } │                               │
   │                               │── Page.findOneAndUpdate(      │
   │                               │     { _id, __v: version },  ──►
   │                               │     { $set, $inc: {__v: 1}} ) │
   │                               │◄── Updated Page OR null ──────│
   │                               │                               │
   │◄── 200 OK (Success) ─────────│   (If null: 409 Conflict)      │
```

---

## 6. Backend: Every Route Explained

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/register` | ❌ | Create user, hash password, validate displayName |
| POST | `/login` | ❌ | Authenticate, generate JWT, set HttpOnly Cookies |
| POST | `/logout` | ❌ | Clear authentication cookies |
| POST | `/verify-pattern`| ✅ | Compare 5-char QWERTY pattern to unlock vault |
| GET | `/` | ✅ | Get current user profile (token validation) |

### Leaderboard Routes (`/api/leaderboard`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | ❌ | Get top 50 users sorted by highScore |
| GET | `/my-rank` | ✅ | Calculate current user's rank position |
| POST | `/submit` | ✅ | Update highScore and totalGamesPlayed |

### Vault & Shared Resources

- **`/api/vault`**: Legacy/personal routes. `GET /personal` fetches personal notes, photos, and populated groups. `POST /upload` handles single photo uploads.
- **`/api/groups`**: CRUD for collaboration. `POST /create`, `POST /join`, `POST /:id/notes`, `POST /:id/leave`, `DELETE /:id` (admin only).
- **`/api/pages`**: Markdown document CRUD. `PUT /:id` implements Optimistic Concurrency Control using the `__v` version field.
- **`/api/albums`**: Photo gallery CRUD. `POST /:id/upload` uses Multer for multi-file (max 20) uploads.

---

## 7. Frontend: Every Module Explained

### `landing.js` & `leaderboard-page.js`
- **`landing.js`**: Shared logic for public pages. Handles the scroll-based transparent navbar, hamburger menu, intersection observer animations (`kz-animate`), and the cycling quiz mockup on the landing page.
- **`leaderboard-page.js`**: Fetches the global top 50 users and renders the podium UI and list UI.

### `quiz-logic.js` (The Quiz Engine)
- Contains the `Cipher.map` (QWERTY layout).
- Contains a massive `questionBank` (300 questions across 4 domains and 3 difficulties).
- `getNewRound()` filters questions and uses the Fisher-Yates algorithm to randomize answer positions.

### `main.js` (The Application Core - 1400+ lines)
The brain of the SPA (`app.html`). Manages:
- **State**: `currentPattern`, `currentContext`, `quizLength`, `fakeScore`.
- **Initialization**: Validates token automatically and fetches user info.
- **Quiz Flow**: Handles settings, game loop, and the critical 5th-question pattern check.
- **Vault Logic**: Context switching (Personal vs Group), rendering albums and pages.
- **Editor**: Implements the markdown editor with debounced auto-saves and OCC version handling.

---

## 8. Database Schema Reference

### User Schema (`User.js`)
```javascript
{
  email:            String, required, unique
  password:         String, required (bcrypt)
  displayName:      String, required, max 30
  highScore:        Number, default 0
  totalGamesPlayed: Number, default 0
  personal_notes:   String
  personal_photos:  [String]
  groups:           [ObjectId → Group]
} // + timestamps
```

### Page Schema (`Page.js`)
```javascript
{
  user:       ObjectId → User, required
  group:      ObjectId → Group (null = personal)
  title:      String
  content:    String
  lastEdited: Date
} // Native Mongoose __v field used for OCC versioning
```

---

## 9. Security Architecture

### Authentication Mechanism (Upgraded)
- **HttpOnly Cookies**: The JWT is delivered via a `Set-Cookie: token=...; HttpOnly` header. This prevents JavaScript (`document.cookie`) from accessing the token, entirely mitigating Cross-Site Scripting (XSS) token theft.
- **`isAuthenticated` Cookie**: A secondary, non-HttpOnly boolean cookie is set purely for the frontend UI to know if a user is logged in (e.g., to redirect away from the login page).

### Stealth Security
- **Configurable Quiz Cover**: Because the quiz can be set to 10 or 20 questions, failing the pattern check simply allows the quiz to continue normally. The user has no idea a vault was denied to them.
- **Pattern Failure State**: The `patternFailed` flag is stored in `sessionStorage`. Once a wrong pattern is entered, the vault remains permanently locked for that tab session to prevent brute forcing.
- **Bypass Shortcut**: Developers can use `Ctrl + Shift + X` to bypass the quiz entirely if authenticated.

---

## 10. The QWERTY Cipher — How It Works

The QWERTY Cipher converts any email address into a deterministic 5-character sequence using the physical layout of a QWERTY keyboard.

### The Algorithm

```
Input:  "pratik@gmail.com"
         │
Step 1:  Lowercase + Remove non-letters + Pad if necessary
         "pratikgmailcom"
         │
Step 2:  Take first 5 characters
         "prati"
         │
Step 3:  Map each letter to its QWERTY zone:
         
         ┌─────────────────────────────────────┐
         │  Zone A: q w e r t        (top-left) │
         │  Zone B: y u i o p       (top-right) │
         │  Zone C: a s d f g z x c v   (left)  │
         │  Zone D: h j k l b n m     (right)   │
         └─────────────────────────────────────┘
         
         p → B
         r → A
         a → C
         t → A
         i → B
         │
Step 4:  Result = ["B", "A", "C", "A", "B"]
```

During the first 5 questions of the quiz, the application records which position (A, B, C, or D) the user clicks. If those 5 clicks match the expected cipher pattern, the vault unlocks.

---

> **End of UserJourney.md**  
> This document reflects the `main` branch state, covering the full multi-page architecture, leaderboard integrations, upgraded cookie auth, and optimistic concurrency control mechanisms.
