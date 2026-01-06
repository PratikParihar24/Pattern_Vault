const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // We will use this later for Group pages, keep it null for Personal
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled Page'
    },
    content: {
        type: String,
        default: ''
    },
    lastEdited: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Page', PageSchema);