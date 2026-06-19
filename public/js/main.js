// public/js/main.js

// ==========================================
// 1. STATE & VARIABLES
// ==========================================
let currentPattern = []; 
let currentContext = { type: 'personal', id: null }; 
let fakeScore = 0;
let correctCount = 0;
let questionIndex = 0;
let highScore = parseInt(localStorage.getItem('fakeHighScore') || '0');
// Track if user already failed the pattern check (persists across page reloads via sessionStorage)
let patternFailed = sessionStorage.getItem('patternFailed') === 'true';

// DOM Elements
const loadingScreen    = document.getElementById('loading-screen');
const loadingText      = document.getElementById('loading-text');
const captchaScreen    = document.getElementById('captcha-screen');
const robotCheck       = document.getElementById('robot-check');
const quizIntro        = document.getElementById('quiz-intro');
const quizGame         = document.getElementById('quiz-game');
const startQuizBtn     = document.getElementById('start-quiz-btn');
const vaultScreen      = document.getElementById('vault-screen');
const quizResult       = document.getElementById('quiz-result');
const restartBtn       = document.getElementById('restart-btn');
const highScoreDisplay = document.getElementById('high-score-display');

// ==========================================
// 2. INITIALIZATION — Verify token on load
// ==========================================
(function initApp() {
    const token = localStorage.getItem('token');
    if (!token) {
        // No token → go to login
        window.location.href = 'login.html';
        return;
    }
    
    // Verify token is valid with the server
    fetch('/api/auth', { headers: { 'x-auth-token': token } })
        .then(res => {
            if (res.ok) {
                // Token is valid → start the quiz flow
                // (user must always pass through quiz to reach vault)
                setTimeout(() => startQuizFlow(), 500);
            } else {
                // Token expired/invalid → redirect to login
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
})();

// Show vault directly (used after successful pattern verification)
function showVaultDirectly() {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    vaultScreen.classList.remove('hidden');
    vaultScreen.classList.add('active');
    loadVaultData();
}

// Track if user has seen the captcha this session
let hasSeenCaptcha = sessionStorage.getItem('hasSeenCaptcha') === 'true';

// Start the quiz flow: Loading → Captcha → Quiz
function startQuizFlow() {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    
    if (hasSeenCaptcha) {
        // Skip the traffic delay on subsequent attempts
        const overlay = document.getElementById('quiz-overlay');
        if(overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        }
        quizIntro.classList.remove('hidden');
        quizGame.classList.add('hidden');
        return;
    }

    // First time this session: show traffic delay
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('active');
    if (loadingText) { loadingText.innerText = 'Verifying Credentials...'; }

    setTimeout(() => {
        if (loadingText) { loadingText.innerText = 'Unusual Traffic Detected.'; loadingText.style.color = '#E94560'; }
        setTimeout(() => {
            loadingScreen.classList.remove('active'); loadingScreen.classList.add('hidden');
            captchaScreen.classList.remove('hidden'); captchaScreen.classList.add('active');
            sessionStorage.setItem('hasSeenCaptcha', 'true');
        }, 1500);
    }, 2000);
}

// Init high score UI
if (highScoreDisplay) highScoreDisplay.innerText = highScore;

// ==========================================
// 3. QUIZ FLOW
// ==========================================

// --- EVENT: CAPTCHA CHECKED ---
if(robotCheck) {
    robotCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            setTimeout(() => {
                captchaScreen.classList.remove('active');
                captchaScreen.classList.add('hidden');
                
                const overlay = document.getElementById('quiz-overlay');
                if(overlay) {
                    overlay.classList.remove('hidden');
                    overlay.classList.add('active');
                }
                quizIntro.classList.remove('hidden');
                quizGame.classList.add('hidden');
            }, 500);
        }
    });
}

// --- EVENT: QUIZ SETTINGS MENU ---
const settingsBtn = document.getElementById('quiz-settings-btn');
const settingsMenu = document.getElementById('quiz-settings-menu');
const quizQuitBtn = document.getElementById('quiz-quit-btn');
const quizSoundToggle = document.getElementById('quiz-sound-toggle');
let quizSoundEnabled = true;

if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
            settingsMenu.classList.add('hidden');
        }
    });
}

if (quizQuitBtn) {
    quizQuitBtn.addEventListener('click', () => {
        // Quit game: hide game screen and show intro screen
        settingsMenu.classList.add('hidden');
        quizGame.classList.add('hidden');
        quizIntro.classList.remove('hidden');
    });
}

if (quizSoundToggle) {
    quizSoundToggle.addEventListener('click', () => {
        quizSoundEnabled = !quizSoundEnabled;
        quizSoundToggle.innerText = quizSoundEnabled ? '🔊 Sound: On' : '🔇 Sound: Off';
    });
}

