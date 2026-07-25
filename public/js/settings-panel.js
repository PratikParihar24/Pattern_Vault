// public/js/settings-panel.js

const SettingsPanel = {
    containerEl: null,
    currentPrefs: null,

    init: function (containerEl) {
        this.containerEl = containerEl;
    },

    loadAndRender: async function () {
        if (!this.containerEl) return;
        this.containerEl.innerHTML = `<div style="color:#888; font-family:monospace;">Loading global workspace settings...</div>`;

        try {
            const res = await fetch('/api/prefs', { credentials: 'include' });
            if (res.ok) {
                this.currentPrefs = await res.json();
            }
        } catch (err) {
            console.error("Failed to load settings:", err);
        }

        const prefs = this.currentPrefs || { theme: { accent: 'cyan' }, defaultFont: 'serif', autosaveInterval: 1500 };

        this.containerEl.innerHTML = `
            <div class="ve-settings-wrapper" style="max-width: 600px; padding: 20px; font-family: 'Courier New', monospace; color: #fff;">
                <h2 style="border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">⚙️ Workspace Settings</h2>

                <!-- APPEARANCE -->
                <div class="ve-settings-group" style="margin-bottom: 25px;">
                    <h3 style="color: #00e5ff; font-size: 1rem; margin-bottom: 10px;">🎨 Appearance</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; color: #888; font-size: 0.85rem; margin-bottom: 5px;">Accent Color:</label>
                        <select id="setting-accent" style="background: #181818; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 4px; width: 100%;">
                            <option value="cyan" ${prefs.theme?.accent === 'cyan' ? 'selected' : ''}>Cyan (Default)</option>
                            <option value="purple" ${prefs.theme?.accent === 'purple' ? 'selected' : ''}>Purple Accent</option>
                            <option value="green" ${prefs.theme?.accent === 'green' ? 'selected' : ''}>Emerald Green</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; color: #888; font-size: 0.85rem; margin-bottom: 5px;">Default Editor Font:</label>
                        <select id="setting-font" style="background: #181818; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 4px; width: 100%;">
                            <option value="serif" ${prefs.defaultFont === 'serif' ? 'selected' : ''}>Serif (Merriweather)</option>
                            <option value="sans" ${prefs.defaultFont === 'sans' ? 'selected' : ''}>Sans-Serif (Inter)</option>
                            <option value="mono" ${prefs.defaultFont === 'mono' ? 'selected' : ''}>Monospace (Courier)</option>
                        </select>
                    </div>
                </div>

                <!-- STORAGE & SYNC -->
                <div class="ve-settings-group" style="margin-bottom: 25px;">
                    <h3 style="color: #00e5ff; font-size: 1rem; margin-bottom: 10px;">⚡ Storage & Sync</h3>
                    <p style="color: #888; font-size: 0.85rem;">Local IndexedDB Status: Healthy</p>
                    <button id="btn-sync-now" style="background: #2a2a2a; border: 1px solid #444; color: #fff; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px;">🔄 Sync Now</button>
                    <button id="btn-clear-cache" style="background: rgba(255,68,68,0.1); border: 1px solid #ff4444; color: #ff4444; padding: 8px 15px; border-radius: 4px; cursor: pointer;">🗑️ Clear Local Cache</button>
                </div>

                <div style="border-top: 1px solid #333; padding-top: 15px;">
                    <button id="btn-save-prefs" style="background: #00e5ff; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer;">Save Settings</button>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents: function () {
        const accentSelect = document.getElementById('setting-accent');
        const fontSelect = document.getElementById('setting-font');
        const saveBtn = document.getElementById('btn-save-prefs');
        const syncBtn = document.getElementById('btn-sync-now');
        const clearCacheBtn = document.getElementById('btn-clear-cache');

        saveBtn.onclick = async () => {
            const accent = accentSelect.value;
            const font = fontSelect.value;

            document.documentElement.setAttribute('data-theme', accent);
            document.documentElement.setAttribute('data-font', font);

            try {
                await fetch('/api/prefs', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme: { accent }, defaultFont: font })
                });
                if (typeof UI !== 'undefined' && UI.toast) UI.toast("Settings saved", "success");
            } catch (err) {
                console.error(err);
            }
        };

        syncBtn.onclick = () => {
            SyncEngine.syncNow();
            if (typeof UI !== 'undefined' && UI.toast) UI.toast("Manual sync triggered", "info");
        };

        clearCacheBtn.onclick = async () => {
            if (typeof UI !== 'undefined' && UI.confirm) {
                if (!(await UI.confirm("Clear Local Cache?", "Local data will be cleared and re-synced from server."))) return;
            }
            await BlockStore.clearAllData();
            location.reload();
        };
    }
};

window.SettingsPanel = SettingsPanel;
