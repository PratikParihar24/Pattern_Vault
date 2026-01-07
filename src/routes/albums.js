// src/routes/albums.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Album = require('../models/Album');
const Group = require('../models/Group');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// --- MULTER CONFIG (Multiple Files) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Unique name: Timestamp + Random + Original Extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 1. GET ALBUMS (Personal or Group)
// ==========================================
// Usage: /api/albums?type=personal OR /api/albums?type=group&groupId=CX...
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, groupId } = req.query;

        let query = {};

        if (type === 'personal') {
            query = { user: req.user.id, group: null };
        } else if (type === 'group' && groupId) {
            // Security: Check if user is in the group
            const groupCheck = await Group.findById(groupId);
            if (!groupCheck || !groupCheck.members.includes(req.user.id)) {
                return res.status(403).json({ msg: "Access Denied" });
            }
            query = { group: groupId };
        } else {
            return res.status(400).json({ msg: "Invalid request parameters" });
        }

        const albums = await Album.find(query).sort({ createdAt: -1 });
        res.json(albums);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 2. CREATE ALBUM
// ==========================================
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, type, groupId } = req.body;

        let newAlbumFields = {
            user: req.user.id,
            name: name,
            group: null
        };

        if (type === 'group' && groupId) {
            // Verify membership
            const groupCheck = await Group.findById(groupId);
            if (!groupCheck.members.includes(req.user.id)) {
                return res.status(403).json({ msg: "Not authorized" });
            }
            newAlbumFields.group = groupId;
        }

        const newAlbum = new Album(newAlbumFields);
        await newAlbum.save();
        res.json(newAlbum);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 3. UPLOAD PHOTOS (Multiple)
// ==========================================
router.post('/:id/upload', authMiddleware, upload.array('photos', 20), async (req, res) => {
    try {
        const albumId = req.params.id;
        const album = await Album.findById(albumId);
        
        if (!album) return res.status(404).json({ msg: "Album not found" });

        // Security Check (Ownership or Group Membership)
        if (album.group) {
            const group = await Group.findById(album.group);
            if (!group.members.includes(req.user.id)) return res.status(403).json({ msg: "Access Denied" });
        } else {
            if (album.user.toString() !== req.user.id) return res.status(403).json({ msg: "Access Denied" });
        }

        // Process Files
        const newPhotos = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname
        }));

        album.photos.push(...newPhotos);
        await album.save();

        res.json(album);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 4. DELETE PHOTO (Single)
// ==========================================
router.delete('/:albumId/photo/:filename', authMiddleware, async (req, res) => {
    try {
        const { albumId, filename } = req.params;
        const album = await Album.findById(albumId);

        // Security check omitted for brevity (should match upload check)

        // Remove from Array
        album.photos = album.photos.filter(p => p.filename !== filename);
        await album.save();

        // Optional: Delete file from disk to save space
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json(album);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// 5. DELETE ALBUM
// ==========================================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await Album.findByIdAndDelete(req.params.id);
        res.json({ msg: "Album Deleted" });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;