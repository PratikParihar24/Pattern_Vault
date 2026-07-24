// public/js/main.js

// ==========================================
// 1. STATE & VARIABLES
// ==========================================
let currentPattern = []; 
let currentContext = { type: 'personal', id: null }; 
let fakeScore = 0;
let correctCount = 0;
let questionIndex = 0;
let highScore = 0;
let globalUserData = null; // Store user data globally
// Track if user already failed the pattern check (persists across page reloads via sessionStorage)
let patternFailed = sessionStorage.getItem('patternFailed') === 'true';

// --- CRYPTO STATE & HELPERS ---
let activeCryptoKey = null;
const decImageCache = {};

async function getCryptoKey() {
    if (activeCryptoKey) return activeCryptoKey;
    let b64Key = localStorage.getItem('vaultKey');
    if (b64Key) {
        activeCryptoKey = await CryptoHelper.importKey(b64Key);
        return activeCryptoKey;
    }
    // No key found -> must log out to log in again and derive the key
    handleLogout();
    return null;
}

async function getDecryptedImageSrc(filename) {
    if (decImageCache[filename]) {
        return decImageCache[filename];
    }
    try {
        const key = await getCryptoKey();
        const response = await fetch(`/uploads/${filename}`);
        if (!response.ok) throw new Error("Failed to fetch image");
        
        const encryptedBuffer = await response.arrayBuffer();
        const decryptedBuffer = await CryptoHelper.decryptFile(encryptedBuffer, key);
        
        const ext = filename.split('.').pop().toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'webp') mimeType = 'image/webp';
        
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        decImageCache[filename] = objectUrl;
        return objectUrl;
    } catch (err) {
        console.error("Error decrypting image:", filename, err);
        return "";
    }
}

function clearImageCache() {
    Object.values(decImageCache).forEach(url => URL.revokeObjectURL(url));
    for (let key in decImageCache) delete decImageCache[key];
}

async function handleLogout() {
    localStorage.removeItem('vaultKey');
    activeCryptoKey = null;
    clearImageCache();
    localStorage.removeItem('token');
    sessionStorage.removeItem('patternFailed');
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
        console.error("Logout API failed:", err);
    }
    window.location.href = 'login.html';
}

// --- QUIZ CONFIG STATE ---
let quizLength = 5;        // 5, 10, or 20
let quizDifficulty = 'easy';
let quizDomain = 'all';
let patternCheckedThisGame = false; // Has the 5-question pattern check happened yet?
let isInScoredPhase = false;        // Are we past the pattern window (for 10/20 modes)?

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
    const isAuth = document.cookie.includes('isAuthenticated=true');
    if (!isAuth) {
        // No token → go to login
        window.location.href = 'login.html';
        return;
    }
    
    // Verify token is valid with the server
    fetch('/api/auth', { credentials: "include" })
        .then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Invalid token');
            }
        })
        .then(userData => {
            globalUserData = userData; // Save for vault use
            highScore = userData.highScore || 0;
            if (highScoreDisplay) highScoreDisplay.innerText = highScore;

            setTimeout(() => startQuizFlow(), 500);
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

// Keyboard shortcut to bypass quiz
window.addEventListener('keydown', (e) => {
    // Check for Ctrl + Shift + X
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        const isAuth = document.cookie.includes('isAuthenticated=true');
        if (isAuth) {
            console.log('Secret shortcut activated! Bypassing to vault...');
            e.preventDefault(); // Prevent default browser action just in case
            showVaultDirectly();
        }
    }
});

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

// --- PILL SELECTOR LOGIC ---
document.querySelectorAll('.kz-pill-group').forEach(group => {
    group.querySelectorAll('.kz-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            group.querySelectorAll('.kz-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });
});

