const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block',
        default: null
    },
    parentBlockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block',
        default: null
    },
    type: {
        type: String,
        required: true,
        enum: [
            'page', 'paragraph', 'heading1', 'heading2', 'heading3',
            'todo', 'bullet', 'quote', 'code', 'divider', 'toggle'
        ],
        default: 'paragraph'
    },
    content: {
        type: String,
        default: ''
    },
    properties: {
        icon: { type: String, default: '📄' },
        cover: { type: String, default: null },
        favorite: { type: Boolean, default: false },
        locked: { type: Boolean, default: false },
        smallText: { type: Boolean, default: false },
        fullWidth: { type: Boolean, default: false }
    },
    checked: {
        type: Boolean,
        default: false
    },
    collapsed: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 1.0
    },
    indent: {
        type: Number,
        default: 0
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    version: {
        type: Number,
        default: 0
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    }
}, { timestamps: true });

// Compound indexes for optimized querying
BlockSchema.index({ user: 1, pageId: 1, order: 1 });
BlockSchema.index({ user: 1, type: 1, deleted: 1 });
BlockSchema.index({ user: 1, group: 1, type: 1 });
BlockSchema.index({ user: 1, deleted: 1, deletedAt: 1 });

module.exports = mongoose.model('Block', BlockSchema);
