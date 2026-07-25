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
    let b64Key = typeof SessionManager !== 'undefined' ? await SessionManager.getVaultKey() : localStorage.getItem('vaultKey');
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
    const createPrivatePageBtn = document.getElementById('create-page-btn-sidebar');
    if (createPrivatePageBtn) {
        createPrivatePageBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            currentContext = { type: 'personal', id: null };
            await createNewBlockPage(null, 'personal', null);
        });
    }

    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) createGroupBtn.addEventListener('click', handleCreateGroup);

    const joinGroupBtn = document.getElementById('join-group-btn');
    if (joinGroupBtn) joinGroupBtn.addEventListener('click', handleJoinGroup);

    // Shared Groups Accordion / Modal
    const openGroupModalBtn = document.getElementById('open-group-modal-btn');
    const groupModal = document.getElementById('group-modal');
    const closeGroupModalBtn = document.getElementById('modal-close-group-btn');
    const modalCreateBtn = document.getElementById('modal-create-group-btn');
    const modalJoinBtn = document.getElementById('modal-join-group-btn');

    if (openGroupModalBtn && groupModal) {
        openGroupModalBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            groupModal.classList.remove('hidden');
        };
    }

    if (closeGroupModalBtn && groupModal) {
        closeGroupModalBtn.onclick = () => groupModal.classList.add('hidden');
    }

    if (groupModal) {
        groupModal.onclick = (e) => {
            if (e.target === groupModal) groupModal.classList.add('hidden');
        };
    }

    if (modalCreateBtn) {
        modalCreateBtn.onclick = async (e) => {
            if (e) e.preventDefault();
            const input = document.getElementById('modal-group-name');
            if (input && input.value.trim()) {
                const res = await fetch('/api/groups/create', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: input.value.trim() })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`Group "${data.name}" created!`, "success");
                    input.value = '';
                    if (groupModal) groupModal.classList.add('hidden');
                    currentContext = { type: 'group', id: data._id };
                    await loadVaultData();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast(errData.msg || "Failed to create group", "error");
                }
            }
        };
    }

    if (modalJoinBtn) {
        modalJoinBtn.onclick = async (e) => {
            if (e) e.preventDefault();
            const input = document.getElementById('modal-group-code');
            if (input && input.value.trim()) {
                const res = await fetch('/api/groups/join', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inviteCode: input.value.trim() })
                });
                const data = await res.json();
                if (res.ok) {
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`Joined ${data.group?.name || 'group'}!`, "success");
                    input.value = '';
                    if (groupModal) groupModal.classList.add('hidden');
                    currentContext = { type: 'group', id: data.group?._id || data.group };
                    await loadVaultData();
                } else {
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast(data.msg || "Invalid invite code", "error");
                }
            }
        };
    }

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

        await renderSidebarGroups(userData.groups || []);

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

        // Always populate My Private Vault sidebar tree with private pages
        const privatePages = await SyncEngine.fetchRemotePages(null);
        const treeContainer = document.getElementById('page-tree-root');
        if (treeContainer) {
            PageTree.init(treeContainer, (pageId) => {
                currentContext = { type: 'personal', id: null };
                loadPageIntoEditor({ _id: pageId });
            }, async (parentPageId) => {
                await createNewBlockPage(parentPageId, 'personal', null);
            });
            PageTree.setPages(privatePages);
        }

        if (currentContext.type === 'personal') {
            const existingDash = document.querySelector('.group-dashboard');
            if (existingDash) existingDash.remove();

            if (viewTitle) viewTitle.innerText = "My Private Vault";
            if (codeBadge) codeBadge.classList.add('hidden');
            if (membersDiv) membersDiv.classList.add('hidden');

            renderNotionView(privatePages, 'personal', null);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }

        } else {
            // GROUP MODE
            const groupRes = await fetch(`/api/groups/${currentContext.id}`, { credentials: "include" });
            const groupData = await groupRes.json();

            if (viewTitle) viewTitle.innerText = groupData.name;
            if (codeBadge) {
                codeBadge.innerText = `CODE: ${groupData.inviteCode}`;
                codeBadge.classList.remove('hidden');
            }
            if (membersDiv) {
                membersDiv.innerText = `👥 ${groupData.members.length} Members`;
                membersDiv.classList.remove('hidden');
            }

            // Remove horizontal bar if it exists
            const existingDash = document.querySelector('.group-dashboard');
            if (existingDash) existingDash.remove();

            const groupPages = await SyncEngine.fetchRemotePages(currentContext.id);
            renderNotionView(groupPages, 'group', currentContext.id);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }
        }
    } catch (err) {
        console.error("Load Error", err);
    }
}

