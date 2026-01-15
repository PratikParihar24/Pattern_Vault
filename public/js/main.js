// public/js/main.js

// ==========================================
// 1. STATE & VARIABLES
// ==========================================
let userCredentials = { email: '', password: '' };
let currentPattern = []; 
let currentContext = { type: 'personal', id: null }; 

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const captchaScreen = document.getElementById('captcha-screen');
const robotCheck = document.getElementById('robot-check');
const loginScreen = document.querySelector('.login-box').parentElement; 
const quizScreen = document.getElementById('quiz-overlay');
const vaultScreen = document.getElementById('vault-screen');
const loginForm = document.getElementById('login-form');
const questionText = document.getElementById('question-text');
const quizIntro = document.getElementById('quiz-intro');
const quizGame = document.getElementById('quiz-game');
const startQuizBtn = document.getElementById('start-quiz-btn');

// ==========================================
// 2. AUTHENTICATION FLOW (The Disguise)
// ==========================================

// --- EVENT: LOGIN FORM SUBMIT ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    userCredentials.email = document.getElementById('email').value;
    userCredentials.password = document.getElementById('password').value;

    // Switch to Loading Screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('active');
    
    loadingText.innerText = "Verifying Credentials...";
    loadingText.style.color = "#fff";

    // THE ILLUSION
    setTimeout(() => {
        loadingText.innerText = "Unusual Traffic Detected.";
        loadingText.style.color = "#ff4444"; 
        
        setTimeout(() => {
            loadingScreen.classList.remove('active');
            loadingScreen.classList.add('hidden');
            captchaScreen.classList.remove('hidden');
            captchaScreen.classList.add('active');
        }, 1500);
    }, 2000);
});

// --- EVENT: CAPTCHA CHECKED ---
robotCheck.addEventListener('change', (e) => {
    if (e.target.checked) {
        setTimeout(() => {
            captchaScreen.classList.remove('active');
            captchaScreen.classList.add('hidden');

            // Show Quiz Intro
            quizScreen.classList.remove('hidden');
            quizScreen.classList.add('active');
            quizIntro.classList.remove('hidden');
            quizGame.classList.add('hidden');
        }, 500);
    }
});

// --- EVENT: START QUIZ ---
startQuizBtn.addEventListener('click', () => {
    quizIntro.classList.add('hidden');
    quizGame.classList.remove('hidden');
    if (typeof Cipher !== 'undefined') {
        questionText.innerText = Cipher.getRandomQuestion();
    }
});

// --- EVENT: QUIZ ANSWERS ---
document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const val = e.target.getAttribute('data-val');
        currentPattern.push(val);

        const progress = document.getElementById('progress-fill');
        if(progress) progress.style.width = `${currentPattern.length * 20}%`;

        if (currentPattern.length === 5) {
            attemptLogin();
        } else {
            if (typeof Cipher !== 'undefined') {
                questionText.innerText = Cipher.getRandomQuestion();
            }
        }
    });
});

// --- FUNCTION: REAL LOGIN ATTEMPT ---
async function attemptLogin() {
    questionText.innerText = "Verifying Pattern...";

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userCredentials.email,
                password: userCredentials.password,
                pattern: currentPattern
            })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

            vaultScreen.classList.remove('hidden');
            vaultScreen.classList.add('active'); 

            loadVaultData();
        } else {
            alert("Game Over! (Wrong Credentials)");
            location.reload();
        }
    } catch (err) {
        console.error(err);
        alert("Server Error");
    }
}

// ==========================================
// 3. VAULT LOGIC & MOBILE MENU
// ==========================================

// --- MOBILE MENU LOGIC (The Fix) ---
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

            // Close Menu on Mobile
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }
    
    // Setup Other Buttons
    const createGroupBtn = document.getElementById('create-group-btn');
    if(createGroupBtn) createGroupBtn.addEventListener('click', handleCreateGroup);
    
    const joinGroupBtn = document.getElementById('join-group-btn');
    if(joinGroupBtn) joinGroupBtn.addEventListener('click', handleJoinGroup);
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        location.reload();
    });
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
        if(codeBadge) codeBadge.classList.add('hidden');
        if(dangerBtn) dangerBtn.classList.add('hidden');
        if(membersDiv) membersDiv.classList.add('hidden');

        if (currentContext.type === 'personal') {
            viewTitle.innerText = "My Private Vault";
            
            const pageRes = await fetch('/api/pages/personal', { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();
            renderNotionView(pages, 'personal', null);

            if (photoCard) {
                photoCard.style.display = 'block';
                loadAlbumView();
            }

        } else {
            // ===================================
            // 👥 GROUP MODE (Updated Dashboard)
            // ===================================
            const groupRes = await fetch(`/api/groups/${currentContext.id}`, { headers: { 'x-auth-token': token } });
            const groupData = await groupRes.json();

            // 1. Set Sticky Title
            viewTitle.innerText = groupData.name;

            // 2. Prepare Action Button Logic (Admin vs Member)
            const myId = userData._id;
            const adminId = (groupData.admin && groupData.admin._id) ? groupData.admin._id : groupData.admin;
            const isAdmin = (myId === adminId);
            
            const btnText = isAdmin ? "Delete Group" : "Leave Group";
            const btnClass = isAdmin ? "btn-danger" : "btn-warning";
            const btnAction = isAdmin 
                ? `deleteGroup('${currentContext.id}')` 
                : `leaveGroup('${currentContext.id}')`;

            // 3. INJECT THE DASHBOARD (The Fix)
            // We put this right before the content starts
            const container = document.getElementById('vault-content');
            
            // We temporarily store the layout for the Split View
            // This allows us to put the Dashboard ABOVE the split view
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

            // 4. Render Pages
            const pageRes = await fetch(`/api/pages/group/${currentContext.id}`, { headers: { 'x-auth-token': token } });
            const pages = await pageRes.json();
            
            // Render View + Prepend Dashboard
            renderNotionView(pages, 'group', currentContext.id);
            
            // 🚨 INJECTION TRICK: Insert Dashboard at the top of container
            container.insertAdjacentHTML('afterbegin', dashboardHTML);

            // 5. Load Photos
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
            if(window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('active');
                if(overlay) overlay.classList.remove('active');
            }
        });
        list.appendChild(li);
    });
}

