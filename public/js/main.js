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
            if (typeof loadAlbumView === 'function') {
                loadAlbumView();
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
                if (typeof loadAlbumView === 'function') {
                    loadAlbumView();
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
// --- UPDATED: Render Notion View ---
function renderNotionView(pages, contextType, contextId) {
    const container = document.getElementById('vault-content');
    if (!container) return;

    // 1. Draw Layout
    container.innerHTML = `
        <div class="vault-split-view">
            <div class="page-sidebar">
                <button id="create-page-btn">+ New Page</button>
                <ul class="page-list" id="page-list-ul"></ul>
            </div>
            <div class="editor-container" id="editor-area">
                <div class="editor-placeholder">
                    Select a page from the left to start writing...
                </div>
            </div>
        </div>
    `;

    // 2. Populate List
    const list = document.getElementById('page-list-ul');
    
    pages.forEach(page => {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerText = page.title || "Untitled Page"; // Fallback title
        li.id = `page-link-${page._id}`; // Assign ID for highlighting

        li.onclick = () => {
            // A. Highlight Active Item
            document.querySelectorAll('.page-item').forEach(el => el.classList.remove('active-page'));
            li.classList.add('active-page');
            
            // B. Load Editor
            loadPageIntoEditor(page);
        };
        list.appendChild(li);
    });

    // 3. Create Button Logic
    document.getElementById('create-page-btn').onclick = async () => {
        const title = prompt("Enter Page Title:");
        if (!title) return; // Allow cancel
        
        const url = contextType === 'personal' ? '/api/pages/personal' : `/api/pages/group/${contextId}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify({ title })
            });

            if (res.ok) {
                // Refresh data to show new page
                loadVaultData(); 
            }
        } catch (err) {
            console.error(err);
        }
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
// --- ALBUM MANAGER ---

// --- 1. RENDER ALBUM LIST (Horizontal Fix) ---
async function loadAlbumView() {
    const container = document.getElementById('photo-grid');
    
    // Determine URL based on context
    let url = '/api/albums?type=personal';
    if (currentContext.type === 'group') {
        url = `/api/albums?type=group&groupId=${currentContext.id}`;
    }

    try {
        const res = await fetch(url, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        const albums = await res.json();

        // Structure: 
        // 1. Controls Div (Create Button)
        // 2. Grid Div (Albums)
        container.innerHTML = `
            <div style="width:100%; margin-bottom: 20px; padding-bottom:10px; border-bottom:1px solid #333;">
                <button onclick="createNewAlbum()" class="btn-blue">
                    + Create New Album
                </button>
            </div>
            
            <div class="album-grid" id="albums-wrapper">
                </div>
        `;

        const wrapper = document.getElementById('albums-wrapper');

        if (albums.length === 0) {
            wrapper.innerHTML = `<p style="color:#666; width:100%;">No albums found. Create one above.</p>`;
        }

        albums.forEach(album => {
            const div = document.createElement('div');
            div.className = 'album-card';
            // Inside the albums.forEach loop in loadAlbumView...

div.innerHTML = `
    <div class="album-folder-icon">📁</div>
    <div class="album-title">${album.name}</div>
    <div style="font-size:0.7rem; color:#888;">${album.photos.length} items</div>
    
    <button onclick="deleteAlbum('${album._id}', event)" class="album-delete-btn">
        &times;
    </button>
`;
            // Click Area
            div.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') openAlbum(album);
            };
            wrapper.appendChild(div);
        });

    } catch (err) {
        console.error("Error loading albums:", err);
    }
}

// --- 2. OPEN ALBUM (Upload Fix) ---
// --- UPDATED OPEN ALBUM (With Hard-Wired Upload) ---
function openAlbum(album) {
    const container = document.getElementById('photo-grid');
    
    // We create a specific unique ID for this album's input
    const inputId = `upload-${album._id}`;

    container.innerHTML = `
        <div class="album-view-controls">
            <button onclick="loadAlbumView()" class="btn-gray">← Back</button>
            
            <h3 style="margin:0; color:#fff;">${album.name}</h3>
            
            <div>
                <button onclick="triggerUpload('${inputId}')" class="btn-green">
                    + Upload Photos
                </button>
                
                <input type="file" id="${inputId}" multiple accept="image/*" style="display:none">
            </div>
        </div>

        <div class="photo-wrapper" id="photos-wrapper"></div>
    `;

    // 3. Attach the Change Listener immediately
    const inputEl = document.getElementById(inputId);
    inputEl.onchange = (e) => {
        console.log("Files selected..."); // Debug log
        uploadPhotos(e, album._id);
    };

    // --- RENDER PHOTOS ---
    const wrapper = document.getElementById('photos-wrapper');
    
    // Apply Flex style to wrapper just in case CSS missed it
    wrapper.style.display = "flex";
    wrapper.style.flexWrap = "wrap";
    wrapper.style.gap = "15px";

    if (album.photos.length === 0) {
        wrapper.innerHTML = `<p style="color:#666; width:100%; text-align:center; padding:20px;">
            No photos yet. Click "Upload Photos" to add some.
        </p>`;
    }

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

// --- GLOBAL HELPER (Add this at the bottom of main.js) ---
// This ensures the button click ALWAYS finds the input
window.triggerUpload = function(inputId) {
    const el = document.getElementById(inputId);
    if(el) {
        el.click();
    } else {
        console.error("Input not found:", inputId);
    }
};

// Create Album
async function createNewAlbum() {
    const name = prompt("Enter Album Name:");
    if (!name) return;

    const payload = {
        name: name,
        type: currentContext.type,
        groupId: currentContext.id
    };

    await fetch('/api/albums', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token') 
        },
        body: JSON.stringify(payload)
    });
    loadAlbumView(); // Refresh
}

// Upload Logic
// --- UPDATED UPLOAD LOGIC ---
async function uploadPhotos(e, albumId) {
    const files = e.target.files;
    if (!files.length) return;

    // 1. Visual Feedback
    const uploadBtn = document.getElementById('trigger-upload');
    if(uploadBtn) {
        uploadBtn.innerText = "Uploading...";
        uploadBtn.disabled = true;
        uploadBtn.style.background = "#555";
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
    }

    try {
        // 2. Send to Server
        const res = await fetch(`/api/albums/${albumId}/upload`, {
            method: 'POST',
            headers: { 'x-auth-token': localStorage.getItem('token') },
            body: formData
        });

        if (res.ok) {
            // 3. SUCCESS! Fetch the updated album to show new photos immediately
            const updatedAlbum = await res.json();
            
            // Refresh the view with new data
            openAlbum(updatedAlbum); 
            
            console.log("Upload Success");
        } else {
            alert("Upload failed.");
            // Reset button if failed
            if(uploadBtn) {
                uploadBtn.innerText = "+ Upload Photos";
                uploadBtn.disabled = false;
                uploadBtn.style.background = "#28a745";
            }
        }
    } catch (err) {
        console.error("Upload Error:", err);
        alert("Error uploading photos");
    }
}
// Lightbox Logic
function openLightbox(src) {
    const box = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const dl = document.getElementById('lb-download');

    img.src = src;
    dl.href = src; // Direct link allows download
    box.classList.remove('hidden');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
}

// Delete Logic
async function deleteAlbum(id, e) {
    e.stopPropagation(); // Stop click from opening album
    if(!confirm("Delete this album and all photos inside?")) return;

    await fetch(`/api/albums/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    loadAlbumView();
}

// public/js/main.js

async function deletePhoto(albumId, filename) {
    if(!confirm("Delete this photo?")) return;

    try {
        const res = await fetch(`/api/albums/${albumId}/photo/${filename}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': localStorage.getItem('token') }
        });

        if (res.ok) {
            // 1. Get the updated album data from the server response
            const updatedAlbum = await res.json();
            
            // 2. STAY in the album: Re-render the current album view
            openAlbum(updatedAlbum); 
        }
    } catch (err) {
        console.error(err);
        alert("Error deleting photo");
    }
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
// --- UPDATED EDITOR (With Delete Button) ---
// public/js/main.js

function loadPageIntoEditor(page) {
    const editorArea = document.getElementById('editor-area');
    
    // 1. Inject HTML (Title, Save, DELETE)
    editorArea.innerHTML = `
        <div class="editor-header" style="display: flex; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 10px;">
            <input type="text" id="page-title-input" value="${page.title}" 
                   style="flex-grow: 1; font-size: 1.5rem; background: transparent; border: none; color: white; font-weight: bold;">
            
            <button id="save-page-btn" class="btn-blue">Save</button>
            <button id="delete-page-btn" class="btn-red" style="background: #dc3545; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">Delete</button>
        </div>
        
        <textarea id="page-content-input" placeholder="Start typing..." 
                  style="width: 100%; height: calc(100% - 60px); background: transparent; border: none; color: #ccc; resize: none; font-family: sans-serif; line-height: 1.6; font-size: 1rem; outline: none;">${page.content || ''}</textarea>
    `;

    // 2. SAVE LOGIC (The Fix)
    const saveBtn = document.getElementById('save-page-btn');
    saveBtn.onclick = async () => {
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
                
                // --- THE FIX IS HERE ---
                // Instead of reloading everything, we just find the sidebar item and update the text.
                const sidebarItem = document.getElementById(`page-link-${page._id}`);
                if (sidebarItem) {
                    sidebarItem.innerText = titleVal || "Untitled Page";
                }
                
                // Reset button after 1.5 seconds
                setTimeout(() => { 
                    saveBtn.innerText = originalText; 
                    saveBtn.disabled = false;
                }, 1500);

            } else {
                throw new Error("Save failed");
            }
            
        } catch (err) {
            console.error(err);
            saveBtn.innerText = "Error";
            saveBtn.disabled = false;
        }
    };

    // 3. DELETE LOGIC (Kept exactly the same)
    const deleteBtn = document.getElementById('delete-page-btn');
    deleteBtn.onclick = async () => {
        if (!confirm("Are you sure you want to delete this page? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/pages/${page._id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });

            if (res.ok) {
                editorArea.innerHTML = `<div class="editor-placeholder">Select a page...</div>`;
                // For DELETE, we DO want to reload the list to remove the item
                loadVaultData(); 
            } else {
                alert("Failed to delete page");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting page");
        }
    };
}