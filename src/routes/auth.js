// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware'); // <--- NEED THIS
const User = require('../models/User'); // <--- NEED THIS
const QwertyCipher = require('../../shared/qwerty-cipher');

// --- ROUTE 1: REGISTER (Sign Up) ---
router.post('/register', async (req, res) => {
    try {
        // 1. Destructure the data sent from frontend
        const { email, password, displayName } = req.body;

        // 2. Validate displayName
        if (!displayName || displayName.trim().length < 2) {
            return res.status(400).json({ msg: "Display name must be at least 2 characters" });
        }

        // 3. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: "User already exists" });

        // 4. Hash the password (The Meat Grinder)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Create and Save the User
        const newUser = new User({
            email,
            password: hashedPassword,
            displayName: displayName.trim()
        });

        await newUser.save();

        res.status(201).json({ msg: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTE 2: LOGIN (Email + Password only) ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User not found" });

        // 2. Check Password (Compare plain text vs Hash)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // 3. Create the JWT Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        // 4. Send back the token as an HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Also set a non-HttpOnly cookie for frontend UI logic
        res.cookie('isAuthenticated', 'true', {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NEW ROUTE: LOGOUT ---
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('isAuthenticated');
    res.json({ msg: 'Logged out' });
});

// --- ROUTE 3: VERIFY PATTERN (After Quiz) ---
// This is called AFTER login, when the user completes the quiz.
// The pattern (which quiz option positions A/B/C/D were clicked) is checked
// against the expected QWERTY cipher pattern derived from the user's email.
router.post('/verify-pattern', authMiddleware, async (req, res) => {
    try {
        const { pattern } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(400).json({ msg: "User not found" });

        if (!QwertyCipher.isValidPattern(pattern)) {
            return res.status(400).json({ msg: 'Pattern must contain exactly five A-D answers' });
        }

        const expectedPattern = QwertyCipher.getPattern(user.email);

        if (JSON.stringify(expectedPattern) === JSON.stringify(pattern)) {
            return res.json({ unlocked: true });
        } else {
            return res.json({ unlocked: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTE 4: GET CURRENT USER ---
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('groups');

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