// --- EVENT: START QUIZ ---
if (startQuizBtn) {
    startQuizBtn.addEventListener('click', () => {
        questionIndex = 0;
        fakeScore = 0;
        correctCount = 0;
        currentPattern = [];
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.innerText = '0';
        for (let i = 0; i < 5; i++) {
            const d = document.getElementById(`dot-${i}`);
            if (d) { d.className = 'kz-dot'; if (i === 0) d.classList.add('current'); }
        }
        quizIntro.classList.add('hidden');
        quizGame.classList.remove('hidden');
        loadNewQuestion();
    });
}

// --- EVENT: QUIZ ANSWERS ---
document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.disabled) return;
        document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);

        const targetBtn = e.target.closest('.opt-btn');
        const val = targetBtn.getAttribute('data-val');
        currentPattern.push(val);

        // GAME LOGIC: check if correct answer
        const selectedText = targetBtn.querySelector('.opt-text').innerText;
        const correctText  = targetBtn.getAttribute('data-correct-answer');
        const isCorrect    = (selectedText === correctText);

        if (isCorrect) {
            fakeScore += 10;
            correctCount++;
            targetBtn.classList.add('correct');
        } else {
            targetBtn.classList.add('wrong');
            document.querySelectorAll('.opt-btn').forEach(b => {
                if (b.querySelector('.opt-text').innerText === correctText) {
                    b.classList.add('correct');
                }
            });
        }

        // Update score display
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.innerText = fakeScore;

        // Update progress dot
        const dot = document.getElementById(`dot-${questionIndex}`);
        if (dot) { dot.classList.remove('current'); dot.classList.add('answered'); }

        questionIndex++;

        // After 5 questions → verify pattern
        if (currentPattern.length === 5) {
            setTimeout(() => verifyPatternAndDecide(), 700);
        } else {
            // Advance to next dot
            const nextDot = document.getElementById(`dot-${questionIndex}`);
            if (nextDot) nextDot.classList.add('current');

            setTimeout(() => {
                document.querySelectorAll('.opt-btn').forEach(b => {
                    b.classList.remove('correct', 'wrong');
                    b.disabled = false;
                });
                loadNewQuestion();
            }, 700);
        }
    });
});

// --- HELPER: LOAD NEW QUESTION ---
function loadNewQuestion() {
    if (typeof Cipher === 'undefined') {
        console.error('Cipher logic missing! Check quiz-logic.js');
        return;
    }

    const round = Cipher.getNewRound();
    
    const qText = document.getElementById('question-text');
    if (qText) qText.innerText = round.text;

    const counter = document.getElementById('question-counter');
    if (counter) counter.innerText = `Question ${questionIndex + 1} / 5`;

    document.querySelectorAll('.opt-btn').forEach((btn, index) => {
        const span = btn.querySelector('.opt-text');
        if (span) span.innerText = round.options[index];
        btn.setAttribute('data-correct-answer', round.correctAnswer);
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong');
    });
}

// ==========================================
// 4. PATTERN VERIFICATION — The Core Logic
// ==========================================
async function verifyPatternAndDecide() {
    const qText = document.getElementById('question-text');

    // If the user already failed the pattern in this session → they're trapped
    // They can play the quiz for fun/leaderboard but vault never opens
    if (patternFailed) {
        if(qText) qText.innerText = "Calculating Score...";
        setTimeout(() => triggerGameOver(), 500);
        return;
    }

    // First attempt this session → actually verify the pattern with backend
    if(qText) qText.innerText = "Analyzing Pattern...";

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/verify-pattern', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ pattern: currentPattern })
        });

        const data = await res.json();

        if (res.ok && data.unlocked === true) {
            // ✅ PATTERN CORRECT → Open the Vault!
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

            vaultScreen.classList.remove('hidden');
            vaultScreen.classList.add('active'); 
            loadVaultData();

        } else {
            // ❌ PATTERN WRONG → User is now trapped in the simulation
            patternFailed = true;
            sessionStorage.setItem('patternFailed', 'true');
            triggerGameOver();
        }
    } catch (err) {
        console.error('Pattern verification error:', err);
        UI.toast("Server Error", "error");
        triggerGameOver();
    }
}

// ==========================================
// 3. VAULT LOGIC & MOBILE MENU
// ==========================================

