// public/js/emoji-picker.js

const EmojiPicker = {
    element: null,
    onSelectCallback: null,

    emojis: [
        '📄', '🔥', '💡', '🚀', '⭐', '💻', '🔒', '👽', '💀', '🎯',
        '⚡', '🎨', '📚', '📝', '📌', '🧠', '🏆', '🎉', '🛠️', '⚙️',
        '🌐', '🔑', '🏷️', '📂', '📁', '📊', '📈', '💬', '✨', '🌟'
    ],

    init: function () {
        if (this.element) return;

        const picker = document.createElement('div');
        picker.className = 've-emoji-picker hidden';
        picker.style.cssText = `
            position: absolute;
            background: #151515;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            padding: 10px;
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 6px;
            z-index: 3000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.8);
        `;

        this.emojis.forEach(emoji => {
            const cell = document.createElement('button');
            cell.innerText = emoji;
            cell.style.cssText = `
                background: none;
                border: none;
                font-size: 1.3rem;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            cell.onmouseover = () => cell.style.background = '#2a2a2a';
            cell.onmouseout = () => cell.style.background = 'none';
            cell.onclick = (e) => {
                e.stopPropagation();
                if (typeof this.onSelectCallback === 'function') {
                    this.onSelectCallback(emoji);
                }
                this.hide();
            };
            picker.appendChild(cell);
        });

        document.body.appendChild(picker);
        this.element = picker;

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) this.hide();
        });
    },

    show: function (targetEl, onSelect) {
        this.init();
        this.onSelectCallback = onSelect;

        const rect = targetEl.getBoundingClientRect();
        this.element.style.top = `${rect.bottom + 5}px`;
        this.element.style.left = `${rect.left}px`;
        this.element.classList.remove('hidden');
    },

    hide: function () {
        if (this.element) this.element.classList.add('hidden');
    }
};

window.EmojiPicker = EmojiPicker;
