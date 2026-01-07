// public/js/register.js

const form = document.getElementById('register-form');
const msgBox = document.getElementById('reg-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const btn = form.querySelector('button');

    // Visual Feedback
    btn.innerText = "Creating...";
    btn.disabled = true;
    msgBox.innerText = "";

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            msgBox.style.color = '#0f0'; // Hacker Green
            msgBox.innerText = "Success! Redirecting to Login...";
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            throw new Error(data.msg || "Registration failed");
        }

    } catch (err) {
        msgBox.style.color = '#ff3333'; // Error Red
        msgBox.innerText = err.message;
        btn.innerText = "Create Profile";
        btn.disabled = false;
    }
});