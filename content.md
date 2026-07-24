# Pattern Vault — Technical Retrospective Source Material

> **Generated:** 2026-07-17  
> **Repository:** PratikParihar24/Pattern_Vault  
> **Codename in source:** "Project Disguise"

---

## 1. Project Summary

Pattern Vault is a full-stack web application that disguises a private, encrypted personal vault behind a fully functional trivia quiz game called "MindMaster Trivia." To any outside observer, it appears to be a standard quiz game with leaderboards and user profiles. Access to the hidden vault is granted only by entering a specific sequence of quiz answers (A/B/C/D) during the first 5 questions — a sequence deterministically derived from the user's email address using a custom "QWERTY Cipher" algorithm. The vault itself contains a Markdown-based document editor with collaborative editing (Optimistic Concurrency Control), photo album management, and multi-user group collaboration — all backed by a Node.js/Express/MongoDB stack.

---

## 2. Problem / Motivation

**Inferred from README, commit history, and internal documentation:**

The README's opening line states it is *"designed for extreme privacy, stealth, and data organization."* The project's core innovation is **security through obscurity via UI disguise** — the vault has no visible login button, no discoverable entry point. The commit messages and the included `Theory.md` (an interview-prep document) suggest this was built as a **portfolio/interview showcase project** — the developer created exhaustive documentation (`Theory.md`, `UserJourney.md`) specifically to explain the architecture in technical interviews.

**Best guess (labeled as such):** The motivation was twofold: (1) a genuine interest in building a steganographic privacy tool where the security layer is the UI itself, and (2) a deliberate portfolio piece to demonstrate full-stack proficiency across authentication, concurrency control, file uploads, and hybrid SPA/MPA architectures — all without using any frontend framework.

---

## 3. Tech Stack

**All items below are verified from actual dependency files and source code.**

### Backend (from `package.json`)
| Dependency | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | Web framework (RESTful API) |
| `mongoose` | ^9.1.1 | MongoDB ODM |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT-based authentication |
| `multer` | ^2.0.2 | File upload handling (multipart/form-data) |
| `cookie-parser` | ^1.4.7 | Parse HTTP cookies |
| `cors` | ^2.8.5 | Cross-origin resource sharing |
| `dotenv` | ^17.2.3 | Environment variable management |

### Dev Dependencies
| Dependency | Version | Purpose |
|---|---|---|
| `nodemon` | ^3.1.11 | Hot-reload during development |

### Frontend (from HTML files and script tags — no package manager)
| Technology | Details |
|---|---|
| HTML5 | 11 HTML pages serving distinct roles |
| CSS3 | 2 custom stylesheets (no frameworks, no Tailwind, no Bootstrap) |
| Vanilla JavaScript (ES6+) | 6 JS files, no frontend framework |
| `marked.js` | Markdown-to-HTML rendering (loaded via CDN in `app.html`) |
| `DOMPurify` | XSS sanitization for rendered Markdown (loaded via CDN) |
| Google Fonts: Inter | Typography (loaded in `kuizu-theme.css`) |

### Database
| Technology | Details |
|---|---|
| MongoDB Atlas | Cloud-hosted NoSQL database |
| Mongoose Schemas | 4 models: User, Group, Page, Album |

### Infrastructure
| Technology | Details |
|---|---|
| Node.js | Server runtime |
| Local disk storage | File uploads stored to `public/uploads/` |
| No containerization | No Docker, no CI/CD config found |
| No deployment config | No Vercel/Render/Heroku config files present |

---

## 4. Architecture Overview

### High-Level Architecture

The application is a **hybrid MPA + SPA**:

- **Multi-Page Application (MPA):** Public-facing pages (`landing.html`, `login.html`, `register.html`, `leaderboard.html`, `profile.html`, `about.html`, `faq.html`, `how-to-play.html`) each have their own HTML file and use traditional browser navigation.
- **Single-Page Application (SPA):** The core experience (`app.html`) uses JavaScript to dynamically swap between screens (loading → captcha → quiz settings → quiz gameplay → vault) without page reloads.

### Directory Structure

