// public/js/main.js

// State Variables
let userCredentials = { email: '', password: '' };
let currentPattern = []; // Stores the user's clicks [A, C, B...]

// DOM Elements for Loading Screen & CAPTCHA VERIFICATION
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const captchaScreen = document.getElementById('captcha-screen');
const robotCheck = document.getElementById('robot-check');

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const quizScreen = document.getElementById('quiz-overlay');
const vaultScreen = document.getElementById('vault-screen');
const loginForm = document.getElementById('login-form');
const questionText = document.getElementById('question-text');

// STATE MANAGEMENT
let currentContext = { type: 'personal', id: null }; // Default to Personal

// NEW DOM ELEMENTS (Sidebar & Actions)
const navPersonal = document.getElementById('personal-vault-btn');
const groupsListEl = document.getElementById('groups-list');
const currentViewTitle = document.getElementById('current-view-title');
const groupCodeDisplay = document.getElementById('group-code-display');
const noteArea = document.getElementById('notes-area');
// Ensure we are targeting the list, NOT the whole sidebar
const list = document.getElementById('group-list');

// INPUTS
const newGroupNameInput = document.getElementById('new-group-name');
const joinGroupCodeInput = document.getElementById('join-group-code');

// --- EVENT 1: LOGIN FORM SUBMIT ---
// --- EVENT 1: LOGIN FORM SUBMIT (UPDATED) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // 1. Capture credentials
    userCredentials.email = document.getElementById('email').value;
    userCredentials.password = document.getElementById('password').value;

    // 2. Hide Login -> Show Loading Screen
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('active');
    
    // Reset text just in case
    loadingText.innerText = "Verifying Credentials...";
    loadingText.style.color = "#00ff00"; // Green

    // 3. THE ILLUSION: Wait 2 seconds (2000ms)
    setTimeout(() => {
        
        // 4. Change the narrative: "Something is wrong"
        loadingText.innerText = "Unusual Traffic Detected.";
        loadingText.style.color = "#ff3333"; // Red warning color
        
        // 5. Wait 1.5 more seconds to let them read the warning
        setTimeout(() => {
            
            // 6. Hide Loading -> Show CAPTCHA
            loadingScreen.classList.remove('active');
            loadingScreen.classList.add('hidden');

            // Show the Captcha
            captchaScreen.classList.remove('hidden');
            captchaScreen.classList.add('active');

        }, 1500); // Wait 1.5 seconds

    }, 2000); // Wait 2 seconds
});

// --- EVENT: CAPTCHA CHECKED ---
robotCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
        // Wait a tiny bit for the visual "check" to appear
        setTimeout(() => {
            // Hide Captcha -> Show Quiz
            captchaScreen.classList.remove('active');
            captchaScreen.classList.add('hidden');

            quizScreen.classList.remove('hidden');
            quizScreen.classList.add('active');

            // NOW we load the first question
            questionText.innerText = Cipher.getRandomQuestion();
        }, 500); // 0.5 second delay feels realistic
    }
});

// --- EVENT 2: QUIZ BUTTON CLICKS ---
document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 1. Record the click (A, B, C, or D)
        const val = e.target.getAttribute('data-val');
        currentPattern.push(val);

        // Visual Feedback (Update progress bar)
        document.getElementById('progress-fill').style.width = `${currentPattern.length * 20}%`;

        // 2. Check if we have 5 clicks
        if (currentPattern.length === 5) {
            // STOP! Send data to backend
            attemptLogin();
        } else {
            // Load next random question
            questionText.innerText = Cipher.getRandomQuestion();
        }
    });
});

// --- FUNCTION: TALK TO BACKEND ---
async function attemptLogin() {
    questionText.innerText = "Verifying Pattern...";

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userCredentials.email,
                password: userCredentials.password,
                pattern: currentPattern // The secret array
            })
        });

        const data = await res.json();

        if (res.ok) {
            // SUCCESS: Unlock Vault
            localStorage.setItem('token', data.token); // Save wristband
            
            // Switch Screens
            quizScreen.classList.remove('active');
            quizScreen.classList.add('hidden');
            vaultScreen.classList.remove('hidden');
            vaultScreen.classList.add('active');

            // Load Notes
            loadVaultData();

        } else {
            // FAIL: Wrong pattern or password
            alert("Game Over!");
            location.reload(); // Reset everything
        }

    } catch (err) {
        console.error(err);
        alert("Server Error");
    }
}

