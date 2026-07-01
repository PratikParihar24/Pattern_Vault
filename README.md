# 🔒 The Personal Vault

> **Codename:** Project Disguise  
> **Version:** 1.0.0 (Production Ready)

A comprehensive, full-stack privacy suite disguised as a casual "Daily Brain Teaser" quiz game. Designed for extreme privacy, stealth, and data organization.

---

## 🕵️‍♂️ The Core Concept (The Disguise)

**The Interface:** To the outside world, this application is a functional trivia game. It features questions, score tracking, and a "High Score" leaderboard. It is indistinguishable from a standard web game.

**The Trigger:** There are no "Login" buttons. Access to the Vault is granted **only** by entering a specific pattern of answers (e.g., `A -> B -> A -> C -> D`) during the quiz. 

**The Fail-Safe:** If an intruder attempts to guess the pattern or answers incorrectly, the system treats it as a standard "Game Over" event, displaying a score and a "Nice Try" message. The Vault remains invisible.

---

## 🏛️ System Modules (The SRS)

The Vault is divided into three core modules: **Documents**, **Media**, and **Organization**.

### 1. 📝 The Workspace (Documents)
A professional-grade Markdown editor for secure note-taking and planning.

* **Pro Editor:** Full Markdown support with a "Notion-style" slash command menu (`/header`, `/list`, `/code`).
* **Smart Toolbar:** Mobile-responsive toolbar for quick formatting (Bold, Italic, Links).
* **Data Integrity:**
    * **Auto-Save Engine:** Detects typing pauses and saves automatically (Visual `⚡` Feedback).
    * **Time-Travel:** Built-in Undo/Redo history stack to revert specific changes.
* **Stealth Mode:** Minimalist UI that maximizes screen real estate on mobile devices.

### 2. 🖼️ The Gallery (Albums)
A secure media partition for storing sensitive images and videos.

* **Encrypted Storage:** Media files are isolated from the device's main gallery.
* **Album Management:** Create, rename, and delete custom albums (e.g., "Receipts", "Memories", "Blueprints").
* **Grid View:** Responsive masonry layout for viewing thumbnails securely.
* **Touch Guard:** Prevents accidental external sharing or cloud syncing.

### 3. 🗂️ The Network (Groups)
The organizational backbone for managing related data and contacts.

* **Smart Grouping:** Organize Pages and Albums into logical clusters (e.g., "Project Alpha", "Personal", "Finance").
* **Entity Management:** Create profiles for specific people or entities to link notes/media to them.
* **Search & Filter:** Rapidly locate specific groups or tagged items within the vault.

---

## 🛠️ Technical Architecture

* **Frontend:**
    * **Core:** HTML5, CSS3 (Custom Dark/Hacker Theme).
    * **Logic:** Vanilla JavaScript (ES6+).
    * **Markdown Engine:** `marked.js` with GFM (GitHub Flavored Markdown) enabled.
* **Backend:**
    * **Runtime:** Node.js.
    * **Framework:** Express.js (RESTful API).
* **Data Layer:**
    * **Database:** MongoDB (Mongoose Schema).
    * **Encryption:** Bcrypt (for keys) + AES (planned for data at rest).
* **Security:**
    * **Auth:** JWT (JSON Web Tokens) with stateless session management.
    * **Storage:** LocalStorage (Session Tokens).

---

## 🚀 Deployment & Installation

Follow these steps to deploy the complete system.

```bash
# 1. Clone the repository
git clone [https://github.com/yourusername/personal-vault.git](https://github.com/yourusername/personal-vault.git)
cd personal-vault

# 2. Install Dependencies
npm install

# 3. Configuration
# Create a .env file in the root directory with the following keys:
# PORT=5000
# MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/vault
# JWT_SECRET=<your_complex_random_string>

# 4. Launch
# Development (with hot-reload):
npm run dev

# Production:
npm start