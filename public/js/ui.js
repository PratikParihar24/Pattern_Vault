// public/js/ui.js

const UI = {
    // 1. TOAST NOTIFICATIONS (Auto-dismissing)
    toast: function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if(!container) return;

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerText = message;

        container.appendChild(el);

        // Remove after 3 seconds
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    },

    // 2. CUSTOM PROMPT (Async/Await capable)
    // Usage: const name = await UI.prompt("Enter Name");
    prompt: function(title, placeholder = "") {
        return new Promise((resolve) => {
            this._showModal(title, null, true, placeholder, (val) => resolve(val), () => resolve(null));
        });
    },

    // 3. CUSTOM CONFIRM
    // Usage: const sure = await UI.confirm("Delete this?");
    confirm: function(title, message) {
        return new Promise((resolve) => {
            this._showModal(title, message, false, "", () => resolve(true), () => resolve(false));
        });
    },

    // INTERNAL HELPER (Draws the box)
    _showModal: function(title, message, hasInput, placeholder, onConfirm, onCancel) {
        const overlay = document.getElementById('custom-modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const inputEl = document.getElementById('modal-input');
        const okBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        // Reset State
        titleEl.innerText = title;
        if(message) {
            msgEl.innerText = message;
            msgEl.classList.remove('hidden');
        } else {
            msgEl.classList.add('hidden');
        }

        // Input Logic
        inputEl.value = "";
        if (hasInput) {
            inputEl.classList.remove('hidden');
            inputEl.placeholder = placeholder;
            setTimeout(() => inputEl.focus(), 100); // Focus after render
        } else {
            inputEl.classList.add('hidden');
        }

        // Show
        overlay.classList.remove('hidden');

        // Handlers
        // We use 'onclick' assignment to overwrite previous listeners (prevent duplicates)
        
        const close = () => {
            overlay.classList.add('hidden');
        };

        okBtn.onclick = () => {
            const val = hasInput ? inputEl.value : true;
            if (hasInput && !val) {
                inputEl.style.borderColor = "red"; // Validation visual
                return; 
            }
            close();
            onConfirm(val);
        };

        cancelBtn.onclick = () => {
            close();
            onCancel();
        };

        // Allow "Enter" key to confirm
        inputEl.onkeydown = (e) => {
            if(e.key === 'Enter') okBtn.click();
        };
    }
};

