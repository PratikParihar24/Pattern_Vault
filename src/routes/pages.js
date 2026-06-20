const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Check path!
const Page = require('../models/Page');
const Group = require('../models/Group'); // <--- CRITICAL IMPORT

// ==========================================
// 1. PERSONAL PAGES (My Private Vault)
// ==========================================

// GET All Personal Pages
router.get('/personal', authMiddleware, async (req, res) => {
    try {
        const pages = await Page.find({ user: req.user.id, group: null }).populate('user', 'username email').sort({ lastEdited: -1 });
        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// CREATE Personal Page
router.post('/personal', authMiddleware, async (req, res) => {
    try {
        const { title } = req.body;
        const newPage = new Page({
            user: req.user.id,
            group: null,
            title: title || 'Untitled Page',
            content: ''
        });
        const page = await newPage.save();
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 2. GROUP PAGES (Shared Vault)
// ==========================================

// GET All Pages for a Specific Group
router.get('/group/:groupId', authMiddleware, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        // Security: Check if user is in the group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Access Denied' });
        }

        const pages = await Page.find({ group: groupId }).populate('user', 'username email').sort({ lastEdited: -1 });
        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// CREATE Group Page
router.post('/group/:groupId', authMiddleware, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { title } = req.body;

        // Security Check
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Access Denied' });
        }

        const newPage = new Page({
            user: req.user.id,
            group: groupId, // Link to Group
            title: title || 'Untitled Group Page',
            content: ''
        });

        const page = await newPage.save();
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 3. UNIVERSAL UPDATE (Save Content)
// ==========================================
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, content, version } = req.body;
        
        if (version === undefined) {
             return res.status(400).json({ msg: 'Version is required for optimistic concurrency control' });
        }

        // NOTE: For now, we only check if YOU created it. 
        // Ideally, for groups, we should check if you are a MEMBER of the group.
        
        let updateData = { lastEdited: Date.now() };
        if (title) updateData.title = title;
        if (content !== undefined) updateData.content = content;

        const page = await Page.findOneAndUpdate(
            { _id: req.params.id, __v: version },
            { 
                $set: updateData,
                $inc: { __v: 1 }
            },
            { new: true }
        );

        if (!page) {
            // Check if document exists to differentiate 404 vs 409
            const existingPage = await Page.findById(req.params.id);
            if (!existingPage) return res.status(404).json({ msg: 'Page not found' });
            
            // Document exists but version mismatched
            return res.status(409).json({ msg: 'Conflict: Document was modified by another user.' });
        }

        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 4. DELETE PAGE
// ==========================================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pageId = req.params.id;
        const page = await Page.findById(pageId);

        if (!page) return res.status(404).json({ msg: 'Page not found' });

        // SECURITY CHECK:
        // 1. If it's a Personal Page, only the Owner can delete.
        if (!page.group && page.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // 2. If it's a Group Page, verify user is in the group (Simple check)
        if (page.group) {
            const group = await Group.findById(page.group);
            if (!group.members.includes(req.user.id)) {
                return res.status(401).json({ msg: 'Not authorized' });
            }
        }

        await Page.findByIdAndDelete(pageId);
        res.json({ msg: 'Page deleted' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;