```
pattern_vault/
├── server.js                    ← Express entry point
├── .env                         ← MongoDB URI + JWT secret
├── package.json                 ← 8 runtime deps, 1 dev dep
│
├── src/                         ← Backend source
│   ├── middleware/
│   │   └── authMiddleware.js    ← JWT verification from cookies
│   ├── models/
│   │   ├── User.js              ← Core user schema (identity + game stats + vault data)
│   │   ├── Group.js             ← Collaboration groups with invite codes
│   │   ├── Page.js              ← Markdown documents with OCC versioning
│   │   └── Album.js             ← Photo album collections
│   └── routes/
│       ├── auth.js              ← Register, login, logout, pattern verify, get user
│       ├── vault.js             ← Personal notes/photos CRUD
│       ├── groups.js            ← Group create/join/leave/delete + notes/photos
│       ├── pages.js             ← Document CRUD with OCC (409 Conflict)
│       ├── albums.js            ← Album CRUD with multi-file upload
│       └── leaderboard.js       ← Top 50 rankings + score submission
│
├── public/                      ← Frontend (served statically)
│   ├── 11 HTML files            ← Pages for each view
│   ├── css/
│   │   ├── kuizu-theme.css      ← Public-facing quiz/game theme
│   │   └── style.css            ← Vault UI dark theme
│   ├── js/
│   │   ├── main.js              ← Core SPA logic (1,406 lines)
│   │   ├── quiz-logic.js        ← 300-question bank + Fisher-Yates
│   │   ├── landing.js           ← Navbar, scroll animations, auth state
│   │   ├── leaderboard-page.js  ← Leaderboard UI rendering
│   │   ├── register.js          ← Registration form handler
│   │   └── ui.js                ← Toast/modal/confirm utility library
│   └── uploads/                 ← User-uploaded photos (local disk)
│
├── Theory.md                    ← Interview-prep deep dive
└── UserJourney.md               ← Complete user flow documentation
```

### Data Flow (Simplified)

```
Browser ──fetch()──► Express Server ──Mongoose──► MongoDB Atlas
   │                     │
   │                     ├── authMiddleware (JWT from HttpOnly cookie)
   │                     ├── Multer (file uploads → public/uploads/)
   │                     └── Route handlers (auth, vault, groups, pages, albums, leaderboard)
   │
   └── Cookies: "token" (HttpOnly) + "isAuthenticated" (UI-only)
```

### The "Disguise" Flow

```
User opens app.html
    │
    ▼
Loading screen → Fake captcha → Quiz settings (5/10/20 Qs)
    │
    ▼
Quiz starts — user clicks A/B/C/D answers
    │
    ▼ (after 5th question)
POST /api/auth/verify-pattern { pattern: ["B","A","C","A","B"] }
    │
    ├── ✅ Match → Vault UI appears (quiz hidden)
    └── ❌ No match → Quiz continues normally; patternFailed=true in sessionStorage
```

---

## 5. Key Features Implemented

### Authentication & Security
- **JWT-based auth with HttpOnly cookies** — token is invisible to client-side JavaScript, mitigating XSS token theft
- **Dual-cookie pattern** — `token` (HttpOnly, secure) for auth + `isAuthenticated` (readable) for UI state
- **bcrypt password hashing** with 10 salt rounds
- **Auth middleware** that checks cookies first, falls back to `x-auth-token` header
- **Session-based pattern failure lockout** — `patternFailed` flag in `sessionStorage` prevents brute-force attempts within a tab session

### The QWERTY Cipher (Shared Algorithm)
- Deterministic mapping: email → 5-character pattern (A/B/C/D) based on QWERTY keyboard zones
- **Single source of truth:** `shared/qwerty-cipher.js` exports the same immutable mapping and derivation functions to Node.js and the browser
- The server imports that module directly; the browser loads that exact file from `/shared/qwerty-cipher.js`
- Handles edge cases consistently: lowercases, strips non-letters, uses `abcde` when no letters remain, and repeats short values until five characters are available
- The authenticated server derives and validates the expected pattern; it also rejects malformed payloads before comparison

### Quiz Engine
- **300 hand-written trivia questions** across 4 domains (General Knowledge, Science, History, Entertainment) × 3 difficulty levels (Easy, Medium, Hard)
- **Fisher-Yates shuffle** for randomizing answer positions
- **Configurable quiz length** (5, 10, or 20 questions) with difficulty and domain filters
- Fake scoring system that tracks `fakeScore` and `correctCount`
- Game Over screen with score submission to leaderboard

