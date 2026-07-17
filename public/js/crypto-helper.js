// public/js/crypto-helper.js

const CryptoHelper = {
    // 1. DERIVE KEY FROM PASSWORD
    deriveKey: async function(password, email) {
        const encoder = new TextEncoder();
        const pwBuf = encoder.encode(password);
        // Salt from email (makes it unique per user)
        const saltBuf = encoder.encode(email.toLowerCase());
        
        // Import raw password as key material
        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            pwBuf,
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        
        // Derive AES-GCM 256 key
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuf,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            true, // extractable
            ["encrypt", "decrypt"]
        );
    },

    // Export key as base64 string for sessionStorage
    exportKey: async function(key) {
        const raw = await window.crypto.subtle.exportKey("raw", key);
        return btoa(String.fromCharCode(...new Uint8Array(raw)));
    },

    // Import key from base64 string
    importKey: async function(base64Str) {
        const raw = new Uint8Array(atob(base64Str).split("").map(c => c.charCodeAt(0)));
        return await window.crypto.subtle.importKey(
            "raw",
            raw,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // 2. ENCRYPT TEXT
    encryptText: async function(text, key) {
        if (!text) return "";
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        
        // Format: iv_base64.ciphertext_base64
        const ivStr = btoa(String.fromCharCode(...iv));
        const cipherStr = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        return `${ivStr}.${cipherStr}`;
    },

    // 3. DECRYPT TEXT
    decryptText: async function(encryptedStr, key) {
        if (!encryptedStr || !encryptedStr.includes('.')) return encryptedStr; // Return raw if not encrypted/malformed
        try {
            const parts = encryptedStr.split('.');
            if (parts.length !== 2) return encryptedStr;
            const iv = new Uint8Array(atob(parts[0]).split("").map(c => c.charCodeAt(0)));
            const ciphertext = new Uint8Array(atob(parts[1]).split("").map(c => c.charCodeAt(0)));
            
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return "[Decryption Failed - Invalid Key]";
        }
    },

    // 4. ENCRYPT FILE/ARRAYBUFFER
    encryptFile: async function(arrayBuffer, key) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            arrayBuffer
        );
        
        // Package as: 12-byte IV + encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        return combined.buffer;
    },

    // 5. DECRYPT FILE/ARRAYBUFFER
    decryptFile: async function(arrayBuffer, key) {
        const iv = new Uint8Array(arrayBuffer, 0, 12);
        const ciphertext = new Uint8Array(arrayBuffer, 12);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        return decrypted;
    }
};