// --- MOBILE MENU LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileBtn && sidebar && overlay) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Personal Vault Button Logic
    const personalBtn = document.getElementById('personal-vault-btn');
    if (personalBtn) {
        personalBtn.addEventListener('click', () => {
            currentContext = { type: 'personal', id: null };
            loadVaultData();

            document.querySelectorAll('.nav-list li, .nav-static li').forEach(el => el.classList.remove('active'));
            personalBtn.classList.add('active');

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

    // Setup Other Buttons
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) createGroupBtn.addEventListener('click', handleCreateGroup);

    const joinGroupBtn = document.getElementById('join-group-btn');
    if (joinGroupBtn) joinGroupBtn.addEventListener('click', handleJoinGroup);

    // --- LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // Optional: Ask for confirmation using our new UI
            if (typeof UI !== 'undefined') {
                const confirm = await UI.confirm("Logout?", "You will return to the cover screen.");
                if (!confirm) return;
            } else if (!confirm("Logout?")) {
                return;
            }

            // 1. Destroy Token & Reset Pattern Lock
            localStorage.removeItem('token');
            sessionStorage.removeItem('patternFailed');

            // 2. Optional: Destroy other local keys if you have them
            // localStorage.removeItem('fakeHighScore'); 

            // 3. Redirect to login
            window.location.href = 'login.html';
        });
    }
});

// --- MAIN DATA LOADER ---
async function loadVaultData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/auth', { headers: { 'x-auth-token': token } });
        const userData = await res.json();

        renderSidebarGroups(userData.groups || []);

        const photoCard = document.querySelector('#photo-grid');
        const viewTitle = document.getElementById('current-view-title');
        const codeBadge = document.getElementById('group-code-display');
        const dangerBtn = document.getElementById('danger-btn');
        const membersDiv = document.getElementById('members-display');

        // Reset UI visibility
        if (codeBadge) codeBadge.classList.add('hidden');
        if (dangerBtn) dangerBtn.classList.add('hidden');
        if (membersDiv) membersDiv.classList.add('hidden');

        if (currentContext.type === 'personal') {
            if (viewTitle) viewTitle.innerText = "My Private Vault";

            const pageRes = await fetch('/api/pages/personal', { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();
            renderNotionView(pages, 'personal', null);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }

        } else {
            // GROUP MODE
            const groupRes = await fetch(`/api/groups/${currentContext.id}`, { headers: { 'x-auth-token': token } });
            const groupData = await groupRes.json();

            if (viewTitle) viewTitle.innerText = groupData.name;

            // GROUP DASHBOARD INJECTION
            const container = document.getElementById('vault-content');

            // Check Admin Status
            const myId = userData._id;
            const adminId = (groupData.admin && groupData.admin._id) ? groupData.admin._id : groupData.admin;
            const isAdmin = (myId === adminId);

            const btnText = isAdmin ? "Delete Group" : "Leave Group";
            const btnClass = isAdmin ? "btn-danger" : "btn-warning";
            const btnAction = isAdmin
                ? `deleteGroup('${currentContext.id}')`
                : `leaveGroup('${currentContext.id}')`;

            const dashboardHTML = `
                <div class="group-dashboard">
                    <div class="group-info-row">
                        <span class="group-code-badge">CODE: ${groupData.inviteCode}</span>
                        <span class="member-count">👥 ${groupData.members.length} Members</span>
                    </div>
                    <div class="group-action-row">
                        <button onclick="${btnAction}" class="btn-block ${btnClass}">
                            ${btnText}
                        </button>
                    </div>
                </div>
            `;

            // Render Content
            const pageRes = await fetch(`/api/pages/group/${currentContext.id}`, { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();

            renderNotionView(pages, 'group', currentContext.id);

            // Inject Dashboard
            if (container) container.insertAdjacentHTML('afterbegin', dashboardHTML);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }
        }
    } catch (err) {
        console.error("Load Error", err);
    }
}

// --- RENDER SIDEBAR LIST ---
function renderSidebarGroups(groups) {
    const list = document.getElementById('group-list');
    if (!list) return;
    list.innerHTML = "";

    groups.forEach(group => {
        const li = document.createElement('li');
        li.innerText = group.name;

        if (currentContext.type === 'group' && currentContext.id === group._id) {
            li.classList.add('active');
        }

        li.addEventListener('click', () => {
            currentContext = { type: 'group', id: group._id };
            loadVaultData();

            document.querySelectorAll('.nav-list li, .nav-static li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            // Close Mobile Menu
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        });
        list.appendChild(li);
    });
}

// ==========================================
// 4. EDITOR VIEW
// ==========================================
function renderNotionView(pages, contextType, contextId) {
    const container = document.getElementById('vault-content');
    if (!container) return;

    container.innerHTML = `
        <div class="vault-split-view" id="split-view-container">
            <div class="page-sidebar">
                <button id="create-page-btn" class="small-btn" style="width:100%">+ New Page</button>
                <ul class="page-list" id="page-list-ul"></ul>
            </div>

            <div class="editor-container" id="editor-wrapper">
                <button id="mobile-back-btn" class="mobile-back-btn">← Back</button>
                <div id="editor-content-area" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="editor-placeholder">Select a page...</div>
                </div>
            </div>
        </div>
    `;

    const splitView = document.getElementById('split-view-container');
    const backBtn = document.getElementById('mobile-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            splitView.classList.remove('show-editor');
        };
    }

    const list = document.getElementById('page-list-ul');
    pages.forEach(page => {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerText = page.title || "Untitled Page";
        li.id = `page-link-${page._id}`;

        li.onclick = () => {
            document.querySelectorAll('.page-item').forEach(el => el.classList.remove('active-page'));
            li.classList.add('active-page');
            loadPageIntoEditor(page);
            splitView.classList.add('show-editor');
        };
        list.appendChild(li);
    });

    document.getElementById('create-page-btn').onclick = async () => {
        const title = await UI.prompt("New Page Title", "e.g., Operation Blackout");
        if (!title) return;
        const url = contextType === 'personal' ? '/api/pages/personal' : `/api/pages/group/${contextId}`;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify({ title })
            });
            loadVaultData();
        } catch (err) { console.error(err); }
    };
}

