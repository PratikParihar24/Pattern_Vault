// public/js/session-manager.js

const SessionManager = {
    VAULT_KEY_NAME: 'vaultKey',

    // Store base64 key into IndexedDB metadata and sessionStorage
    saveVaultKey: async function (b64Key, rememberDevice = true) {
        if (!b64Key) return;
        sessionStorage.setItem(this.VAULT_KEY_NAME, b64Key);

        if (rememberDevice) {
            await BlockStore.setMetadata(this.VAULT_KEY_NAME, b64Key);
            await BlockStore.setMetadata('rememberDevice', true);
        } else {
            await BlockStore.deleteMetadata(this.VAULT_KEY_NAME);
            await BlockStore.setMetadata('rememberDevice', false);
        }
    },

    // Retrieve cached base64 key
    getVaultKey: async function () {
        // First check session memory
        let b64Key = sessionStorage.getItem(this.VAULT_KEY_NAME);
        if (b64Key) return b64Key;

        // Fall back to persistent IndexedDB metadata
        b64Key = await BlockStore.getMetadata(this.VAULT_KEY_NAME);
        if (b64Key) {
            sessionStorage.setItem(this.VAULT_KEY_NAME, b64Key); // re-populate session memory
            return b64Key;
        }

        // Fall back to legacy localStorage
        b64Key = localStorage.getItem(this.VAULT_KEY_NAME);
        if (b64Key) {
            sessionStorage.setItem(this.VAULT_KEY_NAME, b64Key);
            return b64Key;
        }

        return null;
    },

    // Check if session has offline vault capability
    hasOfflineCapability: async function () {
        const key = await this.getVaultKey();
        const pages = await BlockStore.getAllPages();
        return Boolean(key && pages.length > 0);
    },

    // Clear session and local cache on explicit logout
    logoutSession: async function () {
        sessionStorage.removeItem(this.VAULT_KEY_NAME);
        localStorage.removeItem(this.VAULT_KEY_NAME);
        await BlockStore.clearAllData();
    }
};

window.SessionManager = SessionManager;