// ==========================================
// 4. EDITOR VIEW (Mobile Safe)
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

    // Mobile Back Button Logic
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
        const title = prompt("Enter Page Title:");
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

// --- UPDATED EDITOR (Minimalist Toolbar) ---
function loadPageIntoEditor(page) {
    const editorArea = document.getElementById('editor-content-area');
    
    // 1. Inject HTML (Clean Text Toolbar)
  // 1. Inject HTML (With Clean Separator)
    editorArea.innerHTML = `
        <div class="editor-header">
            <input type="text" id="page-title-input" value="${page.title}" placeholder="Untitled Page">
            
            <div class="editor-tools">
                <button id="save-page-btn" class="text-btn">Save</button>
                
                <div class="tool-separator"></div>
                
                <button id="delete-page-btn" class="text-btn danger">Delete</button>
            </div>
        </div>
        
        <textarea id="page-content-input" placeholder="Start typing...">${page.content || ''}</textarea>
    `;

    // 2. SAVE LOGIC
    const saveBtn = document.getElementById('save-page-btn');
    saveBtn.onclick = async () => {
        const titleVal = document.getElementById('page-title-input').value;
        const contentVal = document.getElementById('page-content-input').value;
        
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Saving...";
        
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
                saveBtn.innerText = "Saved";
                saveBtn.style.color = "#00ff00"; // Hacker Green success flash
                
                // Update Sidebar Text
                const sidebarItem = document.getElementById(`page-link-${page._id}`);
                if (sidebarItem) sidebarItem.innerText = titleVal || "Untitled Page";
                
                setTimeout(() => { 
                    saveBtn.innerText = originalText; 
                    saveBtn.style.color = ""; // Reset color
                }, 1500);
            }
        } catch (err) { saveBtn.innerText = "Error"; }
    };

    // 3. DELETE LOGIC
    const deleteBtn = document.getElementById('delete-page-btn');
    deleteBtn.onclick = async () => {
        if (!confirm("Permanently delete this page?")) return;
        try {
            const res = await fetch(`/api/pages/${page._id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.ok) {
                const splitView = document.getElementById('split-view-container');
                if(splitView) splitView.classList.remove('show-editor');
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
    if(!name) return alert("Enter Name");
    
    const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ name })
    });
    if(res.ok) {
        document.getElementById('new-group-name').value = "";
        loadVaultData();
    }
}

async function handleJoinGroup() {
    const code = document.getElementById('join-group-code').value;
    if(!code) return alert("Enter Code");

    const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ inviteCode: code })
    });
    const data = await res.json();
    if(res.ok) {
        document.getElementById('join-group-code').value = "";
        alert(`Joined ${data.group.name}!`);
        loadVaultData();
    } else {
        alert(data.msg);
    }
}

// --- UPDATED ALBUM VIEW (Integrated Header) ---
// --- UPDATED ALBUM VIEW (Secure Gallery Only) ---
async function loadAlbumView() {
    const container = document.getElementById('photo-grid');
    if(!container) return; 

    let url = '/api/albums?type=personal';
    if (currentContext.type === 'group') {
        url = `/api/albums?type=group&groupId=${currentContext.id}`;
    }

    try {
        const res = await fetch(url, { headers: { 'x-auth-token': localStorage.getItem('token') } });
        const albums = await res.json();

        // 1. Inject Header: "Secure Gallery" + Button
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
window.triggerUpload = function(inputId) { document.getElementById(inputId).click(); };
window.createNewAlbum = async function() {
    const name = prompt("Album Name:");
    if (!name) return;
    await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ name, type: currentContext.type, groupId: currentContext.id })
    });
    loadAlbumView();
};
window.uploadPhotos = async function(e, albumId) {
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
window.deleteAlbum = async function(id, e) {
    e.stopPropagation();
    if(!confirm("Delete Album?")) return;
    await fetch(`/api/albums/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    loadAlbumView();
};
window.deletePhoto = async function(albumId, filename) {
    if(!confirm("Delete Photo?")) return;
    const res = await fetch(`/api/albums/${albumId}/photo/${filename}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    if(res.ok) {
        const updated = await res.json();
        openAlbum(updated);
    }
};
window.openLightbox = function(src) {
    const box = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    box.classList.remove('hidden');
};
window.closeLightbox = function() {
    document.getElementById('lightbox').classList.add('hidden');
};

// --- GLOBAL GROUP ACTIONS ---
window.leaveGroup = async function(groupId) {
    if(!confirm("Are you sure you want to leave this group?")) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', headers: { 'x-auth-token': token } });
    location.reload();
};

window.deleteGroup = async function(groupId) {
    if(!confirm("⚠️ WARNING: This will delete the group and ALL content for everyone. Proceed?")) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
    location.reload();
};