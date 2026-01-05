// src/models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    // 1. Identity
    name: {
        type: String,
        required: true // e.g., "Trip to Goa"
    },
    // The "Key" to enter the group
    inviteCode: {
        type: String,
        required: true,
        unique: true // No two groups can have the same code
    },

    // 2. The Member List (Who is allowed in?)
    members: [
        {
            type: mongoose.Schema.Types.ObjectId, // We store IDs, not names
            ref: 'User' // This ID points to the 'User' collection
        }
    ],

    // 3. The Owner (The Admin)
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // 4. The Shared Vault (Content)
    shared_notes: {
        type: String,
        default: ""
    },
    shared_photos: [
        { type: String } // Array of filenames, just like Personal Vault
    ]

}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);