// --- GROUP SIDEBAR MENU ---
const GroupMenu = {
    element: null,
    currentGroup: null,

    init: function () {
        if (this.element) return;
        const menu = document.createElement('div');
        menu.className = 've-page-menu hidden';
        menu.id = 've-group-menu';
        document.body.appendChild(menu);
        this.element = menu;

        document.addEventListener('click', (e) => {
            if (this.element && !this.element.contains(e.target) && !e.target.classList.contains('group-more-btn')) {
                this.hide();
            }
        });
    },

    show: function (triggerBtnEl, group, isAdmin) {
        this.init();
        this.currentGroup = group;

        const actionText = isAdmin ? '🗑️ Delete Group' : '🚪 Leave Group';
        const actionName = isAdmin ? 'delete' : 'leave';

        this.element.innerHTML = `
            <div class="ve-menu-header" style="font-size: 0.75rem; color: #666; padding: 4px 8px; font-weight: bold;">Group: ${group.name}</div>
            <div class="ve-menu-group">
                <div class="ve-menu-item" data-action="copycode" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <span>📋 Copy Invite Code</span>
                    <span class="ve-menu-shortcut" style="color:#00e5ff; font-family:monospace; font-size:0.75rem;">${group.inviteCode || ''}</span>
                </div>
            </div>
            <div class="ve-menu-divider"></div>
            <div class="ve-menu-group">
                <div class="ve-menu-item danger" data-action="${actionName}" style="display:flex; align-items:center; justify-content:space-between; color: #ff4444;">
                    <span>${actionText}</span>
                </div>
            </div>
        `;

        const rect = triggerBtnEl.getBoundingClientRect();
        this.element.style.top = `${rect.bottom + 4}px`;
        this.element.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
        this.element.classList.remove('hidden');

        this.element.querySelectorAll('.ve-menu-item').forEach(item => {
            item.onclick = async (e) => {
                const action = item.dataset.action;
                this.hide();
                if (action === 'copycode') {
                    navigator.clipboard.writeText(group.inviteCode);
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast("Invite code copied to clipboard!", "success");
                } else if (action === 'delete') {
                    deleteGroup(group._id);
                } else if (action === 'leave') {
                    leaveGroup(group._id);
                }
            };
        });
    },

    hide: function () {
        if (this.element) this.element.classList.add('hidden');
    }
};