// --- MAIN LOADER ---
// ==========================================
// 🔄 MAIN CONTROLLER: LOAD VAULT DATA
// ==========================================
async function loadVaultData() {
    const token = localStorage.getItem('token');
    
    // 1. Auth Check
    if (!token) {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('vault-section').classList.add('hidden');
        return;
    }

    try {
        // 2. Fetch User & Sidebar Data
        // (We use /api/auth because it returns the user + populated groups)
        const res = await fetch('/api/auth', { headers: { 'x-auth-token': token } });
        if (!res.ok) throw new Error("Failed to fetch user data");
        
        const userData = await res.json();
        
        // Switch to Vault UI
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('vault-section').classList.remove('hidden');
        
        // Render the Sidebar List
        renderSidebar(userData.groups || []);

        // 3. DECIDE VIEW BASED ON CONTEXT
        if (currentContext.type === 'personal') {
            // ===================================
            // 👤 PERSONAL VAULT (Private Pages)
            // ===================================
            document.getElementById('current-view-title').innerText = "My Private Vault";
            
            // UI Cleanup: Hide all Group-specific elements
            ['group-code-display', 'danger-btn', 'members-display'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            // A. Fetch Personal Pages
            const pageRes = await fetch('/api/pages/personal', { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();
            
            // B. Render Notion View
            renderNotionView(pages, 'personal', null);


        } else if (currentContext.type === 'group') {
            // ===================================
            // 👥 GROUP VAULT (Shared Pages)
            // ===================================
            const groupId = currentContext.id;
            
            // A. Fetch Group Metadata
            const groupRes = await fetch(`/api/groups/${groupId}`, { headers: { 'x-auth-token': token } });
            
            if (groupRes.ok) {
                const groupData = await groupRes.json();
                
                // Update Header Info
                document.getElementById('current-view-title').innerText = groupData.name;
                
                // Show "Join Code"
                const codeBadge = document.getElementById('group-code-display');
                if (codeBadge) {
                    codeBadge.innerText = `Code: ${groupData.inviteCode}`;
                    codeBadge.classList.remove('hidden');
                }

                // Show "Members" (Simple Count or List)
                const membersDiv = document.getElementById('members-display');
                if (membersDiv) {
                    membersDiv.classList.remove('hidden');
                    membersDiv.innerHTML = `<span style="font-size:0.8rem; color:#888;">${groupData.members.length} Members</span>`;
                }

                // --- DANGER BUTTON LOGIC (Leave/Delete) ---
                const dangerBtn = document.getElementById('danger-btn');
                if (dangerBtn) {
                    dangerBtn.classList.remove('hidden');
                    // Clone to strip old listeners
                    const newBtn = dangerBtn.cloneNode(true);
                    dangerBtn.parentNode.replaceChild(newBtn, dangerBtn);
                    
                    // Check Admin Status
                    const myId = userData._id; 
                    const adminId = groupData.admin; // Assuming admin returns ID string

                    if (myId === adminId) {
                        // Admin Mode
                        newBtn.innerText = "Delete Group 🗑️";
                        newBtn.classList.add('danger-btn'); // Style as red
                        newBtn.onclick = async () => {
                            if(!confirm("Delete this group permanently?")) return;
                            await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
                            location.reload(); // Hard reload is safest here
                        };
                    } else {
                        // Member Mode
                        newBtn.innerText = "Leave Group 🏃";
                        newBtn.classList.remove('danger-btn'); // Optional style change
                        newBtn.onclick = async () => {
                            if(!confirm("Leave this group?")) return;
                            await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', headers: { 'x-auth-token': token } });
                            location.reload();
                        };
                    }
                }

                // B. Fetch Group Pages
                const pageRes = await fetch(`/api/pages/group/${groupId}`, { headers: { 'x-auth-token': token } });
                const pages = await pageRes.json();

                // C. Render Notion View (Group Context)
                renderNotionView(pages, 'group', groupId);
            }
        }

    } catch (err) {
        console.error("Load Error:", err);
    }
}

// ==========================================
// 🔄 MAIN CONTROLLER: LOAD VAULT DATA
// ==========================================
async function loadVaultData() {
    const token = localStorage.getItem('token');
    
    // 1. Auth Check
    if (!token) {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('vault-screen').classList.add('hidden');
        return;
    }

    try {
        // 2. Fetch User & Sidebar Data
        const res = await fetch('/api/auth', { headers: { 'x-auth-token': token } });
        if (!res.ok) throw new Error("Failed to fetch user data");
        
        const userData = await res.json();
        
        // Switch to Vault UI
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('vault-screen').classList.remove('hidden');
        renderSidebar(userData.groups || []);

        // 3. DECIDE VIEW BASED ON CONTEXT
        const photoCard = document.querySelector('.card'); // The Photo Section wrapper
        
        if (currentContext.type === 'personal') {
            // ===================================
            // 👤 PERSONAL VAULT
            // ===================================
            document.getElementById('current-view-title').innerText = "My Private Vault";
            
            // HIDE Group specific items
            ['group-code-display', 'danger-btn', 'members-display'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            // A. Fetch & Render Pages
            const pageRes = await fetch('/api/pages/personal', { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();
            renderNotionView(pages, 'personal', null);

            // B. Restore Photos (Use personal_photos)
            if (photoCard) photoCard.style.display = 'block'; // Make visible
            // Ensure renderPhotos exists, if not we skip
            if (typeof renderPhotos === 'function') {
                renderPhotos(userData.personal_photos || []);
            }

        } else if (currentContext.type === 'group') {
            // ===================================
            // 👥 GROUP VAULT
            // ===================================
            const groupId = currentContext.id;
            const groupRes = await fetch(`/api/groups/${groupId}`, { headers: { 'x-auth-token': token } });
            
            if (groupRes.ok) {
                const groupData = await groupRes.json();
                document.getElementById('current-view-title').innerText = groupData.name;
                
                // --- 1. GROUP INFO (Code & Members) ---
                const codeBadge = document.getElementById('group-code-display');
                if (codeBadge) {
                    codeBadge.innerText = `Code: ${groupData.inviteCode}`;
                    codeBadge.classList.remove('hidden'); // SHOW IT
                }

                const membersDiv = document.getElementById('members-display');
                if (membersDiv) {
                    membersDiv.classList.remove('hidden');
                    membersDiv.innerHTML = `<span style="font-size:0.8rem; color:#888;">${groupData.members.length} Members</span>`;
                }

                // --- 2. BUTTON LOGIC (Leave vs Delete) ---
                const dangerBtn = document.getElementById('danger-btn');
                if (dangerBtn) {
                    dangerBtn.classList.remove('hidden'); // SHOW IT
                    
                    // Clone to strip old listeners
                    const newBtn = dangerBtn.cloneNode(true);
                    dangerBtn.parentNode.replaceChild(newBtn, dangerBtn);
                    
                    // Check Admin Status
                    const myId = userData._id; 
                    // Handle admin if it's an object or string
                    const adminId = (groupData.admin && groupData.admin._id) ? groupData.admin._id : groupData.admin;

                    if (myId === adminId) {
                        // Admin Mode
                        newBtn.innerText = "Delete Group 🗑️";
                        newBtn.classList.add('danger-btn'); 
                        newBtn.onclick = async () => {
                            if(!confirm("Delete this group permanently?")) return;
                            await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
                            currentContext = { type: 'personal', id: null };
                            loadVaultData();
                        };
                    } else {
                        // Member Mode
                        newBtn.innerText = "Leave Group 🏃";
                        newBtn.classList.remove('danger-btn');
                        newBtn.onclick = async () => {
                            if(!confirm("Leave this group?")) return;
                            await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', headers: { 'x-auth-token': token } });
                            currentContext = { type: 'personal', id: null };
                            loadVaultData();
                        };
                    }
                }

                // --- 3. PAGES ---
                const pageRes = await fetch(`/api/pages/group/${groupId}`, { headers: { 'x-auth-token': token } });
                const pages = await pageRes.json();
                renderNotionView(pages, 'group', groupId);

                // --- 4. PHOTOS ---
                if (photoCard) photoCard.style.display = 'block'; // Make visible
                if (typeof renderPhotos === 'function') {
                    renderPhotos(groupData.shared_photos || []);
                }
            }
        }

    } catch (err) {
        console.error("Load Error:", err);
    }
}

// 🛡️ SAFETY WRAPPER: Wait for HTML to load
document.addEventListener('DOMContentLoaded', () => {

// --- ACTION: CREATE GROUP ---
document.getElementById('create-group-btn').addEventListener('click', async () => {
    try{
        
    const name = newGroupNameInput.value;
    console.log("1. Button Clicked. Name:", name); // LOG 1
    if (!name) return alert("Enter a name!");

    const token = localStorage.getItem('token');

    const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token
        },
        body: JSON.stringify({ name: name })
    });

    console.log("2. Server Responded. Status:", res.status);

    if (res.ok) {
        const data = await res.json();
        console.log("3. Group Created:", data); // LOG 3

        newGroupNameInput.value = ""; // Clear input
        console.log("4. Refreshing Sidebar..."); // LOG 4

        loadVaultData(); // Refresh sidebar to show new group
    } else {
        alert("Failed to create group");
    }}catch (err) {
        console.error("Network Error:", err);
    }
});

// --- ACTION: JOIN GROUP ---
document.getElementById('join-group-btn').addEventListener('click', async () => {
    const code = joinGroupCodeInput.value;
    if (!code) return alert("Enter a code!");

    const token = localStorage.getItem('token');

    const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token
        },
        body: JSON.stringify({ inviteCode: code })
    });

    const data = await res.json();

    if (res.ok) {
        joinGroupCodeInput.value = "";
        alert(`Joined ${data.group.name}!`);
        loadVaultData(); // Refresh sidebar
    } else {
        alert(data.msg); // "Invalid Code" etc.
    }
});


})

