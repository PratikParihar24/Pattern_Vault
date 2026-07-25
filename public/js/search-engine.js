// public/js/search-engine.js

const SearchEngine = {
    overlayEl: null,
    inputEl: null,
    resultsEl: null,
    decryptedCache: {}, // id -> plain string
    onSelectPageCallback: null,

    init: function (onSelectPage) {
        this.onSelectPageCallback = onSelectPage;
        if (this.overlayEl) return;

        const overlay = document.createElement('div');
        overlay.className = 've-search-overlay hidden';
        overlay.innerHTML = `
            <div class="ve-search-modal">
                <input type="text" class="ve-search-input" placeholder="Search vault pages & blocks... (Esc to close)" id="ve-search-input">
                <div class="ve-search-results" id="ve-search-results"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlayEl = overlay;
        this.inputEl = overlay.querySelector('#ve-search-input');
        this.resultsEl = overlay.querySelector('#ve-search-results');

        this.inputEl.addEventListener('input', () => this.performSearch());

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hide();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.show();
            } else if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                this.hide();
            }
        });
    },

    show: function () {
        this.init();
        this.overlayEl.classList.remove('hidden');
        this.inputEl.value = '';
        this.resultsEl.innerHTML = '<div style="color:#666; font-size:0.85rem; padding:10px;">Type to search...</div>';
        this.inputEl.focus();
    },

    hide: function () {
        if (this.overlayEl) this.overlayEl.classList.add('hidden');
    },

    performSearch: async function () {
        const query = this.inputEl.value.trim();
        if (!query) {
            this.resultsEl.innerHTML = '<div style="color:#666; font-size:0.85rem; padding:10px;">Type to search...</div>';
            return;
        }

        const matches = await BlockStore.searchBlocks(query, this.decryptedCache);
        this.renderResults(matches);
    },

    renderResults: function (matches) {
        this.resultsEl.innerHTML = '';

        if (matches.length === 0) {
            this.resultsEl.innerHTML = '<div style="color:#666; font-size:0.85rem; padding:10px;">No matching pages found</div>';
            return;
        }

        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 've-search-item';

            let snippetHTML = '';
            if (m.matchingBlocks && m.matchingBlocks.length > 0) {
                snippetHTML = `<div class="ve-search-item-snippet">${m.matchingBlocks[0].decryptedContent.slice(0, 80)}...</div>`;
            }

            item.innerHTML = `
                <div class="ve-search-item-title">${m.page.properties?.icon || '📄'} ${m.decryptedTitle}</div>
                ${snippetHTML}
            `;

            item.onclick = () => {
                if (typeof this.onSelectPageCallback === 'function') {
                    this.onSelectPageCallback(m.page._id);
                }
                this.hide();
            };

            this.resultsEl.appendChild(item);
        });
    }
};

window.SearchEngine = SearchEngine;
