// public/js/register.js

const form   = document.getElementById('register-form');
const msgBox = document.getElementById('reg-message');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const displayName = document.getElementById('displayName').value.trim();
        const email       = document.getElementById('reg-email').value.trim();
        const password    = document.getElementById('reg-password').value;
        const btn         = form.querySelector('button[type="submit"]') || document.getElementById('reg-btn');

        // Validation
        if (displayName.length < 2) {
            showMsg('Display name must be at least 2 characters', 'error');
            return;
        }

        // Visual Feedback
        btn.textContent = 'Creating account...';
        btn.disabled = true;
        msgBox.style.display = 'none';

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName })
            });

            const data = await res.json();

            if (res.ok) {
                showMsg('🎉 Account created! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                throw new Error(data.msg || 'Registration failed');
            }

        } catch (err) {
            showMsg(err.message, 'error');
            btn.textContent = '🚀 Create Free Account';
            btn.disabled = false;
        }
    });
}

function showMsg(text, type) {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = `auth-msg ${type}`;
    msgBox.style.display = 'block';
}