// src/routes/leaderboard.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

// --- ROUTE 1: GET LEADERBOARD (Public) ---
// Returns top 50 users sorted by highScore
router.get('/', async (req, res) => {
    try {
        const users = await User.find({}, 'displayName highScore totalGamesPlayed createdAt')
            .sort({ highScore: -1 }) // Highest score first
            .limit(50);

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTE 2: GET MY RANK (Auth Required) ---
// Returns the authenticated user's rank position
router.get('/my-rank', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('displayName highScore totalGamesPlayed');
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Count how many users have a higher score
        const rank = await User.countDocuments({ highScore: { $gt: user.highScore } });

        res.json({
            rank: rank + 1, // 1-indexed rank
            displayName: user.displayName,
            highScore: user.highScore,
            totalGamesPlayed: user.totalGamesPlayed
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTE 3: SUBMIT SCORE (Auth Required) ---
// Updates highScore if new score is higher, always increments totalGamesPlayed
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { score } = req.body;

        if (score === undefined || isNaN(score)) {
            return res.status(400).json({ msg: 'Invalid score' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        let isNewHighScore = false;

        // Always increment games played
        user.totalGamesPlayed += 1;

        // Only update highScore if this score is better
        if (score > user.highScore) {
            user.highScore = score;
            isNewHighScore = true;
        }

        await user.save();

        // Return rank so frontend can show it in game-over screen
        const rank = await User.countDocuments({ highScore: { $gt: user.highScore } });

        res.json({
            msg: isNewHighScore ? 'New high score!' : 'Score submitted',
            isNewHighScore,
            highScore: user.highScore,
            totalGamesPlayed: user.totalGamesPlayed,
            rank: rank + 1
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