// --- PRO EDITOR (Toolbar + Markdown + AutoSave + Undo/Redo + Interactive Checkboxes) ---
function loadPageIntoEditor(page) {
    const editorArea = document.getElementById('editor-content-area');
    let autoSaveTimer;
    let isAutoSaveOn = true; // Default: ON

    // HISTORY STACK (For Undo/Redo)
    // We start with the current content as the first "state"
    let history = [page.content || ''];
    let historyIndex = 0;

    // 0. CONFIGURE MARKDOWN (Fixes Spacing)
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true, // 🚨 CRITICAL: Treats "Enter" as a <br> tag
            gfm: true     // GitHub Flavored Markdown
        });
    }

    // 1. INJECT HTML 
    // (Note: I removed the extra empty <div class="editor-header"> you had, which fixes the gap)
    editorArea.innerHTML = `
        <div class="editor-header">
            <div class="title-wrapper">
                <button id="icon-btn" title="Change Icon">📄</button>
                <input type="text" id="page-title-input" value="${page.title}" placeholder="Untitled Page">
            </div>
            
            <div class="editor-tools">
                <button id="preview-btn" class="text-btn" title="Toggle View">👁️ View</button>
                <div class="tool-separator"></div>
                <button id="save-page-btn" class="text-btn">Save</button>
                <div class="tool-separator"></div>
                <button id="delete-page-btn" class="text-btn danger">Delete</button>
            </div>
        </div>

        <div id="slash-menu" style="display:none;">
            <div class="slash-item" data-cmd="header"><span class="slash-icon">H1</span> Big Heading</div>
            <div class="slash-item" data-cmd="subheader"><span class="slash-icon">H2</span> Medium Heading</div>
            <div class="slash-item" data-cmd="list"><span class="slash-icon">≡</span> Bullet List</div>
            <div class="slash-item" data-cmd="todo"><span class="slash-icon">☐</span> To-Do Checkbox</div>
            <div class="slash-item" data-cmd="code"><span class="slash-icon">{}</span> Code Block</div>
            <div class="slash-item" data-cmd="callout"><span class="slash-icon">💡</span> Callout Box</div>
            <div class="slash-item" data-cmd="date"><span class="slash-icon">📅</span> Today's Date</div>
        </div>

        <div class="markdown-toolbar" id="toolbar">
            <button class="tool-btn" data-type="undo" title="Undo">↩</button>
            <button class="tool-btn" data-type="redo" title="Redo">↪</button>
            <div style="width:1px; background:#444; margin:0 5px;"></div>

            <button class="tool-btn" data-type="bold" title="Bold">B</button>
            <button class="tool-btn" data-type="italic" title="Italic">I</button>
            <button class="tool-btn" data-type="header" title="Header">H</button>
            <button class="tool-btn" data-type="list" title="List">≡</button>
            <button class="tool-btn" data-type="code" title="Code Block">{}</button>
            <button class="tool-btn" data-type="link" title="Link">🔗</button>

            <div style="flex-grow: 1;"></div>

           <label class="toggle-switch" title="Toggle Auto-Save">
                    <input type="checkbox" id="autosave-toggle" class="toggle-checkbox" checked>
        </div>
        
        <div style="position: relative; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden;">
            <textarea id="page-content-input" placeholder="# Start typing...">${page.content || ''}</textarea>
            <div id="markdown-preview"></div>
        </div>
    `;

    // DOM Elements
    const titleInput = document.getElementById('page-title-input');
    const contentInput = document.getElementById('page-content-input');
    const previewDiv = document.getElementById('markdown-preview');
    const saveBtn = document.getElementById('save-page-btn');
    const previewBtn = document.getElementById('preview-btn');
    const toolbar = document.getElementById('toolbar');
    const slashMenu = document.getElementById('slash-menu');

    // New DOM Elements
    // Update these selectors if IDs were removed or changed
    // Since we used data-type in the HTML above, we can grab them like this:
    const undoBtn = toolbar.querySelector('[data-type="undo"]');
    const redoBtn = toolbar.querySelector('[data-type="redo"]');
    const autoSaveToggle = document.getElementById('autosave-toggle');

    // --- HISTORY LOGIC (Undo/Redo) ---
    const saveToHistory = () => {
        const current = contentInput.value;
        if (current !== history[historyIndex]) {
            // If we undo and then type, we remove the "future" states
            history = history.slice(0, historyIndex + 1);
            history.push(current);
            historyIndex++;
        }
    };

    undoBtn.onclick = () => {
        if (historyIndex > 0) {
            historyIndex--;
            contentInput.value = history[historyIndex];
            if (isAutoSaveOn) triggerAutoSave();
        }
    };

    redoBtn.onclick = () => {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            contentInput.value = history[historyIndex];
            if (isAutoSaveOn) triggerAutoSave();
        }
    };

    // --- SMART HISTORY TRIGGER ---
    let historyDebounce;

    // 1. Toolbar Clicks (Immediate Save)
    // We keep your existing toolbar listener, as buttons should save instantly.

    // 2. Typing (Delayed Save)
    // This saves "chunks" of work naturally when you pause.
    contentInput.addEventListener('input', () => {
        clearTimeout(historyDebounce);
        historyDebounce = setTimeout(() => {
            saveToHistory();
        }, 800); // Waits 0.8 seconds after you stop typing to save a "state"
    });

    // --- SAVE LOGIC ---
    // --- SAVE LOGIC ---
    autoSaveToggle.onchange = (e) => {
        isAutoSaveOn = e.target.checked;

        // 1. Visual Feedback (Toast)
        if (typeof UI !== 'undefined') {
            const status = isAutoSaveOn ? "ENABLED ⚡" : "DISABLED 🛑";
            UI.toast(`AutoSave ${status}`, isAutoSaveOn ? "success" : "info");
        }

        // 2. Button Logic
        if (!isAutoSaveOn) {
            saveBtn.innerText = "Save";
            saveBtn.style.color = "";
            clearTimeout(autoSaveTimer);
        }
    };

    const performSave = async (silent = false) => {
        const titleVal = titleInput.value;
        const contentVal = contentInput.value;
        const originalText = saveBtn.innerText;

        if (!silent) saveBtn.innerText = "Saving...";

        try {
            const res = await fetch(`/api/pages/${page._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify({ title: titleVal, content: contentVal })
            });

            if (res.ok) {
                page.title = titleVal;
                page.content = contentVal;
                const sidebarItem = document.getElementById(`page-link-${page._id}`);
                if (sidebarItem) sidebarItem.innerText = titleVal || "Untitled Page";

                if (!silent) {
                    saveBtn.innerText = "Saved";
                    saveBtn.style.color = "#00ff00";
                    setTimeout(() => {
                        saveBtn.innerText = "Save";
                        saveBtn.style.color = "#888";
                    }, 1500);
                }
            }
        } catch (err) { saveBtn.innerText = "Error"; }
    };

    const triggerAutoSave = () => {
        if (!isAutoSaveOn) return; // Respect the toggle
        saveBtn.innerText = "Typing...";
        saveBtn.style.color = "#ffff00";
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => performSave(false), 2000);
    };

    titleInput.addEventListener('input', triggerAutoSave);
    contentInput.addEventListener('input', triggerAutoSave);
    saveBtn.onclick = () => performSave(false);

    // --- INTERACTIVE CHECKBOXES ---
    // This allows clicking a checkbox in View Mode to update the text!
    previewDiv.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') {
            const li = e.target.parentElement;
            const rawText = li.textContent.trim(); // Get the text of the item
            const isChecked = e.target.checked;

            // Logic: Find "- [ ] Text" or "- [x] Text" in the source code
            const originalVal = contentInput.value;
            // Escape special regex characters in the user's text
            const escapedText = rawText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

            let newVal;
            if (isChecked) {
                // Change [ ] to [x]
                const regex = new RegExp(`- \\[ \\] ${escapedText}`, '');
                newVal = originalVal.replace(regex, `- [x] ${rawText}`);
            } else {
                // Change [x] to [ ]
                const regex = new RegExp(`- \\[x\\] ${escapedText}`, '');
                newVal = originalVal.replace(regex, `- [ ] ${rawText}`);
            }

            if (newVal !== originalVal) {
                contentInput.value = newVal;
                saveToHistory(); // Record this change
                if (isAutoSaveOn) triggerAutoSave();
            }
        }
    });

    // --- TOOLBAR INSERT LOGIC ---
    const insertSyntax = (before, after = "") => {
        const start = contentInput.selectionStart;
        const end = contentInput.selectionEnd;
        const text = contentInput.value;
        const selection = text.substring(start, end);
        const newText = text.substring(0, start) + before + selection + after + text.substring(end);
        contentInput.value = newText;
        contentInput.focus();
        contentInput.selectionStart = start + before.length;
        contentInput.selectionEnd = end + before.length;
        saveToHistory(); // Save toolbar actions
        triggerAutoSave();
    };

    toolbar.addEventListener('click', (e) => {
        // Handle Button Clicks
        if (e.target.tagName !== 'BUTTON') return;
        const type = e.target.dataset.type;

        // 🚨 NEW: Handle History Buttons inside Toolbar
        if (type === 'undo') {
            undoBtn.click(); // Trigger the existing logic
            return;
        }
        if (type === 'redo') {
            redoBtn.click(); // Trigger the existing logic
            return;
        }

        switch (type) {
            case 'bold': insertSyntax('**', '**'); break;
            case 'italic': insertSyntax('*', '*'); break;
            case 'header': insertSyntax('## '); break;
            case 'list': insertSyntax('- '); break;
            case 'code': insertSyntax('```\n', '\n```'); break;
            case 'link': insertSyntax('[', '](url)'); break;
        }
    });

    // --- TOGGLE PREVIEW ---
    let isPreviewMode = false;
    previewBtn.onclick = () => {
        isPreviewMode = !isPreviewMode;
        if (isPreviewMode) {
            // Switch to VIEW
            const htmlContent = marked.parse(contentInput.value);
            previewDiv.innerHTML = htmlContent;

            contentInput.style.display = 'none';
            if (toolbar) toolbar.style.display = 'none';
            if (slashMenu) slashMenu.style.display = 'none';
            previewDiv.style.display = 'block';

            previewBtn.innerText = "✏️ Edit";
            previewBtn.classList.add('active');
        } else {
            // Switch to EDIT
            contentInput.style.display = 'block';
            if (toolbar) toolbar.style.display = 'flex';
            previewDiv.style.display = 'none';

            previewBtn.innerText = "👁️ View";
            previewBtn.classList.remove('active');
            contentInput.focus();
        }
    };

    // --- SLASH MENU LOGIC ---
    const executeSlash = (cmd) => {
        const text = contentInput.value;
        const end = contentInput.selectionEnd;
        const before = text.substring(0, end - 1);
        const after = text.substring(end);

        let insert = "";
        switch (cmd) {
            case 'header': insert = "# "; break;
            case 'subheader': insert = "## "; break;
            case 'list': insert = "\n- "; break;
            case 'todo': insert = "\n- [ ] "; break;
            case 'code': insert = "\n```\n\n```\n"; break;
            case 'callout': insert = "\n> 💡 "; break;
            case 'date': insert = `**${new Date().toLocaleDateString()}** `; break;
        }

        contentInput.value = before + insert + after;
        const newPos = before.length + insert.length;
        contentInput.selectionStart = newPos;
        contentInput.selectionEnd = newPos;
        contentInput.focus();
        slashMenu.style.display = 'none';
        saveToHistory();
        triggerAutoSave();
    };

    contentInput.addEventListener('keyup', (e) => {
        if (e.key === '/') slashMenu.style.display = 'block';
        else if (e.key === 'Escape') slashMenu.style.display = 'none';
        else slashMenu.style.display = 'none';
    });

    slashMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.slash-item');
        if (!item) return;
        executeSlash(item.dataset.cmd);
    });

    // --- SMART LIST LOGIC ---
    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const start = contentInput.selectionStart;
            const value = contentInput.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.substring(lineStart, start);
            const isList = /^\s*-\s(.*)/.exec(currentLine);
            const isTodo = /^\s*-\s\[[ x]\]\s(.*)/.exec(currentLine);

            // Escape Empty List
            if ((isList && !isList[1]) || (isTodo && !isTodo[1])) {
                e.preventDefault();
                const newValue = value.substring(0, lineStart) + value.substring(start);
                contentInput.value = newValue;
                contentInput.selectionStart = contentInput.selectionEnd = lineStart;
                return;
            }
            // Continue List
            if (isTodo) {
                e.preventDefault();
                document.execCommand('insertText', false, "\n- [ ] ");
                return;
            }
            if (isList) {
                e.preventDefault();
                document.execCommand('insertText', false, "\n- ");
                return;
            }
        }
    });

    // --- PAGE ICON LOGIC ---
    const iconBtn = document.getElementById('icon-btn');
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;

    const updateIconBtn = () => {
        const match = titleInput.value.match(emojiRegex);
        iconBtn.innerText = match ? match[0] : "📄";
    };
    updateIconBtn();
    titleInput.addEventListener('input', updateIconBtn);

    iconBtn.onclick = async () => {
        let newIcon = null;
        if (typeof UI !== 'undefined') {
            newIcon = await UI.prompt("Type an Emoji", "e.g., 💀, 🚀, 🔐");
        } else {
            newIcon = prompt("Type an Emoji:");
        }
        if (newIcon) {
            let text = titleInput.value.replace(emojiRegex, '').trim();
            titleInput.value = `${newIcon} ${text}`;
            updateIconBtn();
            performSave(false);
        }
    };

    // --- DELETE LOGIC ---
    document.getElementById('delete-page-btn').onclick = async () => {
        if (typeof UI !== 'undefined') {
            if (!(await UI.confirm("Delete Page?", "Gone forever."))) return;
        } else if (!confirm("Delete?")) return;
        try {
            const res = await fetch(`/api/pages/${page._id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.ok) {
                const splitView = document.getElementById('split-view-container');
                if (splitView) splitView.classList.remove('show-editor');
                loadVaultData();
            }
        } catch (err) { console.error(err); }
    };
}