### Vault (Document Management)
- **Markdown editor** with live preview (via `marked.js` + `DOMPurify` sanitization)
- **Auto-save engine** with debounced saves and visual `⚡` feedback
- **Undo/Redo history stack** for reverting changes
- **Notion-style slash command menu** (`/header`, `/list`, `/code`)
- **Optimistic Concurrency Control (OCC)** — uses Mongoose `__v` version field; returns `409 Conflict` on stale writes

### Photo Albums
- **Multi-file upload** (up to 20 files per batch via Multer)
- **Image-only filter** — Multer rejects non-image MIME types
- **Collision-proof filenames** — `Date.now() + Math.random()` prefix
- **File deletion** — removes from both database array and disk (`fs.unlinkSync`)

### Groups & Collaboration
- **6-character alphanumeric invite codes** for joining groups
- **Admin/member role separation** — only admin can delete group
- **Cascade delete** — deleting a group also deletes all associated Pages and Albums and removes group ID from all members
- **Shared notes, shared pages, and shared photo albums** per group
- **Membership verification** on all group endpoints

### Leaderboard System
- **Global top-50 ranking** (public, no auth required)
- **Personal rank calculation** via `User.countDocuments({ highScore: { $gt: userScore } })`
- **High score tracking** — only updates if new score exceeds stored high score
- **Total games played counter** — always increments

### UI/UX
- **Custom toast notification system** (`ui.js`) replacing native `alert()` calls
- **Custom modal/confirm/prompt dialogs** — async/await compatible
- **Intersection Observer-based scroll animations** on landing page
- **Hamburger menu with animated X transform** for mobile navigation
- **Dual-theme CSS system** — `kuizu-theme.css` (light/game theme for cover story) + `style.css` (dark/hacker theme for vault)
- **Developer bypass shortcut** — `Ctrl + Shift + X` skips quiz and goes directly to vault
- **`decoder.html`** — standalone dev tool page with Matrix-green aesthetic for testing the QWERTY cipher

---

## 6. Hard Numbers

### Lines of Code (Directly Measured)

| Language | Lines |
|---|---|
| JavaScript (.js files, excluding node_modules) | **3,097** |
| HTML (.html files) | **3,543** |
| CSS (.css files) | **2,250** |
| Markdown (.md files) | ~712 |
| **Total hand-written code** | **~9,602** |

### File Counts (Directly Measured)

| Category | Count |
|---|---|
| Total source files (JS + HTML + CSS + MD) | **34** |
| Backend JS files (`src/`) | **11** (6 routes + 4 models + 1 middleware) |
| Frontend JS files (`public/js/`) | **6** |
| HTML pages (`public/`) | **11** |
| CSS stylesheets | **2** |
| Documentation files (MD) | **3** (README, Theory, UserJourney) |

### Individual File Sizes (Directly Measured)

| File | Size (bytes) | Lines |
|---|---|---|
| `main.js` (core SPA logic) | 57,752 | 1,406 |
| `quiz-logic.js` (question bank + cipher) | 51,949 | 396 |
| `style.css` (vault theme) | 42,897 | — |
| `app.html` (main SPA) | 35,281 | — |
| `landing.html` | 28,911 | — |
| `kuizu-theme.css` (quiz theme) | 26,733 | — |
| `UserJourney.md` | 22,516 | 454 |
| `package-lock.json` | 64,060 | — |

### Dependencies
| Category | Count |
|---|---|
| Runtime dependencies | **8** |
| Dev dependencies | **1** |
| CDN-loaded frontend libraries | **2** (marked.js, DOMPurify) |

### API Endpoints (Directly Counted)
| Resource | Endpoints |
|---|---|
| Auth (`/api/auth`) | 5 (register, login, logout, verify-pattern, get user) |
| Vault (`/api/vault`) | 3 (get personal, update notes, upload photo) |
| Groups (`/api/groups`) | 7 (create, join, get, update notes, upload photo, leave, delete) |
| Pages (`/api/pages`) | 6 (get personal, create personal, get group, create group, update with OCC, delete) |
| Albums (`/api/albums`) | 5 (get, create, upload photos, delete photo, delete album) |
| Leaderboard (`/api/leaderboard`) | 3 (get top 50, get my rank, submit score) |
| **Total** | **29** |

