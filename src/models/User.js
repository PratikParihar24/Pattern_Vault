// src/models/User.js
const mongoose = require('mongoose');

// Define the shape of a User
const UserSchema = new mongoose.Schema({
    // 1. The Identity
    email: {
        type: String,
        required: true, // They MUST provide this
        unique: true    // No two users can have the same email
    },
    password: {
        type: String,
        required: true
    },
    
    // 2. Display Name (for leaderboard)
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        default: 'Player'
    },

    // 3. Game Stats (Leaderboard)
    highScore: {
        type: Number,
        default: 0
    },
    totalGamesPlayed: {
        type: Number,
        default: 0
    },
    
    // 4. The Personal Vault (Private Data)
    personal_notes: {
        type: String,
        default: "" // Starts empty
    },
    personal_photos: [
        // An Array of Strings (filenames)
        { type: String } 
    ],

    // 5. Social (Groups)
    // This is a "Relationship". We are saying this array stores IDs
    // that point to the 'Group' collection.
    groups: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group'
        }
    ]
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt'

// Compile the Schema into a Model and export it
module.exports = mongoose.model('User', UserSchema);