// ==========================================
// 5. ALBUM & GROUP ACTIONS
// ==========================================
async function handleCreateGroup() {
    const name = document.getElementById('new-group-name').value;
    if (!name) {
        UI.toast("Please enter a group name", "error"); // Replaces alert
        return;
    }
    const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ name })
    });
    if (res.ok) {
        UI.toast("Group Created Successfully", "success");
        document.getElementById('new-group-name').value = "";
        loadVaultData();
    }
}

async function handleJoinGroup() {
    const code = document.getElementById('join-group-code').value;
    if (!code) {
        UI.toast("Please enter an invite code", "error");
        return;
    }
    const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ inviteCode: code })
    });
    const data = await res.json();
    if (res.ok) {
        UI.toast(`Joined ${data.group.name}!`, "success");
        document.getElementById('join-group-code').value = "";
        loadVaultData();
    } else {
        UI.toast(data.msg, "error");
    }
}

async function loadAlbumView() {
    const container = document.getElementById('photo-grid');
    if (!container) return;

    let url = '/api/albums?type=personal';
    if (currentContext.type === 'group') {
        url = `/api/albums?type=group&groupId=${currentContext.id}`;
    }

    try {
        const res = await fetch(url, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        const albums = await res.json();

        container.innerHTML = `
            <div class="section-header">
                <div class="section-title">
                    <span>📷 Secure Gallery</span>
                </div>
                <button onclick="createNewAlbum()" class="btn-outline">
                    + New Album
                </button>
            </div>
            <div class="album-grid" id="albums-wrapper"></div>
        `;

        const wrapper = document.getElementById('albums-wrapper');
        if (albums.length === 0) {
            wrapper.innerHTML = `<p style="color:#555; font-family:'Courier New'; font-size:0.9rem; margin-top:10px;">[No encrypted albums found]</p>`;
        }

        albums.forEach(album => {
            const div = document.createElement('div');
            div.className = 'album-card';
            div.innerHTML = `
                <div class="album-folder-icon">📁</div>
                <div class="album-title">${album.name}</div>
                <button onclick="deleteAlbum('${album._id}', event)" class="album-delete-btn">×</button>
            `;
            div.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') openAlbum(album);
            };
            wrapper.appendChild(div);
        });
    } catch (err) { console.error(err); }
}