// --- RENDER SIDEBAR LIST ---
async function renderSidebarGroups(groups) {
    const list = document.getElementById('group-list');
    if (!list) return;
    list.innerHTML = "";

    for (const group of groups) {
        const li = document.createElement('li');
        li.className = 'group-item';
        li.style.display = 'flex';
        li.style.flexDirection = 'column';
        li.style.alignItems = 'stretch';
        li.style.padding = '4px 6px';

        const isCurrentGroup = currentContext.type === 'group' && currentContext.id === group._id;

        const myId = globalUserData ? globalUserData._id : null;
        const adminId = (group.admin && group.admin._id) ? group.admin._id : group.admin;
        const isAdmin = (myId === adminId);

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.width = '100%';
        headerDiv.style.cursor = 'pointer';
        if (isCurrentGroup) headerDiv.classList.add('active');

        headerDiv.innerHTML = `
            <span class="group-name-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-grow:1;">👥 ${group.name}</span>
            <div class="group-item-actions" style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                <span class="group-more-btn" title="Group options" style="cursor:pointer; padding:0 4px; color:#888; font-size:0.8rem;">•••</span>
                <span class="group-add-btn" title="Create Page in Group" style="cursor:pointer; padding:0 4px; color:#888; font-size:0.9rem;">+</span>
            </div>
        `;

        headerDiv.onclick = async (e) => {
            if (e.target.classList.contains('group-more-btn')) {
                e.stopPropagation();
                GroupMenu.show(e.target, group, isAdmin);
                return;
            }

            if (e.target.classList.contains('group-add-btn')) {
                e.stopPropagation();
                currentContext = { type: 'group', id: group._id };
                await createNewBlockPage(null, 'group', group._id);
                return;
            }

            currentContext = { type: 'group', id: group._id };
            await loadVaultData();

            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        };

        headerDiv.oncontextmenu = (e) => {
            e.preventDefault();
            GroupMenu.show(headerDiv, group, isAdmin);
        };

        li.appendChild(headerDiv);

        // Fetch & render group page tree using PageTree
        try {
            const groupPages = await SyncEngine.fetchRemotePages(group._id);
            if (groupPages && groupPages.length > 0) {
                const groupTreeContainer = document.createElement('div');
                groupTreeContainer.className = 'group-pages-tree';
                groupTreeContainer.style.paddingLeft = '8px';
                groupTreeContainer.style.marginTop = '4px';

                const activePageId = (currentContext.type === 'group' && currentContext.id === group._id)
                    ? (activeBlockEditorInstance?.pageId)
                    : null;

                await PageTree.renderTree(
                    groupTreeContainer,
                    groupPages,
                    activePageId,
                    (pageId) => {
                        currentContext = { type: 'group', id: group._id };
                        loadPageIntoEditor(pageId);
                    },
                    async (parentPageId) => {
                        await createNewBlockPage(parentPageId, 'group', group._id);
                    }
                );

                li.appendChild(groupTreeContainer);
            }
        } catch (err) {
            console.warn("Failed to load group pages for sidebar:", err);
        }

        list.appendChild(li);
    }
}

// ==========================================
// 4. EDITOR VIEW
// ==========================================
// 4. BLOCK EDITOR WORKSPACE INTEGRATION
// ==========================================
let activeBlockEditorInstance = null;

async function renderNotionView(pages, contextType, contextId) {
    const container = document.getElementById('vault-content');
    if (!container) return;

    container.innerHTML = `
        <div class="editor-container" id="editor-wrapper" style="border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; background: #0d0d0d;">
            <div id="editor-header-bar" style="display:flex; flex-direction:column; gap:8px; padding:12px 20px; border-bottom:1px solid #2a2a2a; background:#121212;">
                <div class="ve-breadcrumb-bar" id="ve-breadcrumb-bar" style="display:none; padding:0; border:none; background:transparent; font-size:0.85rem; color:#888;"></div>
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                    <div style="display:flex; align-items:center; gap:10px; flex-grow: 1;">
                        <span id="page-icon-display" style="font-size:1.5rem; cursor:pointer;" title="Change Icon">📄</span>
                        <input type="text" id="active-page-title-input" value="Select a page..." style="background:none; border:none; color:#fff; font-family:'Courier New', monospace; font-size:1.3rem; font-weight:bold; outline:none; width: 100%;">
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; flex-shrink: 0;">
                        <span id="sync-status-indicator" style="font-size:0.75rem; color:#00ff41; font-family:monospace;">Synced</span>
                        <button id="ve-page-menu-trigger" style="background:none; border:none; color:#888; font-size:1.3rem; cursor:pointer; padding:2px 6px;">⋮</button>
                    </div>
                </div>
            </div>
            <div id="editor-content-area" class="ve-editor-wrapper" style="min-height: 450px; padding: 25px 35px;">
                <div class="editor-placeholder" style="color:#555; text-align:center; margin-top:50px; font-family:monospace;">Select a page from the left sidebar or click "+ New Page" to begin writing...</div>
            </div>
        </div>
    `;

    const breadcrumbContainer = document.getElementById('ve-breadcrumb-bar');
    const searchBtnSidebar = document.getElementById('search-vault-btn-sidebar');

    // Initialize modules
    if (breadcrumbContainer) {
        BreadcrumbBar.init(breadcrumbContainer, (pageId) => {
            if (pageId) {
                loadPageIntoEditor({ _id: pageId });
            }
        });
    }

    SearchEngine.init((pageId) => {
        loadPageIntoEditor({ _id: pageId });
    });

    if (searchBtnSidebar) {
        searchBtnSidebar.onclick = () => SearchEngine.show();
    }

    // Auto-open first page if available
    if (pages && pages.length > 0) {
        loadPageIntoEditor(pages[0]);
    }
}

