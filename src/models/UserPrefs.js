const mongoose = require('mongoose');

const UserPrefsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    theme: {
        accent: {
            type: String,
            enum: ['cyan', 'purple', 'green'],
            default: 'cyan'
        }
    },
    defaultFont: {
        type: String,
        enum: ['sans', 'serif', 'mono'],
        default: 'serif'
    },
    sidebarCollapsed: {
        type: Boolean,
        default: false
    },
    autosaveInterval: {
        type: Number,
        default: 1500
    },
    recentPages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Block'
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('UserPrefs', UserPrefsSchema);