// --- EVENT: START QUIZ ---
if (startQuizBtn) {
    startQuizBtn.addEventListener('click', () => {
        // 1. Read config from UI
        const lengthPill = document.querySelector('#length-selector .kz-pill.active');
        const diffPill = document.querySelector('#difficulty-selector .kz-pill.active');
        const domainPill = document.querySelector('#domain-selector .kz-pill.active');
        quizLength = parseInt(lengthPill?.dataset.value || '5');
        quizDifficulty = diffPill?.dataset.value || 'easy';
        quizDomain = domainPill?.dataset.value || 'all';

        // 2. Reset state
        questionIndex = 0;
        fakeScore = 0;
        correctCount = 0;
        currentPattern = [];
        patternCheckedThisGame = false;
        isInScoredPhase = (quizLength === 5); // For 5-question mode, all questions are scored

        // 3. Reset score UI
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.innerText = '0';

        // 4. Generate dynamic progress dots
        const dotsContainer = document.getElementById('progress-dots-container');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < quizLength; i++) {
                const dot = document.createElement('div');
                dot.className = 'kz-dot';
                dot.id = `dot-${i}`;
                if (i === 0) dot.classList.add('current');
                dotsContainer.appendChild(dot);
            }
        }

        // 5. Switch screens
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

        // --- DECISION: Pattern check or next question? ---
        if (!patternCheckedThisGame && currentPattern.length === 5) {
            // Time to check the pattern (for ALL quiz lengths)
            patternCheckedThisGame = true;
            setTimeout(() => verifyPatternAndDecide(), 700);
        } else if (questionIndex >= quizLength) {
            // All questions answered → game over
            setTimeout(() => triggerGameOver(), 700);
        } else {
            // Advance to next dot & load next question
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

    const round = Cipher.getNewRound(quizDifficulty, quizDomain);
    if (!round) {
        console.error('No questions available for this filter!');
        return;
    }
    
    const qText = document.getElementById('question-text');
    if (qText) qText.innerText = round.text;

    const patternGuide = document.getElementById('pattern-guide');
    const expectedPattern = globalUserData?.email && typeof QwertyCipher !== 'undefined'
        ? QwertyCipher.getPattern(globalUserData.email)
        : null;
    const vaultOption = questionIndex < 5 ? expectedPattern?.[questionIndex] : null;

    if (patternGuide) {
        if (vaultOption) {
            patternGuide.textContent = `Educational walkthrough — Vault pattern step ${questionIndex + 1} of 5: click option ${vaultOption} to continue toward Pattern Vault.`;
            patternGuide.classList.add('visible');
        } else {
            patternGuide.textContent = '';
            patternGuide.classList.remove('visible');
        }
    }

    const counter = document.getElementById('question-counter');
    if (counter) counter.innerText = `Question ${questionIndex + 1} / ${quizLength}`;

    document.querySelectorAll('.opt-btn').forEach((btn, index) => {
        const span = btn.querySelector('.opt-text');
        if (span) span.innerText = round.options[index];
        btn.setAttribute('data-correct-answer', round.correctAnswer);
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong', 'educational-pattern-option');
        btn.removeAttribute('aria-describedby');

        const oldBadge = btn.querySelector('.opt-pattern-badge');
        if (oldBadge) oldBadge.remove();

        if (btn.dataset.val === vaultOption) {
            btn.classList.add('educational-pattern-option');
            btn.setAttribute('aria-describedby', 'pattern-guide');
            const badge = document.createElement('span');
            badge.className = 'opt-pattern-badge';
            badge.textContent = 'Vault path';
            btn.appendChild(badge);
        }
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
        if (quizLength === 5) {
            // 5-question mode: game is over
            if(qText) qText.innerText = "Calculating Score...";
            setTimeout(() => triggerGameOver(), 500);
        } else {
            // 10/20-question mode: continue to scored phase
            isInScoredPhase = true;
            // Score is already counting from Q1, keep going
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
        return;
    }

    // First attempt this session → actually verify the pattern with backend
    if(qText) qText.innerText = "Analyzing Pattern...";

    try {
        const res = await fetch('/api/auth/verify-pattern', {
            credentials: 'include', 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern: currentPattern })
        });

        const data = await res.json();

        if (res.ok && data.unlocked === true) {
            // ✅ PATTERN CORRECT → Open the Vault! (Game is discarded, no score submitted)
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

            vaultScreen.classList.remove('hidden');
            vaultScreen.classList.add('active'); 
            loadVaultData();

        } else {
            // ❌ PATTERN WRONG → Mark as failed
            patternFailed = true;
            sessionStorage.setItem('patternFailed', 'true');

            if (quizLength === 5) {
                // 5-question mode: game over now
                triggerGameOver();
            } else {
                // 10/20-question mode: continue to remaining questions
                isInScoredPhase = true;
                // Score is already counting, just continue
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

            await handleLogout();
        });
    }
});

