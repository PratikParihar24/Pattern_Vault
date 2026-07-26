// public/js/page-menu.js

const PageMenu = {
    element: null,
    currentPage: null,
    onActionCallback: null,

    init: function () {
        if (this.element) return;

        const menu = document.createElement('div');
        menu.className = 've-page-menu hidden';
        menu.id = 've-page-menu';
        document.body.appendChild(menu);
        this.element = menu;

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && !e.target.closest('#ve-page-menu-trigger')) {
                this.hide();
            }
        });
    },

    show: function (triggerBtnEl, pageObject, onAction) {
        this.init();
        this.currentPage = pageObject;
        this.onActionCallback = onAction;

        const props = pageObject.properties || {};
        const isFav = Boolean(props.favorite);
        const isLocked = Boolean(props.locked);
        const isSmall = Boolean(props.smallText);
        const isFull = Boolean(props.fullWidth);

        const author = pageObject.updatedBy || 'User';
        const formattedDate = new Date(pageObject.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        this.element.innerHTML = `
            <div class="ve-menu-header" style="font-size: 0.75rem; color: #666; padding: 4px 8px; font-weight: bold;">Page</div>
            <div class="ve-menu-group">
                <div class="ve-menu-item" data-action="favorite" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>${isFav ? '⭐ Remove from Favorites' : '⭐ Add to Favorites'}</span>
                </div>
            </div>
            <div class="ve-menu-divider"></div>
            <div class="ve-menu-group">
                <div class="ve-menu-item" data-action="duplicate" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <span>📋 Duplicate</span>
                    <span class="ve-menu-shortcut" style="color:#666; font-size:0.75rem;">Ctrl+D</span>
                </div>
                <div class="ve-menu-item" data-action="rename" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <span>✏️ Rename</span>
                    <span class="ve-menu-shortcut" style="color:#666; font-size:0.75rem;">Ctrl+Shift+R</span>
                </div>
                <div class="ve-menu-item danger" data-action="trash" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>🗑️ Move to Trash</span>
                </div>
            </div>
        `;

        this.element.classList.remove('hidden');

        const rect = triggerBtnEl.getBoundingClientRect();
        const menuHeight = this.element.offsetHeight || 180;
        const menuWidth = this.element.offsetWidth || 220;

        let top = rect.bottom + 6;
        if (top + menuHeight > window.innerHeight - 10) {
            top = Math.max(10, rect.top - menuHeight - 6);
        }

        let left = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10));

        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;

        // Bind clicks
        this.element.querySelectorAll('.ve-menu-item').forEach(item => {
            item.onclick = (e) => {
                const action = item.dataset.action;
                if (typeof this.onActionCallback === 'function') {
                    this.onActionCallback(action, this.currentPage);
                }
                this.hide();
            };
        });
    },

    showAlbumMenu: function (triggerBtnEl, albumObject, onAction) {
        this.init();
        this.currentPage = albumObject;
        this.onActionCallback = onAction;

        this.element.innerHTML = `
            <div class="ve-menu-header" style="font-size: 0.75rem; color: #666; padding: 4px 8px; font-weight: bold;">Album Options</div>
            <div class="ve-menu-group">
                <div class="ve-menu-item" data-action="select" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>☑️ Select Photos</span>
                </div>
                <div class="ve-menu-item" data-action="rename" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>✏️ Rename</span>
                </div>
                <div class="ve-menu-item" data-action="info" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>ℹ️ Info</span>
                </div>
            </div>
            <div class="ve-menu-divider"></div>
            <div class="ve-menu-group">
                <div class="ve-menu-item danger" data-action="delete" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>🗑️ Delete Album</span>
                </div>
            </div>
        `;

        this.element.classList.remove('hidden');

        const rect = triggerBtnEl.getBoundingClientRect();
        const menuHeight = this.element.offsetHeight || 160;
        const menuWidth = this.element.offsetWidth || 200;

        let top = rect.bottom + 6;
        if (top + menuHeight > window.innerHeight - 10) {
            top = Math.max(10, rect.top - menuHeight - 6);
        }

        let left = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10));

        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;

        this.element.querySelectorAll('.ve-menu-item').forEach(item => {
            item.onclick = (e) => {
                const action = item.dataset.action;
                if (typeof this.onActionCallback === 'function') {
                    this.onActionCallback(action, this.currentPage);
                }
                this.hide();
            };
        });
    },

    hide: function () {
        if (this.element) this.element.classList.add('hidden');
    }
};

window.PageMenu = PageMenu;
