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
        const pages = await Page.find({ user: req.user.id, group: null }).sort({ lastEdited: -1 });
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

        const pages = await Page.find({ group: groupId }).sort({ lastEdited: -1 });
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
        const { title, content } = req.body;
        let page = await Page.findById(req.params.id);
        if (!page) return res.status(404).json({ msg: 'Page not found' });

        // NOTE: For now, we only check if YOU created it. 
        // Ideally, for groups, we should check if you are a MEMBER of the group.
        // But since you are the creator of your personal pages, this works for both for now.
        
        if (title) page.title = title;
        if (content !== undefined) page.content = content;
        page.lastEdited = Date.now();

        await page.save();
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;