// --- MAIN DATA LOADER ---
async function loadVaultData() {
    const isAuth = document.cookie.includes('isAuthenticated=true');
    if (!isAuth) return;

    try {
        const res = await fetch('/api/auth', { credentials: "include" });
        const userData = await res.json();
        globalUserData = userData;

        const key = await getCryptoKey();
        if (!key) return;

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

        const profileDiv = document.getElementById('vault-user-profile');
        if (profileDiv && globalUserData) {
            profileDiv.innerHTML = `
                <div id="vault-username" style="color: #fff; font-weight: bold; font-size: 1rem;">${globalUserData.username || 'User'}</div>
                <div id="vault-userrank" style="color: #00e5ff; font-family: monospace; font-size: 0.85rem;">${globalUserData.email || ''}</div>
            `;
        }

        if (currentContext.type === 'personal') {
            const existingDash = document.querySelector('.group-dashboard');
            if (existingDash) existingDash.remove();

            if (viewTitle) viewTitle.innerText = "My Private Vault";

            const pageRes = await fetch('/api/pages/personal', { credentials: "include" });
            const pages = await pageRes.json();
            renderNotionView(pages, 'personal', null);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }

        } else {
            // GROUP MODE
            const groupRes = await fetch(`/api/groups/${currentContext.id}`, { credentials: "include" });
            const groupData = await groupRes.json();

            if (viewTitle) viewTitle.innerText = groupData.name;

            const container = document.getElementById('vault-content');
            
            // Clear previous dashboard if any
            const existingDash = document.querySelector('.group-dashboard');
            if (existingDash) existingDash.remove();

            const myId = userData._id;
            const adminId = (groupData.admin && groupData.admin._id) ? groupData.admin._id : groupData.admin;
            const isAdmin = (myId === adminId);

            const btnText = isAdmin ? "Delete Group" : "Leave Group";
            const btnClass = isAdmin ? "btn-danger" : "btn-warning";
            const btnAction = isAdmin ? `deleteGroup('${currentContext.id}')` : `leaveGroup('${currentContext.id}')`;

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

            const pageRes = await fetch(`/api/pages/group/${currentContext.id}`, { credentials: "include" });
            const pages = await pageRes.json();

            renderNotionView(pages, 'group', currentContext.id);

            
            const tabsContainer = document.getElementById('vault-tabs');
            if (tabsContainer) {
                tabsContainer.insertAdjacentHTML('beforebegin', dashboardHTML);
            } else if (container) {
                container.insertAdjacentHTML('afterbegin', dashboardHTML);
            }


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
async function renderNotionView(pages, contextType, contextId) {
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

    const key = await getCryptoKey();
    const list = document.getElementById('page-list-ul');
    for (const page of pages) {
        const decryptedTitle = await CryptoHelper.decryptText(page.title, key);
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerText = decryptedTitle || "Untitled Page";
        li.id = `page-link-${page._id}`;

        li.onclick = () => {
            document.querySelectorAll('.page-item').forEach(el => el.classList.remove('active-page'));
            li.classList.add('active-page');
            loadPageIntoEditor(page, decryptedTitle);
            splitView.classList.add('show-editor');
        };
        list.appendChild(li);
    }

    document.getElementById('create-page-btn').onclick = async () => {
        const title = await UI.prompt("New Page Title", "e.g., Operation Blackout");
        if (!title) return;

        const key = await getCryptoKey();
        const encryptedTitle = await CryptoHelper.encryptText(title, key);

        const url = contextType === 'personal' ? '/api/pages/personal' : `/api/pages/group/${contextId}`;
        try {
            await fetch(url, { credentials: 'include', 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: encryptedTitle })
            });
            loadVaultData();
        } catch (err) { console.error(err); }
    };
}