// --- RENDERER: Notion Split View ---
function renderNotionView(pages, contextType, contextId) {
    const container = document.getElementById('vault-content');
    if (!container) return; // Safety check

    // 1. Draw the Layout
    container.innerHTML = `
        <div class="vault-split-view">
            <div class="page-sidebar">
                <button id="create-page-btn" class="small-btn" style="width:100%">+ New Page</button>
                <ul class="page-list" id="page-list-ul"></ul>
            </div>
            <div class="editor-container" id="editor-area">
                <div class="editor-placeholder">Select a page to start writing...</div>
            </div>
        </div>
    `;

    // 2. Populate List
    const list = document.getElementById('page-list-ul');
    pages.forEach(page => {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerText = page.title;
        li.onclick = () => loadPageIntoEditor(page);
        list.appendChild(li);
    });

    // 3. Create Button Logic
    document.getElementById('create-page-btn').onclick = async () => {
        const title = prompt("Page Title:");
        if (!title) return;
        
        // Decide URL based on Context (Personal vs Group)
        const url = contextType === 'personal' ? '/api/pages/personal' : `/api/pages/group/${contextId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
            body: JSON.stringify({ title })
        });

        if (res.ok) loadVaultData(); // Refresh list
    };
}


// --- HELPER: Get User ID from Token ---
function getUserIdFromToken(tokenString) {
    if (!tokenString) return null;
    try {
        const payload = JSON.parse(atob(tokenString.split('.')[1]));
        // Handle different token structures
        if (payload.user && payload.user.id) return payload.user.id;
        if (payload.id) return payload.id;
        return null;
    } catch (e) {
        console.error("Token Error:", e);
        return null;
    }
}

// --- FUNCTION: RENDER PHOTOS ---
// We call this inside 'loadVaultData()'
function renderPhotos(photosArray) {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = ''; // Clear current grid

    // Add the "Upload New" Button as the first item
    const uploadDiv = document.createElement('div');
    uploadDiv.className = 'photo-card upload-card';
    uploadDiv.innerHTML = `
        <label for="file-input" style="cursor: pointer;">
            <span>+ Add Photo</span>
        </label>
        <input type="file" id="file-input" accept="image/*" style="display: none;">
    `;
    grid.appendChild(uploadDiv);

    // Add the Listeners for the new input
    document.getElementById('file-input').addEventListener('change', handleFileUpload);

    // Loop through photos and display them
    photosArray.forEach(filename => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'photo-card';
        // We point to the static folder 'uploads/'
        imgDiv.innerHTML = `<img src="/uploads/${filename}" alt="Secret Memory">`;
        grid.appendChild(imgDiv);
    });
}

// --- FUNCTION: HANDLE FILE UPLOAD ---
// --- SMART UPLOAD FUNCTION ---
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    const token = localStorage.getItem('token');
    
    // DECISION TIME
    let url = '';
    if (currentContext.type === 'personal') {
        url = '/api/vault/upload';
    } else {
        url = `/api/groups/${currentContext.id}/photos`;
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: formData
        });

        if (res.ok) {
            loadVaultData(); // Refresh the grid
        } else {
            alert("Upload Failed");
        }
    } catch (err) {
        console.error(err);
        alert("Error uploading");
    }
}

// --- RENDER SIDEBAR ---
// --- RENDER SIDEBAR ---
function renderSidebar(groups) {
    console.log("Rendering Sidebar with groups:", groups); // Debug Log

    const list = document.getElementById('group-list');
    
    // SAFETY CHECK: Does the list exist?
    if (!list) {
        console.error("🚨 CRITICAL ERROR: HTML element <ul id='group-list'> is missing!");
        return; // Stop the crash here.
    }

    list.innerHTML = ""; // Clear list

    groups.forEach(group => {
        const li = document.createElement('li');
        li.innerText = group.name;
        
        // Highlight active
        if (currentContext.type === 'group' && currentContext.id === group._id) {
            li.classList.add('active');
        }

        // Click Listener
        li.addEventListener('click', () => {
            currentContext = { type: 'group', id: group._id };
            loadVaultData();
            
            // Highlight update
            document.querySelectorAll('.nav-list li, .nav-static li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
        });

        list.appendChild(li);
    });
}
// Helper to toggle the "Active" blue class
function updateActiveNav() {
    // Reset Personal Button
    if (currentContext.type === 'personal') {
        navPersonal.classList.add('active');
    } else {
        navPersonal.classList.remove('active');
    }
}

// 2. Safety Check (Prevent the crash)
if (navPersonal) {
    navPersonal.addEventListener('click', () => {
        console.log("Switching to Personal Vault..."); // Debug log
        currentContext = { type: 'personal', id: null };
        
        // Visual Update
        document.querySelectorAll('.nav-list li, .nav-static li').forEach(el => el.classList.remove('active'));
        navPersonal.classList.add('active');

        loadVaultData();
    });
} else {
    console.error("❌ Error: Could not find element with ID 'personal-vault-btn'");
}



// --- HELPER: Load Editor ---
// ==========================================
// 📝 EDITOR LOGIC (Handles Display & Saving)
// ==========================================
function loadPageIntoEditor(page) {
    const editorArea = document.getElementById('editor-area');
    
    // 1. Inject the HTML (This creates the button)
    editorArea.innerHTML = `
        <div class="editor-header">
            <input type="text" id="page-title-input" value="${page.title}">
            <button id="save-page-btn">Save Changes</button>
        </div>
        <textarea id="page-content-input" placeholder="Start typing...">${page.content || ''}</textarea>
    `;

    // 2. NOW we can find the button (because we just created it above)
    const saveBtn = document.getElementById('save-page-btn');

    if (saveBtn) {
        saveBtn.onclick = async () => {
            // Get current values
            const titleVal = document.getElementById('page-title-input').value;
            const contentVal = document.getElementById('page-content-input').value;

            // Visual Feedback
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "Saving...";
            saveBtn.disabled = true;

            try {
                const res = await fetch(`/api/pages/${page._id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-auth-token': localStorage.getItem('token') 
                    },
                    body: JSON.stringify({ title: titleVal, content: contentVal })
                });

                if (res.ok) {
                    saveBtn.innerText = "Saved! ✅";
                    setTimeout(() => {
                        saveBtn.innerText = originalText;
                        saveBtn.disabled = false;
                    }, 1500);
                    
                    // Optional: Refresh list silently to update titles
                    // loadVaultData(); 
                } else {
                    throw new Error("Save failed");
                }
            } catch (err) {
                console.error(err);
                alert("Error saving page");
                saveBtn.innerText = "Retry";
                saveBtn.disabled = false;
            }
        };
    } else {
        console.error("❌ Error: Save button could not be found immediately after creation.");
    }
}