async function createNewBlockPage(parentPageId = null, contextType = 'personal', contextId = null) {
    const title = await UI.prompt("New Page Title", "e.g., Operation Blackout");
    if (!title) return;

    const key = await getCryptoKey();
    const groupId = contextType === 'group' ? contextId : null;
    const contentToSave = groupId ? title : (key ? await CryptoHelper.encryptText(title, key) : title);

    try {
        const res = await fetch('/api/blocks', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'page',
                pageId: parentPageId || null,
                content: contentToSave,
                group: groupId
            })
        });

        if (res.ok) {
            const newPage = await res.json();
            await BlockStore.saveBlock(newPage);
            currentContext = { type: contextType, id: contextId };
            await loadVaultData();
            await loadPageIntoEditor(newPage);
        }
    } catch (err) {
        console.error("Failed to create page block:", err);
    }
}

// --- BLOCK EDITOR PAGE LOADER ---
async function loadPageIntoEditor(pageParam, decryptedTitlePre) {
    const editorArea = document.getElementById('editor-content-area');
    const titleInput = document.getElementById('active-page-title-input');
    const pageIconBtn = document.getElementById('page-icon-display');
    const menuTriggerBtn = document.getElementById('ve-page-menu-trigger');
    const syncStatus = document.getElementById('sync-status-indicator');

    if (!editorArea || !pageParam) return;

    const pageIdStr = typeof pageParam === 'string' ? pageParam : (pageParam._id || pageParam.id);

    // 1. Fetch full page target first from BlockStore / PageTree / pageParam
    let fullPage = (PageTree.allPages || []).find(p => String(p._id || p.id) === String(pageIdStr));
    if (!fullPage && typeof BlockStore !== 'undefined' && typeof BlockStore.getBlock === 'function') {
        try {
            fullPage = await BlockStore.getBlock(pageIdStr);
        } catch (e) {}
    }
    if (!fullPage || typeof fullPage !== 'object') {
        fullPage = typeof pageParam === 'object' ? pageParam : { _id: pageIdStr, pageId: null };
    }

    const page = fullPage;
    if (!page._id) page._id = pageIdStr;

    // 2. Resolve true group context of this page & update header state
    const targetGroupId = (page && page.group) ? String(page.group) : (typeof pageParam === 'object' && pageParam.group ? pageParam.group : (currentContext.type === 'group' ? currentContext.id : null));

    const viewTitle = document.getElementById('current-view-title');
    const codeBadge = document.getElementById('group-code-display');
    const membersDiv = document.getElementById('members-display');

    if (targetGroupId) {
        currentContext = { type: 'group', id: targetGroupId };
        try {
            const groupRes = await fetch(`/api/groups/${targetGroupId}`, { credentials: "include" });
            if (groupRes.ok) {
                const groupData = await groupRes.json();
                if (viewTitle) viewTitle.innerText = groupData.name;
                if (codeBadge) {
                    codeBadge.innerText = `CODE: ${groupData.inviteCode}`;
                    codeBadge.classList.remove('hidden');
                }
                if (membersDiv) {
                    membersDiv.innerText = `👥 ${groupData.members ? groupData.members.length : 1} Members`;
                    membersDiv.classList.remove('hidden');
                }
            }
        } catch (e) {}
    } else {
        currentContext = { type: 'personal', id: null };
        if (viewTitle) viewTitle.innerText = "My Private Vault";
        if (codeBadge) codeBadge.classList.add('hidden');
        if (membersDiv) membersDiv.classList.add('hidden');
    }

    // 3. Fetch all pages belonging to this context for breadcrumb chain resolution
    let contextPages = await SyncEngine.fetchRemotePages(targetGroupId);
    if (!Array.isArray(contextPages)) contextPages = [];

    // Ensure active page is included in contextPages
    if (!contextPages.some(p => String(p._id || p.id) === String(page._id))) {
        contextPages.push(page);
    }

    const key = await getCryptoKey();
    for (const p of contextPages) {
        if (!p.rawTitle && p.content) {
            try {
                p.rawTitle = key ? await CryptoHelper.decryptText(p.content, key) : p.content;
            } catch (e) {}
        }
    }

    const rootLabel = (page.group || (currentContext && currentContext.type === 'group')) ? "👥 Group Vault" : "🔐 Vault";

    // Clear active class from all sidebar page nodes
    document.querySelectorAll('.ve-tree-node').forEach(el => el.classList.remove('active-page'));
    const activeEl = document.querySelector(`.ve-tree-node[data-id="${page._id}"]`);
    if (activeEl) activeEl.classList.add('active-page');

    // Render Breadcrumbs
    const liveBreadcrumbEl = document.getElementById('ve-breadcrumb-bar');
    if (liveBreadcrumbEl && BreadcrumbBar && page._id) {
        BreadcrumbBar.init(liveBreadcrumbEl, (navPageId) => {
            if (navPageId) loadPageIntoEditor({ _id: navPageId });
        });
        await BreadcrumbBar.renderPath(page._id, contextPages, rootLabel, page);
    }

    const isGroupPage = Boolean(page.group || (currentContext && currentContext.type === 'group'));
    let titleText = decryptedTitlePre || page.rawTitle;
    if (!titleText && page.content) {
        if (isGroupPage) {
            titleText = page.content;
        } else {
            try {
                titleText = key ? await CryptoHelper.decryptText(page.content, key) : page.content;
            } catch (e) {}
        }
    }

    const b64Regex = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;
    if (!titleText || b64Regex.test(titleText)) {
        titleText = 'Untitled Page';
    }

    if (titleInput) {
        titleInput.value = titleText || 'Untitled Page';
        titleInput.oninput = async () => {
            const newTitle = titleInput.value.trim() || 'Untitled Page';
            page.rawTitle = newTitle;
            if (PageTree && !page.group) {
                PageTree.decryptedTitles[String(page._id)] = newTitle;
                PageTree.render();
            }
            if (BreadcrumbBar) {
                BreadcrumbBar.renderPath(page._id, contextPages, rootLabel, page);
            }

            // Schedule autosave of page title
            const isGroupPage = Boolean(page.group || (typeof currentContext !== 'undefined' && currentContext.type === 'group'));
            const encTitle = isGroupPage ? newTitle : (key ? await CryptoHelper.encryptText(newTitle, key) : newTitle);
            page.content = encTitle;
            page.isDirty = true;
            await BlockStore.saveBlock(page);
            SyncEngine.scheduleAutosave(1500);
        };
    }

    if (pageIconBtn) {
        pageIconBtn.innerText = page.properties?.icon || '📄';
        pageIconBtn.onclick = (e) => {
            EmojiPicker.show(pageIconBtn, async (emoji) => {
                pageIconBtn.innerText = emoji;
                page.properties = page.properties || {};
                page.properties.icon = emoji;
                await fetch(`/api/blocks/${page._id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ properties: page.properties })
                });
                loadVaultData();
            });
        };
    }

    // Sync Status Callback
    SyncEngine.onSyncStatusChange = (status, msg) => {
        if (syncStatus) {
            syncStatus.innerText = msg || status;
            syncStatus.style.color = status === 'error' ? '#ff4444' : status === 'saving' ? '#ffff00' : '#888';
        }
    };

    // Bind Page Action Menu
    if (menuTriggerBtn) {
        menuTriggerBtn.onclick = () => {
            PageMenu.show(menuTriggerBtn, page, async (action) => {
                page.properties = page.properties || {};
                if (action === 'rename') {
                    if (titleInput) {
                        titleInput.focus();
                        titleInput.select();
                    }
                } else if (action === 'icon') {
                    if (pageIconBtn) pageIconBtn.click();
                } else if (action === 'favorite') {
                    page.properties.favorite = !page.properties.favorite;
                    await fetch(`/api/blocks/${page._id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ properties: page.properties })
                    });
                    loadVaultData();
                } else if (action === 'duplicate') {
                    const res = await fetch(`/api/blocks/${page._id}/duplicate`, { method: 'POST', credentials: 'include' });
                    if (res.ok) {
                        loadVaultData();
                        if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page duplicated successfully", "success");
                    }
                } else if (action === 'lock') {
                    page.properties.locked = !page.properties.locked;
                    await fetch(`/api/blocks/${page._id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ properties: page.properties })
                    });
                    loadPageIntoEditor(page);
                } else if (action === 'smallText') {
                    page.properties.smallText = !page.properties.smallText;
                    await fetch(`/api/blocks/${page._id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ properties: page.properties })
                    });
                    const wrapper = document.getElementById('editor-wrapper');
                    if (wrapper) wrapper.classList.toggle('ve-small-text', page.properties.smallText);
                } else if (action === 'fullWidth') {
                    page.properties.fullWidth = !page.properties.fullWidth;
                    await fetch(`/api/blocks/${page._id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ properties: page.properties })
                    });
                    const wrapper = document.getElementById('editor-wrapper');
                    if (wrapper) wrapper.classList.toggle('ve-full-width', page.properties.fullWidth);
                } else if (action === 'copylink') {
                    navigator.clipboard.writeText(`${window.location.origin}/app.html#/page/${page._id}`);
                    if (typeof UI !== 'undefined' && UI.toast) UI.toast("Link copied to clipboard", "success");
                } else if (action === 'export') {
                    const pageBlocks = await SyncEngine.fetchRemotePageBlocks(page._id);
                    ExportEngine.exportPageAsMarkdown(page, pageBlocks, activeBlockEditorInstance?.decryptedMap);
                } else if (action === 'trash') {
                    if (await UI.confirm("Move Page to Trash?", "You can restore this page later.")) {
                        await fetch(`/api/blocks/${page._id}/trash`, { method: 'PUT', credentials: 'include' });
                        await BlockStore.deleteBlock(page._id);
                        await loadVaultData();
                        if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page moved to trash", "success");
                    }
                }
            });
        };
    }

    // Initialize BlockEditor Instance
    activeBlockEditorInstance = new BlockEditor(editorArea, page._id, page);
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
    try {
        const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', credentials: "include" });
        if (res.ok) {
            if (typeof UI !== 'undefined' && UI.toast) UI.toast("Left group successfully", "success");
            currentContext = { type: 'personal', id: null };
            await loadVaultData();
        }
    } catch (e) {
        console.error("Leave Group Error:", e);
    }
};

