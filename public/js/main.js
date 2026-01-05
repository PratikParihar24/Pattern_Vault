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
const navPersonal = document.getElementById('nav-personal');
const groupsListEl = document.getElementById('groups-list');
const currentViewTitle = document.getElementById('current-view-title');
const groupCodeDisplay = document.getElementById('group-code-display');
const noteArea = document.getElementById('notes-area');

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
async function loadVaultData() {
    const token = localStorage.getItem('token');
    
    // 1. Fetch the SIDEBAR List (Which groups am I in?)
    // We need a helper route for this (We will build it in a second, 
    // but for now let's assume we get the list from the User object)
    const userRes = await fetch('/api/vault/personal', {
        headers: { 'x-auth-token': token }
    });
    const userData = await userRes.json();

    // --- NEW LOG ---
    console.log("DEBUG: User Data from Server:", userData); 
    // ----------------
    
    // Use '|| []' to default to an empty array if data is missing
    renderSidebar(userData.groups || []); 

    // 2. Fetch the MAIN CONTENT based on context
    if (currentContext.type === 'personal') {
        // Show Personal Data
        currentViewTitle.innerText = "My Private Vault";
        groupCodeDisplay.classList.add('hidden');
        
        noteArea.value = userData.personal_notes || "";
        renderPhotos(userData.personal_photos || []);
        
    } else if (currentContext.type === 'group') {
        // Show Group Data
        const groupRes = await fetch(`/api/groups/${currentContext.id}`, {
            headers: { 'x-auth-token': token }
        });
        
        if (groupRes.ok) {
            const groupData = await groupRes.json();
            
            currentViewTitle.innerText = groupData.name;
            groupCodeDisplay.innerText = `Code: ${groupData.inviteCode}`;
            groupCodeDisplay.classList.remove('hidden');
            
            noteArea.value = groupData.shared_notes || "";
            renderPhotos(groupData.shared_photos || []);
        }
    }
}

// --- EVENT 3: SAVE NOTES ---
// --- SMART SAVE BUTTON (FIXED) ---
document.getElementById('save-notes-btn').addEventListener('click', async () => {
    // 1. We use 'notes-area' because that is what we put in the HTML Dashboard
    const textArea = document.getElementById('notes-area'); 
    
    // Safety Check: If HTML is missing the ID, stop here.
    if (!textArea) {
        console.error("CRITICAL ERROR: Could not find <textarea id='notes-area'> in HTML");
        return;
    }

    const noteContent = textArea.value;
    const token = localStorage.getItem('token');

    let url = '';
    
    // 2. Decide URL based on context
    if (currentContext.type === 'personal') {
        url = '/api/vault/personal/update';
    } else {
        url = `/api/groups/${currentContext.id}/notes`;
    }

    // 3. Send Request
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ noteText: noteContent })
        });

        if (res.ok) {
            alert("Saved! ✅");
        } else {
            const errData = await res.json();
            alert("Error: " + (errData.msg || "Save failed"));
        }
    } catch (err) {
        console.error(err);
        alert("Network Error");
    }
});

// ... existing code ...

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
function renderSidebar(groups) {
    groupsListEl.innerHTML = ''; // Clear list

    groups.forEach(group => {
        const li = document.createElement('li');
        li.innerText = group.name || "Unnamed Group"; // We need to populate names!
        
        // Highlight if active
        if (currentContext.type === 'group' && currentContext.id === group._id) {
            li.classList.add('active');
        }

        // Click Event: Switch Context
        li.addEventListener('click', () => {
            currentContext = { type: 'group', id: group._id };
            updateActiveNav(); // Visual update
            loadVaultData();   // Fetch new data
        });

        groupsListEl.appendChild(li);
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

// Click Event for "My Private Vault"
navPersonal.addEventListener('click', () => {
    currentContext = { type: 'personal', id: null };
    updateActiveNav();
    loadVaultData();
});


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
