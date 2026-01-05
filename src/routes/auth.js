// src/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- HELPER: The QWERTY Cipher Logic (Backend Side) ---
// We repeat this logic here to verify the user isn't lying.
const getPatternFromEmail = (email) => {
    // 1. Clean email (lowercase, remove non-letters, take first 5)
    const cleanStr = email.toLowerCase().replace(/[^a-z]/g, '').substring(0, 5);
    
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
        const { email, password } = req.body;

        // 2. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: "User already exists" });

        // 3. Hash the password (The Meat Grinder)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create and Save the User
        const newUser = new User({
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ msg: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTE 2: LOGIN (The Hybrid Check) ---
router.post('/login', async (req, res) => {
    try {
        const { email, password, pattern } = req.body;

        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "User not found" });

        // 2. Check Password (Compare plain text vs Hash)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // 3. SECURITY CHECK: Verify the QWERTY Pattern
        // We calculate what the pattern SHOULD be
        const expectedPattern = getPatternFromEmail(email);
        
        // We compare it with what the user clicked
        // (JSON.stringify is a quick way to compare two arrays)
        if (JSON.stringify(expectedPattern) !== JSON.stringify(pattern)) {
            // If they match password but fail pattern -> DENY ACCESS
            return res.status(403).json({ msg: "Security Pattern Failed" });
        }

        // 4. Create the Wristband (JWT Token)
        // We put the User's ID inside the token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        // 5. Send back the token and user info
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                // We send the pattern back so frontend knows what logic to use (optional)
                pattern: expectedPattern 
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;