window.deleteGroup = async function (groupId) {
    const yes = await UI.confirm("Delete Group?", "⚠️ WARNING: This wipes all data for everyone.");
    if (!yes) return;
    try {
        const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE', credentials: "include" });
        if (res.ok) {
            if (typeof UI !== 'undefined' && UI.toast) UI.toast("Group deleted permanently", "success");
            currentContext = { type: 'personal', id: null };
            await loadVaultData();
        }
    } catch (e) {
        console.error("Delete Group Error:", e);
    }
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
// 6. VAULT TABS & SIDEBAR LOGIC
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

    // Sidebar card dropdown toggles
    const pVaultToggle = document.getElementById('private-vault-toggle');
    const pVaultCard = document.getElementById('private-vault-card');
    const pVaultBody = document.getElementById('page-tree-root');

    if (pVaultToggle) {
        pVaultToggle.addEventListener('click', (e) => {
            if (e.target.closest('#create-page-btn-sidebar')) return;
            if (pVaultCard) pVaultCard.classList.toggle('collapsed');
            if (pVaultBody) pVaultBody.classList.toggle('collapsed');

            if (currentContext.type !== 'personal') {
                currentContext = { type: 'personal', id: null };
                loadVaultData();
            }
        });
    }

    const sGroupsToggle = document.getElementById('shared-groups-toggle');
    const sGroupsCard = document.getElementById('shared-groups-card');
    const sGroupsBody = document.getElementById('shared-groups-panel');

    if (sGroupsToggle) {
        sGroupsToggle.addEventListener('click', (e) => {
            if (e.target.closest('#open-group-modal-btn')) return;
            if (sGroupsCard) sGroupsCard.classList.toggle('collapsed');
            if (sGroupsBody) sGroupsBody.classList.toggle('collapsed');
        });
    }
});
