// public/js/block-store.js

const BlockStore = {
    dbName: 'PatternVaultDB',
    dbVersion: 1,
    db: null,

    init: function () {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Object store for blocks
                if (!db.objectStoreNames.contains('blocks')) {
                    const blockStore = db.createObjectStore('blocks', { keyPath: '_id' });
                    blockStore.createIndex('pageId', 'pageId', { unique: false });
                    blockStore.createIndex('type', 'type', { unique: false });
                    blockStore.createIndex('deleted', 'deleted', { unique: false });
                    blockStore.createIndex('isDirty', 'isDirty', { unique: false });
                }

                // Object store for sync queue & metadata
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.error("IndexedDB error:", e.target.error);
                reject(e.target.error);
            };
        });
    },

    // Save or update blocks in IndexedDB
    saveBlocks: async function (blocksArray) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readwrite');
            const store = tx.objectStore('blocks');

            blocksArray.forEach(block => {
                store.put(block);
            });

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    // Save a single block
    saveBlock: async function (block) {
        return this.saveBlocks([block]);
    },

    // Get a single block by ID
    getBlock: async function (id) {
        if (!id) return null;
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readonly');
            const store = tx.objectStore('blocks');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // Delete a single block by ID (and all child blocks)
    deleteBlock: async function (id) {
        if (!id) return;
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readwrite');
            const store = tx.objectStore('blocks');
            store.delete(id);

            try {
                const index = store.index('pageId');
                const req = index.getAllKeys(id);
                req.onsuccess = () => {
                    const keys = req.result || [];
                    keys.forEach(k => store.delete(k));
                };
            } catch (e) {}

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    // Get all blocks for a given page
    getBlocksByPage: async function (pageId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readonly');
            const store = tx.objectStore('blocks');
            const index = store.index('pageId');
            const request = index.getAll(pageId);

            request.onsuccess = () => {
                const results = (request.result || [])
                    .filter(b => !b.deleted)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // Get all pages (sidebar page tree)
    getAllPages: async function (groupId = null) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readonly');
            const store = tx.objectStore('blocks');
            const index = store.index('type');
            const request = index.getAll('page');

            request.onsuccess = () => {
                const results = (request.result || [])
                    .filter(b => !b.deleted && (groupId ? String(b.group) === String(groupId) : !b.group))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // Get trashed items
    getTrash: async function () {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readonly');
            const store = tx.objectStore('blocks');
            const request = store.getAll();

            request.onsuccess = () => {
                const results = (request.result || [])
                    .filter(b => b.deleted === true && b.type === 'page');
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // Get all dirty blocks pending backend sync
    getDirtyBlocks: async function () {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readonly');
            const store = tx.objectStore('blocks');
            const request = store.getAll();

            request.onsuccess = () => {
                const results = (request.result || [])
                    .filter(b => b.isDirty === true);
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // Clear dirty flag for synced block IDs
    clearDirtyFlags: async function (blockIds) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('blocks', 'readwrite');
            const store = tx.objectStore('blocks');

            blockIds.forEach(id => {
                const getReq = store.get(id);
                getReq.onsuccess = () => {
                    if (getReq.result) {
                        const updated = { ...getReq.result, isDirty: false };
                        store.put(updated);
                    }
                };
            });

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    // Client-side search across decrypted blocks
    searchBlocks: async function (queryStr, decryptedCacheMap) {
        if (!queryStr || !queryStr.trim()) return [];
        const term = queryStr.toLowerCase().trim();

        await this.init();
        const pages = await this.getAllPages();
        const results = [];
        const key = typeof getCryptoKey === 'function' ? await getCryptoKey() : null;
        const b64Regex = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;

        for (const page of pages) {
            let decryptedTitle = (decryptedCacheMap && decryptedCacheMap[page._id]) || page.rawTitle || page.content || 'Untitled Page';
            if (b64Regex.test(decryptedTitle) && key && !page.group) {
                try {
                    const dec = await CryptoHelper.decryptText(decryptedTitle, key);
                    decryptedTitle = dec || 'Untitled Page';
                } catch (e) {}
            }
            if (b64Regex.test(decryptedTitle)) decryptedTitle = 'Untitled Page';

            const pageBlocks = await this.getBlocksByPage(page._id);

            let pageMatched = decryptedTitle.toLowerCase().includes(term);
            const matchingBlocks = [];

            for (const b of pageBlocks) {
                let decContent = (decryptedCacheMap && decryptedCacheMap[b._id]) || b.rawContent || b.content || '';
                if (b64Regex.test(decContent) && key && !b.group) {
                    try {
                        const dec = await CryptoHelper.decryptText(decContent, key);
                        decContent = dec || '';
                    } catch (e) {}
                }
                if (b64Regex.test(decContent)) decContent = '';

                if (decContent && decContent.toLowerCase().includes(term)) {
                    matchingBlocks.push({ block: b, decryptedContent: decContent });
                }
            }

            if (pageMatched || matchingBlocks.length > 0) {
                results.push({
                    page: page,
                    decryptedTitle: decryptedTitle,
                    matchingBlocks: matchingBlocks
                });
            }
        }

        return results;
    },

    // Metadata Key-Value store operations (for vault key / session data)
    setMetadata: async function (key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('metadata', 'readwrite');
            const store = tx.objectStore('metadata');
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    getMetadata: async function (key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('metadata', 'readonly');
            const store = tx.objectStore('metadata');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    deleteMetadata: async function (key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('metadata', 'readwrite');
            const store = tx.objectStore('metadata');
            store.delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    // Wipe local cache (on logout or reset)
    clearAllData: async function () {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['blocks', 'metadata'], 'readwrite');
            tx.objectStore('blocks').clear();
            tx.objectStore('metadata').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }
};

window.BlockStore = BlockStore;