### Quiz Content
- **300 trivia questions** hard-coded in `quiz-logic.js`
- 4 domains × 3 difficulty levels × 25 questions each

### Git
- **Total commits:** 30 (across all branches, including merge commits)
- **Feature commits (non-merge):** 21
- **Branches used:** `main`, `dell`, `feature/vault-updation`, `feature/main-2`
- **Pull requests:** 8

### Mongoose Models
- **4 schemas:** User (7 fields + timestamps), Group (6 fields + timestamps), Page (5 fields), Album (5 fields)

---

## 7. Notable Technical Decisions

### 1. The QWERTY Cipher — Shared Deterministic Mapping
**Where:** `shared/qwerty-cipher.js`, consumed by `src/routes/auth.js` and `/shared/qwerty-cipher.js` in the browser

A bespoke algorithm maps keyboard characters to four zones (A–D) based on their physical position on a QWERTY keyboard. It converts an email into a fixed five-character pattern used by the quiz unlock flow. The derivation rules live only in `shared/qwerty-cipher.js`, a browser-and-Node-compatible module, so the client, server, and decoder tool cannot drift apart. The server remains authoritative: it derives the expected value from the authenticated user's stored email and validates the submitted five-answer payload.

### 2. Optimistic Concurrency Control via Mongoose `__v`
**Where:** `src/routes/pages.js` (lines 95–133)

Instead of using locks or a real-time sync system (like WebSockets), the developer implemented OCC using Mongoose's built-in `__v` version field. The `findOneAndUpdate` query includes `{ __v: version }` as a filter — if the version has changed since the client last read, the update returns `null` and the server responds with `409 Conflict`. This is a legitimate concurrency pattern rarely seen in student/portfolio projects.

### 3. Hybrid MPA + SPA Architecture (No Frontend Framework)
**Where:** Entire `public/` directory

Instead of reaching for React/Vue/Angular, the developer built a multi-page marketing site (landing, leaderboard, profile, about, FAQ) combined with a single-page application (the quiz + vault in `app.html`) — all using vanilla JavaScript DOM manipulation. The SPA section manages multiple "screens" by toggling `.hidden`/`.active` CSS classes on sections.

### 4. HttpOnly Cookie Auth (Upgraded from localStorage)
**Where:** `src/routes/auth.js` (lines 87–99) and `src/middleware/authMiddleware.js`

The commit history explicitly shows this was an upgrade: commit `95f5d52` is titled *"authentication change, security change via audit."* The JWT is stored in an HttpOnly cookie (invisible to JS), with a secondary non-HttpOnly `isAuthenticated` cookie used solely for UI state checking. The middleware also supports an `x-auth-token` header fallback for API testing.

### 5. Session-Based Pattern Failure Lockout
**Where:** `public/js/main.js` (line 14)

After a failed pattern attempt, `sessionStorage.setItem('patternFailed', 'true')` is set. This persists across page refreshes within the same tab but is cleared on tab close. This is a deliberate anti-brute-force measure — once you fail, you cannot retry without opening a new tab or logging out.

### 6. Fisher-Yates Shuffle for Answer Randomization
**Where:** `public/js/quiz-logic.js` (lines 385–388)

Classic O(n) in-place shuffle algorithm used to randomize answer option positions so the correct answer isn't predictably placed.

### 7. Cascade Delete on Group Deletion
**Where:** `src/routes/groups.js` (lines 229–262)

Group deletion triggers a cleanup cascade: removes the group reference from all member User documents (`User.updateMany`), deletes all associated Pages (`Page.deleteMany`), deletes all associated Albums (`Album.deleteMany`), then finally deletes the group itself. This is a well-considered data integrity pattern.

### 8. Custom UI Library Replacing Native Dialogs
**Where:** `public/js/ui.js` (entire file)

A self-contained `UI` object providing `toast()`, `prompt()`, and `confirm()` — all returning Promises for async/await usage. This replaced native `alert()`/`confirm()` calls (commit `e74eda3`: *"alerts replaced with beautiful toast & pop-ups"*).

