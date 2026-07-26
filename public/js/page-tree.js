// public/js/page-tree.js

const PageTree = {
    containerEl: null,
    allPages: [],
    decryptedTitles: {}, // _id -> title
    expandedMap: {}, // pageId -> boolean
    onSelectPageCallback: null,
    onCreateSubPageCallback: null,
    activePageId: null,

    init: function (containerEl, onSelectPage, onCreateSubPage) {
        this.containerEl = containerEl;
        this.onSelectPageCallback = onSelectPage;
        this.onCreateSubPageCallback = onCreateSubPage;
    },

    setPages: async function (pagesArray, activeId) {
        this.allPages = pagesArray || [];
        if (activeId !== undefined) {
            this.activePageId = activeId;
        }

        const key = typeof getCryptoKey === 'function' ? await getCryptoKey() : null;

        for (const p of this.allPages) {
            let title = p.rawTitle || '';
            const isGroup = Boolean(p.group);
            const b64Regex = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;

            if ((!title || b64Regex.test(title)) && p.content) {
                if (isGroup) {
                    title = p.content;
                } else if (key) {
                    try {
                        const dec = await CryptoHelper.decryptText(p.content, key);
                        if (dec) title = dec;
                    } catch (err) {}
                }
            }

            if (!title || b64Regex.test(title)) {
                title = 'Untitled Page';
            }

            const cleanTitle = title.trim();
            this.decryptedTitles[String(p._id)] = cleanTitle;
            p.rawTitle = cleanTitle;
        }

        // Automatically expand parents of active page
        if (this.activePageId) {
            let curr = this.allPages.find(p => String(p._id) === String(this.activePageId));
            while (curr && curr.pageId) {
                this.expandedMap[String(curr.pageId)] = true;
                curr = this.allPages.find(p => String(p._id) === String(curr.pageId));
            }
        }

        this.render();
    },

    renderTree: async function (containerEl, pagesArray, activeId, onSelectPage, onCreateSubPage) {
        const treeInstance = Object.create(PageTree);
        treeInstance.containerEl = containerEl;
        treeInstance.allPages = pagesArray || [];
        treeInstance.decryptedTitles = {};
        treeInstance.expandedMap = {};
        treeInstance.activePageId = activeId;
        treeInstance.onSelectPageCallback = onSelectPage;
        treeInstance.onCreateSubPageCallback = onCreateSubPage;

        await treeInstance.setPages(pagesArray, activeId);
        return treeInstance;
    },

    render: function () {
        if (!this.containerEl) return;
        this.containerEl.innerHTML = '';

        const favorites = this.allPages.filter(p => p.properties?.favorite);

        // FAVORITES SECTION
        if (favorites.length > 0) {
            const favSection = document.createElement('div');
            favSection.className = 've-tree-section';
            favSection.innerHTML = `<div class="ve-tree-section-title">⭐ Favorites</div>`;
            const favList = document.createElement('ul');
            favList.className = 've-tree-list';

            favorites.forEach(page => {
                favList.appendChild(this.renderNode(page, false));
            });

            favSection.appendChild(favList);
            this.containerEl.appendChild(favSection);
        }

        // ROOT PAGES (Exclude favorites so they don't repeat in the main tree)
        const isRoot = (p) => {
            if (p.properties?.favorite) return false;
            if (!p.pageId || p.pageId === 'null' || p.pageId === 'undefined') return true;
            return !this.allPages.some(parent => String(parent._id) === String(p.pageId));
        };
        const rootPages = this.allPages.filter(p => isRoot(p));

        const pagesSection = document.createElement('div');
        pagesSection.className = 've-tree-section';
        const rootList = document.createElement('ul');
        rootList.className = 've-tree-list';

        if (this.allPages.length === 0) {
            rootList.innerHTML = `<li style="color:#555; font-size:0.8rem; padding:6px 12px;">[No pages created yet]</li>`;
        } else {
            rootPages.forEach(page => {
                rootList.appendChild(this.renderNode(page, true));
            });
        }

        pagesSection.appendChild(rootList);
        this.containerEl.appendChild(pagesSection);
    },

    renderNode: function (page, isTreeRoot = true) {
        const li = document.createElement('li');
        const isActive = String(page._id) === String(this.activePageId);

        const children = isTreeRoot ? this.allPages.filter(c => String(c.pageId) === String(page._id)) : [];
        const hasChildren = children.length > 0;
        const isExpanded = Boolean(this.expandedMap[String(page._id)]);

        const node = document.createElement('div');
        node.className = `ve-tree-node ${isActive ? 'active-page' : ''} ${page.properties?.favorite ? 'is-favorite' : ''}`;
        node.dataset.id = String(page._id);

        const isFavorite = Boolean(page.properties?.favorite);
        const icon = page.properties?.icon || '📄';
        const title = this.decryptedTitles[String(page._id)] || page.rawTitle || 'Untitled Page';

        const arrowHTML = hasChildren
            ? `<span class="ve-tree-arrow ${isExpanded ? 'expanded' : ''}" style="cursor:pointer; padding-right:4px;">▶</span>`
            : `<span style="width:12px; display:inline-block;"></span>`;

        const favStar = isFavorite ? `<span class="ve-fav-star" title="Favorite" style="color: #ffd700; font-size: 0.8rem; margin-right: 2px;">⭐</span>` : '';

        node.innerHTML = `
            <div class="ve-tree-node-left" style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                ${arrowHTML}
                <span>${icon}</span>
                <span class="ve-tree-node-title" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${isFavorite ? 'color:#ffe87c;' : ''}">${title}</span>
                ${favStar}
            </div>
            <div class="ve-tree-node-actions" style="display:flex; align-items:center; gap:4px;">
                <span class="ve-tree-more-btn" title="Page options">•••</span>
                <span class="ve-tree-add-btn" title="Add sub-page">+</span>
            </div>
        `;

        // Click handler
        node.onclick = (e) => {
            if (e.target.classList.contains('ve-tree-arrow')) {
                e.stopPropagation();
                this.expandedMap[String(page._id)] = !this.expandedMap[String(page._id)];
                this.render();
                return;
            }

            if (e.target.classList.contains('ve-tree-more-btn')) {
                e.stopPropagation();
                if (typeof PageMenu !== 'undefined') {
                    PageMenu.show(e.target, page, async (action) => {
                        page.properties = page.properties || {};
                        if (action === 'trash') {
                            if (await UI.confirm("Move Page to Trash?", "You can restore this page later.")) {
                                await fetch(`/api/blocks/${page._id}/trash`, { method: 'PUT', credentials: 'include' });
                                await BlockStore.deleteBlock(page._id);
                                await loadVaultData();
                                if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page moved to trash", "success");
                            }
                        } else if (action === 'favorite') {
                            page.properties.favorite = !page.properties.favorite;
                            await fetch(`/api/blocks/${page._id}`, {
                                method: 'PUT',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ properties: page.properties })
                            });
                            await loadVaultData();
                            if (typeof UI !== 'undefined' && UI.toast) UI.toast(page.properties.favorite ? "Added to Favorites" : "Removed from Favorites", "success");
                        } else if (action === 'duplicate') {
                            await fetch(`/api/blocks/${page._id}/duplicate`, { method: 'POST', credentials: 'include' });
                            loadVaultData();
                            if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page duplicated successfully", "success");
                        } else if (action === 'rename') {
                            if (typeof this.onSelectPageCallback === 'function') {
                                await this.onSelectPageCallback(page._id);
                            }
                            setTimeout(() => {
                                const titleInput = document.getElementById('page-title-input');
                                if (titleInput) {
                                    titleInput.focus();
                                    titleInput.select();
                                    if (typeof UI !== 'undefined' && UI.toast) {
                                        UI.toast("Type page name in top title field", "info");
                                    }
                                }
                            }, 100);
                        }
                    });
                }
                return;
            }

            if (e.target.classList.contains('ve-tree-add-btn')) {
                e.stopPropagation();
                this.expandedMap[String(page._id)] = true;
                if (typeof this.onCreateSubPageCallback === 'function') {
                    this.onCreateSubPageCallback(page._id);
                }
                return;
            }

            this.activePageId = page._id;
            this.render();
            if (typeof this.onSelectPageCallback === 'function') {
                this.onSelectPageCallback(page._id);
            }
        };

        // Context menu (right-click)
        node.oncontextmenu = (e) => {
            e.preventDefault();
            if (typeof PageMenu !== 'undefined') {
                PageMenu.show(node, page, async (action) => {
                    page.properties = page.properties || {};
                    if (action === 'trash') {
                        if (await UI.confirm("Move Page to Trash?", "You can restore this page later.")) {
                            await fetch(`/api/blocks/${page._id}/trash`, { method: 'PUT', credentials: 'include' });
                            await BlockStore.deleteBlock(page._id);
                            await loadVaultData();
                            if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page moved to trash", "success");
                        }
                    } else if (action === 'favorite') {
                        page.properties.favorite = !page.properties.favorite;
                        await fetch(`/api/blocks/${page._id}`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ properties: page.properties })
                        });
                        await loadVaultData();
                        if (typeof UI !== 'undefined' && UI.toast) UI.toast(page.properties.favorite ? "Added to Favorites" : "Removed from Favorites", "success");
                    } else if (action === 'duplicate') {
                        await fetch(`/api/blocks/${page._id}/duplicate`, { method: 'POST', credentials: 'include' });
                        loadVaultData();
                        if (typeof UI !== 'undefined' && UI.toast) UI.toast("Page duplicated successfully", "success");
                    } else if (action === 'rename') {
                        if (typeof this.onSelectPageCallback === 'function') {
                            this.onSelectPageCallback(page._id);
                        }
                    }
                });
            }
        };

        li.appendChild(node);

        // Render nested children
        if (hasChildren) {
            const sublist = document.createElement('ul');
            sublist.className = `ve-tree-sublist ${isExpanded ? 'open' : ''}`;
            children.forEach(child => {
                sublist.appendChild(this.renderNode(child, true));
            });
            li.appendChild(sublist);
        }

        return li;
    }
};

window.PageTree = PageTree;