function openAlbum(album) {
    const container = document.getElementById('photo-grid');
    const inputId = `upload-${album._id}`;

    container.innerHTML = `
        <div class="album-view-controls">
            <button onclick="loadAlbumView()" class="btn-gray">← Back</button>
            <h3>${album.name}</h3>
            <div>
                <button onclick="triggerUpload('${inputId}')" class="btn-green">+ Photos</button>
                <input type="file" id="${inputId}" multiple accept="image/*" style="display:none">
            </div>
        </div>
        <div class="photo-wrapper" id="photos-wrapper"></div>
    `;

    document.getElementById(inputId).onchange = (e) => uploadPhotos(e, album._id);

    const wrapper = document.getElementById('photos-wrapper');
    album.photos.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="/uploads/${photo.filename}" onclick="openLightbox('/uploads/${photo.filename}')">
            <button class="delete-photo-btn" onclick="deletePhoto('${album._id}', '${photo.filename}')">×</button>
        `;
        wrapper.appendChild(div);
    });
}

// --- GLOBAL HELPERS ---
window.triggerUpload = function (inputId) { document.getElementById(inputId).click(); };
window.createNewAlbum = async function () {
    const name = await UI.prompt("New Album Name");
    if (!name) return;
    await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ name, type: currentContext.type, groupId: currentContext.id })
    });
    loadAlbumView();
};
window.uploadPhotos = async function (e, albumId) {
    const files = e.target.files;
    if (!files.length) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('photos', files[i]);
    const res = await fetch(`/api/albums/${albumId}/upload`, {
        method: 'POST',
        headers: { 'x-auth-token': localStorage.getItem('token') },
        body: formData
    });
    if (res.ok) {
        const updated = await res.json();
        openAlbum(updated);
    }
};
window.deleteAlbum = async function (id, e) {
    e.stopPropagation();
    if (!(await UI.confirm("Delete Album?", "All photos inside will be lost."))) return;
    await fetch(`/api/albums/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    loadAlbumView();
};
window.deletePhoto = async function (albumId, filename) {
    if (!(await UI.confirm("Delete Photo?", "Are you sure?"))) return;
    const res = await fetch(`/api/albums/${albumId}/photo/${filename}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    if (res.ok) {
        const updated = await res.json();
        openAlbum(updated);
    }
};
window.openLightbox = function (src) {
    const box = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    box.classList.remove('hidden');
};
window.closeLightbox = function () {
    document.getElementById('lightbox').classList.add('hidden');
};

// --- GLOBAL GROUP ACTIONS ---
window.leaveGroup = async function (groupId) {
    const yes = await UI.confirm("Leave Group?", "You will lose access to these files.");
    if (!yes) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', headers: { 'x-auth-token': token } });
    location.reload();
};

window.deleteGroup = async function (groupId) {
    const yes = await UI.confirm("Delete Group?", "⚠️ WARNING: This wipes all data for everyone.");
    if (!yes) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
    location.reload();
};

// --- GAME OVER LOGIC ---
async function triggerGameOver() {
    // 1. Update High Score (localStorage)
    let isNewBest = false;
    if (fakeScore > highScore) {
        highScore = fakeScore;
        localStorage.setItem('fakeHighScore', highScore);
        isNewBest = true;
    }

    // 2. Update Kuizu result card UI
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = fakeScore;
    if (highScoreDisplay) highScoreDisplay.innerText = highScore;

    // Correct count
    const correctEl = document.getElementById('correct-count');
    if (correctEl) correctEl.innerText = `${correctCount}/5`;

    // Personal best
    const pbEl = document.getElementById('personal-best');
    if (pbEl) pbEl.innerText = highScore;

    // Dynamic title
    const titleEl = document.getElementById('result-title');
    const subEl = document.getElementById('result-subtitle');
    if (titleEl) {
        if (fakeScore === 50) {
            titleEl.innerText = 'Perfect Score! 🎉';
            if (subEl) subEl.innerText = 'You got every single one right. Impressive!';
        } else if (fakeScore >= 30) {
            titleEl.innerText = 'Great Job! 🎯';
            if (subEl) subEl.innerText = 'Solid performance — keep it up to hit 50!';
        } else if (fakeScore >= 10) {
            titleEl.innerText = 'Nice Try! 🧠';
            if (subEl) subEl.innerText = 'You can do better. Play again and improve!';
        } else {
            titleEl.innerText = 'Better Luck Next Time 😅';
            if (subEl) subEl.innerText = 'Every master was once a beginner. Try again!';
        }
    }

    // 3. Switch screens
    if (quizGame) quizGame.classList.add('hidden');
    if (quizResult) quizResult.classList.remove('hidden');

    // 4. Submit score to leaderboard API
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const res = await fetch('/api/leaderboard/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ score: fakeScore })
            });
            if (res.ok) {
                const data = await res.json();
                // Show rank reveal
                const rankReveal = document.getElementById('rank-reveal');
                const rankText = document.getElementById('rank-text');
                if (rankReveal && rankText) {
                    rankText.innerText = `🏆 You are Rank #${data.rank} globally!`;
                    rankReveal.style.display = 'block';
                }
                if (data.isNewHighScore) {
                    if (titleEl) titleEl.innerText = '🏆 New High Score!';
                }
            }
        } catch (err) {
            console.warn('Could not submit score:', err);
        }
    }
}

// --- RESTART LISTENER ---
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        // Reset all state
        fakeScore = 0;
        correctCount = 0;
        currentPattern = [];
        questionIndex = 0;

        // Reset score UI
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.innerText = '0';

        // Reset progress dots
        for (let i = 0; i < 5; i++) {
            const d = document.getElementById(`dot-${i}`);
            if (d) { d.className = 'kz-dot'; if (i === 0) d.classList.add('current'); }
        }

        // Reset option buttons
        document.querySelectorAll('.opt-btn').forEach(b => {
            b.classList.remove('correct', 'wrong');
            b.disabled = false;
        });

        // Hide rank reveal
        const rankReveal = document.getElementById('rank-reveal');
        if (rankReveal) rankReveal.style.display = 'none';

        // Switch screens back to intro
        if (quizResult) quizResult.classList.add('hidden');
        if (quizIntro) quizIntro.classList.remove('hidden');
    });
}