---

## 8. Observed Weaknesses / Technical Debt

### 🔴 CRITICAL: `.env` File Committed to Git with Live Credentials
- **File:** `.env` (tracked in git since commit `d0e79f3`)
- The `.env` file containing the **live MongoDB Atlas connection string** (with username `pheonixpratik24_db_user` and password `VH9np8dx38nq1A0q`) and the **JWT secret** (`01242006`) is committed to the repository. Although `.env` is listed in `.gitignore`, it was added before the `.gitignore` was created and remains tracked.
- **Impact:** Anyone with repo access has full read/write access to the production database and can forge valid JWTs.
- **Remediation:** Remove from git history (`git filter-branch` or BFG Repo Cleaner), rotate all credentials immediately.

### 🔴 CRITICAL: Weak JWT Secret
- **File:** `.env` (line 4)
- The JWT secret is `01242006` — an 8-digit number (likely a birthdate). This is trivially brute-forceable. JWT secrets should be cryptographically random strings of at least 256 bits.

### 🟠 No Rate Limiting
- **Files:** All route files under `src/routes/`
- No `express-rate-limit` or equivalent middleware. The login endpoint, registration endpoint, and pattern verification endpoint are all vulnerable to brute-force attacks. The `sessionStorage` lockout is client-side only and trivially bypassable.

### 🟠 No Input Validation / Sanitization on Backend
- **Files:** `src/routes/auth.js`, `src/routes/groups.js`, `src/routes/pages.js`
- Beyond `displayName` length check (min 2 chars), there is no email format validation, no password strength requirements, no content length limits on notes/pages, and no sanitization of user-provided group names or page titles.

### 🟠 Missing Security Check on Album Deletion
- **File:** `src/routes/albums.js` (lines 154–161)
- The `DELETE /:id` route for album deletion has **no authorization check** — any authenticated user can delete any album by ID. The comment on line 131 of the photo deletion route even acknowledges *"Security check omitted for brevity."*

### 🟠 Missing Security Check on Photo Deletion
- **File:** `src/routes/albums.js` (lines 126–148)
- The delete-photo route has no ownership or group membership verification (acknowledged by a code comment).

### 🟠 Duplicated Multer Configuration
- **Files:** `src/routes/vault.js` (lines 11–31), `src/routes/groups.js` (lines 14–29), `src/routes/albums.js` (lines 12–22)
- The Multer storage/filter configuration is copy-pasted across three separate route files. Should be extracted to a shared module.

### ✅ QWERTY Cipher Single Source of Truth
- **File:** `shared/qwerty-cipher.js`
- The module is imported directly by the server and served unchanged to browser consumers at `/shared/qwerty-cipher.js`. This removes manual map duplication and keeps normalization, padding, mapping, and pattern-length validation consistent.

### 🟡 No Automated Tests
- **File:** `package.json` (line 6)
- The test script is `echo "Error: no test specified" && exit 1`. There are zero unit tests, integration tests, or end-to-end tests in the repository.

### 🟡 No File Upload Size Limits
- **Files:** `src/routes/vault.js`, `src/routes/albums.js`
- Multer is configured without `limits.fileSize`. Users can upload arbitrarily large files, potentially exhausting disk space or causing denial of service.

### 🟡 Local Disk File Storage
- **Files:** All routes using Multer
- Uploaded files are stored on the server's local filesystem (`public/uploads/`). This won't survive a server restart on ephemeral hosting (Heroku, Render), doesn't scale across instances, and exposes files publicly via the static file server.

### 🟡 No CORS Configuration Used
- **File:** `server.js`
- `cors` is listed as a dependency but never imported or used in `server.js`. Dead dependency.

### 🟡 Inconsistent Membership Check After Mongoose `.populate()`
- **File:** `src/routes/groups.js` (lines 127 vs 157)
- After `.populate('members', 'email')`, `group.members` becomes an array of objects, not ObjectIds. Line 127 correctly uses `.some(member => member._id.toString() === req.user.id)`, but other methods (e.g., line 157) still use `group.members.includes(req.user.id)`, which may fail silently depending on when populate has been called.

