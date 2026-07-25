// public/js/sync-engine.js

const SyncEngine = {
    autosaveIntervalMs: 1500,
    autosaveTimer: null,
    isSyncing: false,
    lastSyncedTime: null,
    onSyncStatusChange: null,

    init: function () {
        window.addEventListener('online', () => {
            console.log("[SyncEngine] Online connection restored. Triggering sync...");
            this.syncNow();
        });

        window.addEventListener('offline', () => {
            console.log("[SyncEngine] Device went offline. Queueing changes locally.");
            this.updateStatus("offline");
        });
    },

    updateStatus: function (status, message = '') {
        if (typeof this.onSyncStatusChange === 'function') {
            this.onSyncStatusChange(status, message, this.lastSyncedTime);
        }
    },

    // Trigger debounced autosave when blocks are mutated locally
    scheduleAutosave: function (overrideDelayMs) {
        this.updateStatus("typing", "Typing...");
        if (this.autosaveTimer) clearTimeout(this.autosaveTimer);

        const delay = typeof overrideDelayMs === 'number' ? overrideDelayMs : this.autosaveIntervalMs;
        this.autosaveTimer = setTimeout(() => {
            this.syncNow();
        }, delay);
    },

    // Perform immediate batch sync of all dirty blocks to server
    syncNow: async function () {
        if (!navigator.onLine) {
            this.updateStatus("offline", "Offline — changes saved locally");
            return;
        }

        if (this.isSyncing) return;
        this.isSyncing = true;
        this.updateStatus("saving", "Syncing to server...");

        try {
            const dirtyBlocks = await BlockStore.getDirtyBlocks();
            if (dirtyBlocks.length === 0) {
                this.isSyncing = false;
                this.lastSyncedTime = new Date();
                this.updateStatus("synced", "All changes saved");
                return;
            }

            // Get encryption key
            const key = typeof getCryptoKey === 'function' ? await getCryptoKey() : null;

            // Encrypt all dirty content in parallel (skip encryption for shared group blocks)
            const encryptedBatch = await Promise.all(dirtyBlocks.map(async (block) => {
                let encContent = block.content;
                const isGroupBlock = Boolean(block.group || (typeof currentContext !== 'undefined' && currentContext.type === 'group'));

                if (block.rawContent !== undefined) {
                    if (isGroupBlock) {
                        encContent = block.rawContent;
                    } else if (key) {
                        encContent = await CryptoHelper.encryptText(block.rawContent, key);
                    } else {
                        encContent = block.rawContent;
                    }
                }

                return {
                    _id: block._id,
                    pageId: block.pageId || null,
                    parentBlockId: block.parentBlockId || null,
                    type: block.type || 'paragraph',
                    content: encContent,
                    properties: block.properties,
                    checked: block.checked,
                    collapsed: block.collapsed,
                    order: block.order,
                    indent: block.indent,
                    group: block.group || null,
                    version: block.version || 0
                };
            }));

            const res = await fetch('/api/blocks/batch/save', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks: encryptedBatch })
            });

            if (res.status === 409) {
                this.isSyncing = false;
                this.updateStatus("conflict", "Sync Conflict — remote modified");
                if (typeof UI !== 'undefined' && UI.toast) {
                    UI.toast("Conflict detected. Latest server version retained.", "error");
                }
                return;
            }

            if (res.ok) {
                const data = await res.json();

                // Delete temp IDs from IndexedDB to prevent block duplication
                for (const b of dirtyBlocks) {
                    if (typeof b._id === 'string' && b._id.startsWith('temp_')) {
                        await BlockStore.deleteBlock(b._id);
                    }
                }

                // Update server-assigned versions in IndexedDB
                if (data.blocks && Array.isArray(data.blocks)) {
                    await BlockStore.saveBlocks(data.blocks.map(b => ({ ...b, isDirty: false })));
                } else {
                    const syncedIds = dirtyBlocks.map(b => b._id);
                    await BlockStore.clearDirtyFlags(syncedIds);
                }

                this.lastSyncedTime = new Date();
                this.updateStatus("synced", "All changes saved");
            } else {
                this.updateStatus("error", "Sync Error");
            }
        } catch (err) {
            console.error("[SyncEngine] Sync error:", err);
            this.updateStatus("error", "Sync Failed");
        } finally {
            this.isSyncing = false;
        }
    },

    // Fetch latest blocks from server and merge into local IndexedDB
    fetchRemotePages: async function (groupId = null) {
        if (!navigator.onLine) return await BlockStore.getAllPages(groupId);

        try {
            const url = groupId ? `/api/blocks/pages?group=${groupId}` : '/api/blocks/pages';
            const res = await fetch(url, { credentials: 'include' });
            if (res.ok) {
                const remotePages = await res.json();
                await BlockStore.saveBlocks(remotePages.map(p => ({ ...p, isDirty: false })));
                return remotePages;
            }
        } catch (err) {
            console.error("[SyncEngine] Failed to fetch remote pages:", err);
        }

        return await BlockStore.getAllPages(groupId);
    },

    fetchRemotePageBlocks: async function (pageId) {
        if (!navigator.onLine) return await BlockStore.getBlocksByPage(pageId);

        try {
            const res = await fetch(`/api/blocks/page/${pageId}`, { credentials: 'include' });
            if (res.ok) {
                const remoteBlocks = await res.json();
                await BlockStore.saveBlocks(remoteBlocks.map(b => ({ ...b, isDirty: false })));
                return remoteBlocks;
            }
        } catch (err) {
            console.error("[SyncEngine] Failed to fetch remote blocks for page:", err);
        }

        return await BlockStore.getBlocksByPage(pageId);
    }
};

window.SyncEngine = SyncEngine;
