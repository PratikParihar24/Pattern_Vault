// src/routes/vault.js
const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// --- NEW IMPORTS ---
const multer = require('multer');
const path = require('path');

// --- 1. CONFIGURE MULTER (The Storage Engine) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save files to 'public/uploads'
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Rename file to avoid duplicates: "timestamp-originalName.jpg"
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- ROUTE 1: GET MY DATA ---
// URL: GET /api/vault/personal
// Protected by: authMiddleware
router.get('/personal', authMiddleware, async (req, res) => {
    try {
        // req.user.id comes from the middleware!
        // We find the user, but we DON'T return the password (-password)
        // NEW (With .populate):
        const user = await User.findById(req.user.id).select('-password')
        .populate('groups', 'name'); // <--- Fetch the 'name' of the groups too


        res.json({
            personal_notes: user.personal_notes,
            personal_photos: user.personal_photos,
            groups: user.groups
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 2: UPDATE MY NOTES ---
// URL: POST /api/vault/personal/update
router.post('/personal/update', authMiddleware, async (req, res) => {
    try {
        const { noteText } = req.body;

        // Find user and update ONLY the personal_notes field
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { personal_notes: noteText } },
            { new: true } // Return the updated version
        );

        res.json({ msg: "Saved", notes: user.personal_notes });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- 2. NEW ROUTE: UPLOAD PHOTO ---
// URL: POST /api/vault/upload
// Note: 'upload.single("photo")' expects the frontend to name the field "photo"
router.post('/upload', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "No file uploaded" });
        }

        // Get the filename (e.g., 173456-myphoto.jpg)
        const filename = req.file.filename;

        // Push this filename into the User's 'personal_photos' array
        await User.findByIdAndUpdate(
            req.user.id,
            { $push: { personal_photos: filename } }
        );

        res.json({ msg: "Uploaded", filename: filename });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;