### 🟡 No Pagination
- **Files:** `src/routes/pages.js`, `src/routes/albums.js`
- All list endpoints return all documents without pagination. The leaderboard is limited to top 50, but pages and albums have no limit.

### 🟡 `main.js` is a 1,406-Line Monolith
- **File:** `public/js/main.js`
- This single file handles quiz flow, vault rendering, editor logic, group management, album management, auto-save, undo/redo, and all event listeners. It should be decomposed into focused modules.

### 🟡 No HTTPS Enforcement
- **File:** `src/routes/auth.js` (line 89)
- The `secure` cookie flag is only set when `NODE_ENV === 'production'`, but there is no mechanism to enforce HTTPS. In development, cookies are sent over plain HTTP.

### 🟡 `localStorage.removeItem('token')` Still in Code
- **File:** `public/js/main.js` (line 64)
- Despite upgrading to HttpOnly cookies, there's a leftover `localStorage.removeItem('token')` call in the error handler — a vestige of the old auth flow.

---

## 9. Timeline

| Metric | Value |
|---|---|
| **First commit** | 2026-01-05 (19:22 IST) — `feat: add multi-user group vaults and dashboard UI` |
| **Last commit** | 2026-07-01 (22:05 IST) — `showcasing pattern-vault details on quiz and landing page` |
| **Total commits** | 30 (including 9 merge commits) |
| **Feature commits** | 21 |
| **Total calendar span** | ~6 months (Jan 5, 2026 → Jul 1, 2026) |
| **Active development burst 1** | Jan 5–17, 2026 (~12 days, 14 commits) — Core vault, groups, editor, theming, register page, quiz |
| **Development gap** | Jan 17 → Jun 18, 2026 (~5 months of inactivity) |
| **Active development burst 2** | Jun 18–20, 2026 (~3 days, 7 commits) — Major UI overhaul: multi-page architecture, landing page, leaderboard, profile, mobile nav, OCC, cookie auth upgrade |
| **Final polish** | Jul 1, 2026 (9 merge commits + 1 showcase commit) — Branch merges and final landing page updates |
| **Pull requests** | 8 (all from feature branches into main) |
| **Branch strategy** | Feature branches (`feature/vault-updation`, `feature/main-2`, `dell`) merged via pull requests |

**Development pattern:** Two concentrated sprints with a 5-month gap. The first sprint built the core functionality (vault, groups, editor, quiz). The second sprint modernized the UI (multi-page architecture, landing page, leaderboard, profile system, cookie-based auth, OCC).

---

## 10. Open Questions for the Engineer

1. **Deployment:** Was this ever deployed to a live server? If so, where (Render, Railway, Heroku, VPS)? The repo has no deployment config files.

2. **Real-world use:** Was this built for a personal use case (actually storing private data behind the quiz disguise), or purely as a portfolio/learning project?

3. **The `.env` in git:** Are you aware that your MongoDB credentials and JWT secret are committed to the repository? Have those credentials been rotated?

4. **User base:** Did anyone besides you actually use this? Were the collaboration/group features tested with real multi-user scenarios?

5. **The 5-month gap:** What caused the ~5-month break between Jan 2026 and Jun 2026? Was this a deliberate pause or did other projects take priority?

6. **AES encryption:** The README mentions *"AES (planned for data at rest)"* — was this ever implemented? Code inspection shows no AES usage.

7. **Architectural regret:** If you rebuilt this today, would you still use vanilla JS for the frontend, or would you reach for a framework? Would you use WebSockets for real-time collaboration instead of OCC?

8. **The `cors` dependency:** It's installed but never used in `server.js`. Was it used previously and removed, or installed preemptively?

9. **The `decoder.html` page:** This developer tool for testing the QWERTY cipher is publicly accessible. Was it intended to be removed before "production," or is it deliberately there?

10. **Mobile-first or desktop-first?** Several commits mention mobile fixes. What was the primary target device? Was the quiz designed mainly for phone use?

11. **Scale ambition:** The leaderboard caps at top 50, but there's no pagination for pages or albums. Was scale ever a concern, or was this always intended for single-user / small-group use?

12. **Testing strategy:** With zero automated tests, how did you verify that features like OCC conflict detection and the QWERTY cipher were working correctly? Manual testing only?
