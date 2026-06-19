// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware'); // <--- NEED THIS
const User = require('../models/User'); // <--- NEED THIS

// --- HELPER: The QWERTY Cipher Logic (Backend Side) ---
// We repeat this logic here to verify the user isn't lying.
const getPatternFromEmail = (email) => {
    // 1. Clean email (lowercase, remove non-letters)
    let cleanStr = email.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanStr.length === 0) cleanStr = 'abcde'; // Fallback if no letters

    // 2. Pad to 5 characters by repeating if necessary
    while (cleanStr.length < 5) {
        cleanStr += cleanStr;
    }

    cleanStr = cleanStr.substring(0, 5);

    // 2. The Map (Same as frontend)
    const map = {
        'q': 'A', 'w': 'A', 'e': 'A', 'r': 'A', 't': 'A',
        'y': 'B', 'u': 'B', 'i': 'B', 'o': 'B', 'p': 'B',
        'a': 'C', 's': 'C', 'd': 'C', 'f': 'C', 'g': 'C', 'z': 'C', 'x': 'C', 'c': 'C', 'v': 'C',
        'h': 'D', 'j': 'D', 'k': 'D', 'l': 'D', 'b': 'D', 'n': 'D', 'm': 'D'
    };

    // 3. Convert
    return cleanStr.split('').map(char => map[char] || 'A');
};

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

        // 4. Send back the token
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        const expectedPattern = getPatternFromEmail(user.email);

        console.log('Email:', user.email);
        console.log('Expected pattern:', expectedPattern);
        console.log('Received pattern:', pattern);

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