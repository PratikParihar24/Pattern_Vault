const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const UserPrefs = require('../models/UserPrefs');

// 1. GET USER PREFERENCES
router.get('/', authMiddleware, async (req, res) => {
    try {
        let prefs = await UserPrefs.findOne({ user: req.user.id }).populate('recentPages', 'content properties type');
        if (!prefs) {
            prefs = new UserPrefs({ user: req.user.id });
            await prefs.save();
        }
        res.json(prefs);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2. UPDATE USER PREFERENCES
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { theme, defaultFont, sidebarCollapsed, autosaveInterval, recentPages } = req.body;

        const updateData = {};
        if (theme !== undefined) updateData.theme = theme;
        if (defaultFont !== undefined) updateData.defaultFont = defaultFont;
        if (sidebarCollapsed !== undefined) updateData.sidebarCollapsed = sidebarCollapsed;
        if (autosaveInterval !== undefined) updateData.autosaveInterval = autosaveInterval;
        if (Array.isArray(recentPages)) updateData.recentPages = recentPages.slice(0, 8); // max 8 items circular buffer

        const prefs = await UserPrefs.findOneAndUpdate(
            { user: req.user.id },
            { $set: updateData },
            { new: true, upsert: true }
        ).populate('recentPages', 'content properties type');

        res.json(prefs);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