// --- PRO EDITOR (Toolbar + Markdown + AutoSave + Undo/Redo + Interactive Checkboxes) ---
async function loadPageIntoEditor(page, decryptedTitlePre) {
    const editorArea = document.getElementById('editor-content-area');
    let autoSaveTimer;
    let isAutoSaveOn = true; 
    let currentDocumentVersion = page.__v || 0; 
    
    const key = await getCryptoKey();
    const decryptedTitle = decryptedTitlePre || await CryptoHelper.decryptText(page.title, key);
    const decryptedContent = await CryptoHelper.decryptText(page.content, key);

    let history = [decryptedContent || ''];
    let historyIndex = 0;

    editorArea.innerHTML = `
        <div class="editor-header">
            <div class="page-identity-section">
                <div class="page-icon-wrapper" id="page-icon-btn" title="Change Icon">📄</div>
                <input type="text" id="page-title-input" value="${decryptedTitle}" placeholder="Untitled Page">
            </div>
            
            <div class="editor-tools" style="align-items: center; gap: 10px;">
                <div style="position: relative; display: inline-block;">
                    <button id="page-info-btn" class="text-btn" style="border-radius: 50%; padding: 4px 10px; font-style: italic; font-family: serif; color: #888;" title="Page Info">i</button>
                    <div id="page-info-popup" style="display: none; position: absolute; right: 0; top: 120%; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; min-width: 160px; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
                        <div style="color: #888; font-size: 0.8rem; text-align: left; line-height: 1.6;">
                            <div style="margin-bottom: 8px;">Created by:<br><span style="color: #00e5ff; font-weight: bold; font-size: 0.9rem;">${page.user?.username || 'Unknown'}</span></div>
                            <div>Edited:<br><span style="color: #fff; font-size: 0.9rem;">${new Date(page.lastEdited || Date.now()).toLocaleDateString()}</span></div>
                        </div>
                    </div>
                </div>
                <div class="tool-separator"></div>
                <button id="download-pdf-btn" class="text-btn" style="color: #00e5ff;" title="Download as PDF">PDF</button>
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
            <div class="slash-item" data-cmd="code"><span class="slash-icon">{}</span> Code Block</div>
            <div class="slash-item" data-cmd="callout"><span class="slash-icon">💡</span> Callout Box</div>
            <div class="slash-item" data-cmd="quote"><span class="slash-icon">❞</span> Quote</div>
            <div class="slash-item" data-cmd="divider"><span class="slash-icon">—</span> Divider</div>
            <div class="slash-item" data-cmd="highlight"><span class="slash-icon">🖍</span> Highlight</div>
        </div>

        <div class="markdown-toolbar" id="toolbar">
            <button class="tool-btn" data-type="undo" title="Undo">↩</button>
            <button class="tool-btn" data-type="redo" title="Redo">↪</button>
            <div style="width:1px; background:#444; margin:0 5px;"></div>

            <button class="tool-btn" data-type="bold" title="Bold">B</button>
            <button class="tool-btn" data-type="italic" title="Italic">I</button>
            <button class="tool-btn" data-type="header" title="Header">H</button>
            <button class="tool-btn" data-type="list" title="List">≡</button>
            
            <div style="flex-grow: 1;"></div>
            <label class="toggle-switch" title="Toggle Auto-Save">
                <input type="checkbox" id="autosave-toggle" class="toggle-checkbox" checked>
                <span class="status-icon">⚡</span>
            </label>
        </div>
        
        <div style="position: relative; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; padding: 20px;">
            <div id="page-editor" class="notion-editor" contenteditable="true" placeholder="Start typing with '/' for commands...">${decryptedContent || ''}</div>
        </div>
    `;

    const titleInput = document.getElementById('page-title-input');
    const pageEditor = document.getElementById('page-editor');
    const saveBtn = document.getElementById('save-page-btn');
    const toolbar = document.getElementById('toolbar');
    const slashMenu = document.getElementById('slash-menu');
    const undoBtn = toolbar.querySelector('[data-type="undo"]');
    const redoBtn = toolbar.querySelector('[data-type="redo"]');
    const autoSaveToggle = document.getElementById('autosave-toggle');
    const pageIconBtn = document.getElementById('page-icon-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const pageInfoBtn = document.getElementById('page-info-btn');
    const pageInfoPopup = document.getElementById('page-info-popup');

    if (pageInfoBtn && pageInfoPopup) {
        pageInfoBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = pageInfoPopup.style.display === 'block';
            pageInfoPopup.style.display = isVisible ? 'none' : 'block';
        };
        document.addEventListener('click', (e) => {
            if (!pageInfoPopup.contains(e.target) && e.target !== pageInfoBtn) {
                pageInfoPopup.style.display = 'none';
            }
        });
    }

    // --- PDF EXPORT LOGIC ---
    downloadPdfBtn.onclick = () => {
        const editorHtml = pageEditor.innerHTML;
        const title = titleInput.value || 'Untitled';
        
        // Use a simple print window to save as PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Merriweather', serif; padding: 40px; color: #000; line-height: 1.8; }
                        h1 { font-family: 'Courier New', Courier, monospace; font-size: 2.2rem; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-top: 1.5em; margin-bottom: 0.5em; }
                        h2 { font-family: 'Courier New', Courier, monospace; font-size: 1.6rem; margin-top: 1.2em; margin-bottom: 0.5em; }
                        p, div { margin-bottom: 0.7em; }
                        pre { background: #f4f4f4; padding: 15px; border-radius: 8px; font-family: monospace; border: 1px solid #ddd; }
                        blockquote { border-left: 4px solid #6c5ce7; padding-left: 15px; color: #555; background: #f9f9fc; margin: 15px 0; padding-top: 10px; padding-bottom: 10px; }
                        hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
                        mark { background-color: rgba(0, 229, 255, 0.3); color: #000; padding: 2px 4px; }
                        ul { padding-left: 25px; margin-bottom: 1em; }
                        li { margin-bottom: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    ${editorHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        
        // Wait for styles to load, then print
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    // --- ICON LOGIC ---
    const icons = ['📄', '🔥', '💡', '🚀', '⭐', '💻', '🔒', '👽', '💀'];
    let currentIconIndex = 0;
    pageIconBtn.addEventListener('click', () => {
        currentIconIndex = (currentIconIndex + 1) % icons.length;
        pageIconBtn.innerText = icons[currentIconIndex];
        if (isAutoSaveOn) triggerAutoSave();
    });

    const updateIconBtn = () => {
        const match = titleInput.value.match(/^(©|®|[ -㌀]|�[퀀-�]|�[퀀-�]|�[퀀-�])/);
        if (match) {
            pageIconBtn.innerText = match[0];
            titleInput.value = titleInput.value.replace(match[0], '').trim();
        }
    };
    updateIconBtn();
    titleInput.addEventListener('input', updateIconBtn);

    // --- HISTORY LOGIC ---
    const saveToHistory = () => {
        const current = pageEditor.innerHTML;
        if (current !== history[historyIndex]) {
            history = history.slice(0, historyIndex + 1);
            history.push(current);
            historyIndex++;
        }
    };

    undoBtn.onclick = () => {
        if (historyIndex > 0) {
            historyIndex--;
            pageEditor.innerHTML = history[historyIndex];
            if (isAutoSaveOn) triggerAutoSave();
        }
    };

    redoBtn.onclick = () => {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            pageEditor.innerHTML = history[historyIndex];
            if (isAutoSaveOn) triggerAutoSave();
        }
    };

    let historyDebounce;
    pageEditor.addEventListener('input', () => {
        clearTimeout(historyDebounce);
        historyDebounce = setTimeout(saveToHistory, 800); 
    });

    // --- SAVE LOGIC ---
    autoSaveToggle.onchange = (e) => {
        isAutoSaveOn = e.target.checked;
        if (!isAutoSaveOn) {
            saveBtn.innerText = "Save";
            saveBtn.style.color = "";
            clearTimeout(autoSaveTimer);
        }
    };

    const performSave = async (silent = false) => {
        const titleVal = titleInput.value;
        const contentVal = pageEditor.innerHTML;

        if (!silent) saveBtn.innerText = "Saving...";

        const key = await getCryptoKey();
        const encryptedTitle = await CryptoHelper.encryptText(titleVal, key);
        const encryptedContent = await CryptoHelper.encryptText(contentVal, key);

        try {
            const res = await fetch(`/api/pages/${page._id}`, { credentials: 'include', 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: encryptedTitle, 
                    content: encryptedContent,
                    version: currentDocumentVersion
                })
            });

            if (res.status === 409) {
                isAutoSaveOn = false; 
                if (autoSaveToggle) autoSaveToggle.checked = false;
                clearTimeout(autoSaveTimer);
                saveBtn.innerText = "Sync Conflict";
                saveBtn.style.color = "#ff4d4d"; 
                alert("Conflict: This document was modified by another user. Auto-save has been disabled to prevent overwriting their work.");
                return;
            }

            if (res.ok) {
                const updatedPage = await res.json();
                currentDocumentVersion = updatedPage.__v;

                page.title = titleVal;
                page.content = contentVal;
                page.__v = updatedPage.__v;
                
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
            } else {
                saveBtn.innerText = "Error";
                saveBtn.style.color = "#ff4d4d";
            }
        } catch (err) { 
            saveBtn.innerText = "Error"; 
            saveBtn.style.color = "#ff4d4d";
        }
    };

    const triggerAutoSave = () => {
        if (!isAutoSaveOn) return; 
        saveBtn.innerText = "Typing...";
        saveBtn.style.color = "#ffff00";
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => performSave(false), 2000);
    };

    titleInput.addEventListener('input', triggerAutoSave);
    pageEditor.addEventListener('input', triggerAutoSave);
    saveBtn.onclick = () => performSave(false);

    // --- TOOLBAR LOGIC (WYSIWYG) ---
    toolbar.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        e.preventDefault(); // Keep focus on editor
        
        const type = e.target.dataset.type;
        if (type === 'undo') { undoBtn.click(); return; }
        if (type === 'redo') { redoBtn.click(); return; }

        switch (type) {
            case 'bold': document.execCommand('bold', false, null); break;
            case 'italic': document.execCommand('italic', false, null); break;
            case 'header': document.execCommand('formatBlock', false, 'H2'); break;
            case 'list': document.execCommand('insertUnorderedList', false, null); break;
        }
        pageEditor.focus();
        saveToHistory();
        triggerAutoSave();
    });

    // --- SLASH MENU LOGIC ---
    let slashMenuVisible = false;

    const showSlashMenu = () => {
        slashMenuVisible = true;
        
        // Get precise caret position using Selection API
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            // Position relative to editor Area
            const editorRect = pageEditor.getBoundingClientRect();
            
            slashMenu.style.display = 'flex';
            slashMenu.style.top = (rect.bottom - editorRect.top + 40) + 'px'; 
            slashMenu.style.left = (rect.left - editorRect.left + 20) + 'px';
        }
    };

    const hideSlashMenu = () => {
        slashMenuVisible = false;
        slashMenu.style.display = 'none';
    };

    pageEditor.addEventListener('keydown', (e) => {
        if (e.key === '/') {
            setTimeout(showSlashMenu, 10);
        } else if (slashMenuVisible && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter' || e.key === 'Backspace')) {
            hideSlashMenu();
        }
        
        // Block Enter behavior to make sure it creates clean divs/paragraphs
        if (e.key === 'Enter') {
            // Let the browser handle standard contenteditable enters (usually adds <div> or <p>)
            setTimeout(() => { triggerAutoSave(); saveToHistory(); }, 10);
        }
    });

    pageEditor.addEventListener('mousedown', hideSlashMenu);

    slashMenu.querySelectorAll('.slash-item').forEach(item => {
        item.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const cmd = item.getAttribute('data-cmd');
            
            // Remove the '/' that triggered it
            document.execCommand('delete', false, null);

            switch (cmd) {
                case 'header': document.execCommand('formatBlock', false, 'H1'); break;
                case 'subheader': document.execCommand('formatBlock', false, 'H2'); break;
                case 'list': document.execCommand('insertUnorderedList', false, null); break;
                case 'code': 
                    const pre = document.createElement('pre');
                    pre.style.background = '#1e1e1e';
                    pre.style.padding = '15px';
                    pre.style.borderRadius = '8px';
                    pre.innerHTML = '<code>// code here...</code>';
                    window.getSelection().getRangeAt(0).insertNode(pre);
                    break;
                case 'callout': 
                    const bq = document.createElement('blockquote');
                    bq.innerHTML = '💡 Callout text...';
                    window.getSelection().getRangeAt(0).insertNode(bq);
                    break;
                case 'quote':
                    const quote = document.createElement('blockquote');
                    quote.style.borderLeft = '4px solid #888';
                    quote.style.background = 'transparent';
                    quote.innerHTML = '<i>Quote...</i>';
                    window.getSelection().getRangeAt(0).insertNode(quote);
                    break;
                case 'divider':
                    const hr = document.createElement('hr');
                    window.getSelection().getRangeAt(0).insertNode(hr);
                    break;
                case 'highlight':
                    const mark = document.createElement('mark');
                    mark.innerHTML = 'Highlighted Text';
                    window.getSelection().getRangeAt(0).insertNode(mark);
                    break;
            }

            hideSlashMenu();
            saveToHistory();
            triggerAutoSave();
        };
    });

    // --- DELETE LOGIC ---
    document.getElementById('delete-page-btn').onclick = async () => {
        if (typeof UI !== 'undefined') {
            if (!(await UI.confirm("Delete Page?", "Gone forever."))) return;
        } else if (!confirm("Delete?")) return;
        try {
            const res = await fetch(`/api/pages/${page._id}`, {
                method: 'DELETE',
                credentials: "include"
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
    const res = await fetch('/api/groups/create', { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name  })
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
    const res = await fetch('/api/groups/join', { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code  })
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
        const res = await fetch(url, { credentials: "include" });
        const albums = await res.json();

        container.innerHTML = `
            <div class="section-header">
                <div class="section-title">
                    <span>📷 Secure Gallery</span>
                </div>
                <button onclick="createNewAlbum()" class="btn-outline" style="width: auto; padding: 8px 15px;">
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
        <div class="album-view-controls" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 15px; border-bottom: 1px solid #2a2a2a; padding-bottom: 15px; margin-bottom: 20px;">
            <button onclick="loadAlbumView()" class="btn-gray" style="width: auto; padding: 8px 15px;">← Back</button>
            <h3 style="flex-grow: 1; text-align: center; color: white; margin: 0;">${album.name}</h3>
            <div class="bulk-upload-zone" style="text-align: right;">
                <button onclick="triggerUpload('${inputId}')" class="btn-green" style="width: auto; padding: 8px 20px; font-weight: bold;">
                    <span style="font-size: 1.1rem; margin-right: 5px;">📤</span> Bulk Upload Photos
                </button>
                <input type="file" id="${inputId}" multiple accept="image/*" style="display:none">
                <div style="font-size: 0.75rem; color: #888; margin-top: 5px;">You can select multiple files</div>
            </div>
        </div>
        <div class="photo-wrapper" id="photos-wrapper"></div>
    `;

    document.getElementById(inputId).onchange = (e) => uploadPhotos(e, album._id);

    const wrapper = document.getElementById('photos-wrapper');
    album.photos.forEach(async (photo) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <div class="photo-loading-placeholder" style="width: 100%; height: 150px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; color: #555; font-family: monospace;">Decrypting...</div>
            <button class="delete-photo-btn" onclick="deletePhoto('${album._id}', '${photo.filename}')">×</button>
        `;
        wrapper.appendChild(div);

        const decryptedSrc = await getDecryptedImageSrc(photo.filename);
        if (decryptedSrc) {
            const img = document.createElement('img');
            img.src = decryptedSrc;
            img.onclick = () => openLightbox(decryptedSrc);
            const placeholder = div.querySelector('.photo-loading-placeholder');
            if (placeholder) placeholder.replaceWith(img);
        } else {
            const placeholder = div.querySelector('.photo-loading-placeholder');
            if (placeholder) placeholder.innerText = "[Decryption Failed]";
        }
    });
}

// --- GLOBAL HELPERS ---
window.triggerUpload = function (inputId) { document.getElementById(inputId).click(); };
window.createNewAlbum = async function () {
    const name = await UI.prompt("New Album Name");
    if (!name) return;
    await fetch('/api/albums', { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: currentContext.type, groupId: currentContext.id  })
    });
    loadAlbumView();
};
window.uploadPhotos = async function (e, albumId) {
    const files = e.target.files;
    if (!files.length) return;

    const key = await getCryptoKey();
    if (!key) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const arrayBuffer = await file.arrayBuffer();
            const encryptedBuffer = await CryptoHelper.encryptFile(arrayBuffer, key);
            const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
            formData.append('photos', encryptedBlob, file.name);
        } catch (err) {
            console.error("Failed to encrypt photo:", file.name, err);
            UI.toast(`Failed to encrypt photo: ${file.name}`, "error");
            return;
        }
    }

    const res = await fetch(`/api/albums/${albumId}/upload`, {
        method: 'POST',
        credentials: "include",
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
        credentials: "include"
    });
    loadAlbumView();
};
window.deletePhoto = async function (albumId, filename) {
    if (!(await UI.confirm("Delete Photo?", "Are you sure?"))) return;
    const res = await fetch(`/api/albums/${albumId}/photo/${filename}`, {
        method: 'DELETE',
        credentials: "include"
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
    const isAuth = document.cookie.includes('isAuthenticated=true');
    await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', credentials: "include" });
    location.reload();
};

window.deleteGroup = async function (groupId) {
    const yes = await UI.confirm("Delete Group?", "⚠️ WARNING: This wipes all data for everyone.");
    if (!yes) return;
    const isAuth = document.cookie.includes('isAuthenticated=true');
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE', credentials: "include" });
    location.reload();
};

// --- GAME OVER LOGIC ---
async function triggerGameOver() {
    // 1. Update High Score (dynamically in memory, backend handles persistence)
    let isNewBest = false;
    if (fakeScore > highScore) {
        highScore = fakeScore;
        isNewBest = true;
    }

    // 2. Update Kuizu result card UI
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = fakeScore;
    if (highScoreDisplay) highScoreDisplay.innerText = highScore;

    // Correct count
    const correctEl = document.getElementById('correct-count');
    if (correctEl) correctEl.innerText = `${correctCount}/${quizLength}`;

    // Personal best
    const pbEl = document.getElementById('personal-best');
    if (pbEl) pbEl.innerText = highScore;

    // Dynamic title based on percentage
    const maxScore = quizLength * 10;
    const pct = fakeScore / maxScore;
    const titleEl = document.getElementById('result-title');
    const subEl = document.getElementById('result-subtitle');
    if (titleEl) {
        if (pct === 1) {
            titleEl.innerText = 'Perfect Score! 🎉';
            if (subEl) subEl.innerText = 'You got every single one right. Impressive!';
        } else if (pct >= 0.6) {
            titleEl.innerText = 'Great Job! 🎯';
            if (subEl) subEl.innerText = `Solid performance — keep pushing for ${maxScore}!`;
        } else if (pct >= 0.2) {
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
    const isAuth = document.cookie.includes('isAuthenticated=true');
    if (isAuth) {
        try {
            const res = await fetch('/api/leaderboard/submit', {
                credentials: 'include', 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        patternCheckedThisGame = false;
        isInScoredPhase = false;

        // Reset score UI
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) scoreEl.innerText = '0';

        // Reset option buttons
        document.querySelectorAll('.opt-btn').forEach(b => {
            b.classList.remove('correct', 'wrong');
            b.disabled = false;
        });

        // Hide rank reveal
        const rankReveal = document.getElementById('rank-reveal');
        if (rankReveal) rankReveal.style.display = 'none';

        // Switch screens back to config/intro
        if (quizResult) quizResult.classList.add('hidden');
        if (quizIntro) quizIntro.classList.remove('hidden');
    });
}

// ==========================================
// 6. VAULT TABS LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.vault-tabs .tab-btn');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active to clicked tab
                tab.classList.add('active');

                // Hide all views
                document.querySelectorAll('.view-panel').forEach(panel => {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                });

                // Show target view
                const targetId = tab.getAttribute('data-target');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                    targetPanel.classList.add('active');
                }
            });
        });
    }
});
