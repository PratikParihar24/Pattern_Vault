// public/js/slash-menu.js

const SlashMenu = {
    element: null,
    selectedIndex: 0,
    activeBlockEl: null,
    onSelectCallback: null,

    items: [
        { type: 'paragraph', icon: '¶', label: 'Text', desc: 'Just start typing with plain text.' },
        { type: 'page', icon: '📄', label: 'Sub-page', desc: 'Create and link a sub-page.' },
        { type: 'heading1', icon: 'H1', label: 'Heading 1', desc: 'Big section heading.' },
        { type: 'heading2', icon: 'H2', label: 'Heading 2', desc: 'Medium section heading.' },
        { type: 'heading3', icon: 'H3', label: 'Heading 3', desc: 'Small section heading.' },
        { type: 'todo', icon: '☑', label: 'To-do list', desc: 'Track tasks with a checkbox.' },
        { type: 'bullet', icon: '•', label: 'Bulleted list', desc: 'Create a simple bulleted list.' },
        { type: 'quote', icon: '❞', label: 'Quote', desc: 'Capture a quote.' },
        { type: 'code', icon: '{}', label: 'Code', desc: 'Display code snippet.' },
        { type: 'divider', icon: '—', label: 'Divider', desc: 'Visually divide content.' },
        { type: 'toggle', icon: '▶', label: 'Toggle list', desc: 'Collapsible text block.' }
    ],

    init: function () {
        if (this.element) return;

        const menu = document.createElement('div');
        menu.className = 've-slash-menu hidden';
        menu.id = 've-slash-menu';
        document.body.appendChild(menu);
        this.element = menu;

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.hide();
            }
        });
    },

    show: function (targetBlockEl, x, y, filterQuery = '', onSelect) {
        this.init();
        this.activeBlockEl = targetBlockEl;
        this.onSelectCallback = onSelect;
        this.selectedIndex = 0;

        const filtered = this.items.filter(item =>
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(filterQuery.toLowerCase())
        );

        if (filtered.length === 0) {
            this.hide();
            return;
        }

        this.renderItems(filtered);

        const safeX = Math.max(10, Math.min(x, window.innerWidth - 260));
        const safeY = Math.max(10, Math.min(y, window.innerHeight - 310));

        this.element.style.top = `${safeY}px`;
        this.element.style.left = `${safeX}px`;
        this.element.classList.remove('hidden');
    },

    renderItems: function (filteredItems) {
        this.element.innerHTML = '';
        filteredItems.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = `ve-slash-item ${idx === this.selectedIndex ? 'selected' : ''}`;
            row.dataset.type = item.type;

            row.innerHTML = `
                <span class="ve-slash-icon">${item.icon}</span>
                <div class="ve-slash-info">
                    <div class="ve-slash-label">${item.label}</div>
                    <div class="ve-slash-desc">${item.desc}</div>
                </div>
            `;

            row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof this.onSelectCallback === 'function') {
                    this.onSelectCallback(item.type, this.activeBlockEl);
                }
                this.hide();
            });

            this.element.appendChild(row);
        });
    },

    hide: function () {
        if (this.element) {
            this.element.classList.add('hidden');
        }
        this.activeBlockEl = null;
    },

    handleKeyDown: function (e, filterQuery = '') {
        if (!this.element || this.element.classList.contains('hidden')) return false;

        const filtered = this.items.filter(item =>
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(filterQuery.toLowerCase())
        );

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % filtered.length;
            this.renderItems(filtered);
            return true;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + filtered.length) % filtered.length;
            this.renderItems(filtered);
            return true;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = filtered[this.selectedIndex];
            if (selectedItem && typeof this.onSelectCallback === 'function') {
                this.onSelectCallback(selectedItem.type, this.activeBlockEl);
            }
            this.hide();
            return true;
        } else if (e.key === 'Escape') {
            this.hide();
            return true;
        }

        return false;
    }
};

window.SlashMenu = SlashMenu;
