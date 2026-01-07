// src/models/Album.js
const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
    // Who owns this album?
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Is it for a group? (If null, it's Personal)
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    
    name: { type: String, required: true },
    
    // The photos inside
    photos: [
        {
            filename: String,       // The saved filename on disk
            originalName: String,   // The name the user had (e.g., "vacation.jpg")
            uploadDate: { type: Date, default: Date.now }
        }
    ],
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Album', AlbumSchema);