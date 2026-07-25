// public/js/breadcrumb.js

const BreadcrumbBar = {
    element: null,
    onNavigateCallback: null,

    init: function (containerEl, onNavigate) {
        this.element = containerEl;
        this.onNavigateCallback = onNavigate;
    },

    renderPath: async function (currentPageId, allPages, rootLabel = '🔐 Vault', currentPageObj = null) {
        const liveEl = document.getElementById('ve-breadcrumb-bar') || this.element;
        if (!liveEl) return;
        this.element = liveEl;
        this.element.innerHTML = '';

        if (!currentPageId) {
            this.element.style.display = 'none';
            return;
        }

        this.element.style.display = 'flex';
        this.element.style.marginBottom = '12px';

        const key = typeof getCryptoKey === 'function' ? await getCryptoKey() : null;
        const path = [];
        const pagesList = Array.isArray(allPages) ? allPages : [];

        let curr = pagesList.find(p => String(p._id || p.id) === String(currentPageId));
        if (!curr && currentPageObj && typeof currentPageObj === 'object') {
            curr = currentPageObj;
        }

        const visited = new Set();
        while (curr && !visited.has(String(curr._id || curr.id))) {
            visited.add(String(curr._id || curr.id));
            path.unshift(curr);
            const parentId = curr.pageId ? (typeof curr.pageId === 'object' ? (curr.pageId._id || curr.pageId.id) : curr.pageId) : null;
            if (!parentId || parentId === 'null' || parentId === 'undefined') break;
            curr = pagesList.find(p => String(p._id || p.id) === String(parentId));
        }

        if (path.length === 0) {
            this.element.style.display = 'none';
            return;
        }

        // Root item
        const rootItem = document.createElement('span');
        rootItem.className = 've-breadcrumb-item';
        rootItem.innerText = rootLabel;
        rootItem.onclick = () => {
            if (typeof this.onNavigateCallback === 'function') this.onNavigateCallback(null);
        };
        this.element.appendChild(rootItem);

        for (const page of path) {
            const sep = document.createElement('span');
            sep.className = 've-breadcrumb-separator';
            sep.innerText = ' / ';
            this.element.appendChild(sep);

            let titleText = page.rawTitle;
            if (!titleText && page.content) {
                if (page.group) {
                    titleText = page.content;
                } else if (key) {
                    try {
                        titleText = await CryptoHelper.decryptText(page.content, key);
                    } catch (e) {}
                }
            }

            const b64Regex = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;
            if (!titleText || b64Regex.test(titleText)) {
                titleText = 'Untitled Page';
            }

            const item = document.createElement('span');
            item.className = 've-breadcrumb-item';
            item.innerText = `${page.properties?.icon || '📄'} ${titleText}`;
            item.onclick = () => {
                if (typeof this.onNavigateCallback === 'function') this.onNavigateCallback(page._id || page.id);
            };
            this.element.appendChild(item);
        }
    }
};

window.BreadcrumbBar = BreadcrumbBar;
