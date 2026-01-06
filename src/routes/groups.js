// src/routes/groups.js
const router = require('express').Router();
const Group = require('../models/Group');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// --- NEW IMPORTS FOR PHOTOS ---
const multer = require('multer');
const path = require('path');

// --- MULTER CONFIG (Same as Vault) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image!'), false);
    }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });


// --- HELPER: Generate Random Code ---
// Creates a 6-character code like "X7K9P2"
const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// --- ROUTE 1: CREATE A GROUP ---
// URL: POST /api/groups/create
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body; // User sends: { "name": "Our Trip" }

        // 1. Generate a unique code
        let code = generateCode();
        
        // (Optional: In a huge app, we'd check if code exists, but for now 6 chars is safe)

        // 2. Create the Group in DB
        const newGroup = new Group({
            name: name,
            inviteCode: code,
            admin: req.user.id, // The person creating it is the Admin
            members: [req.user.id] // The creator is automatically the first member
        });

        const savedGroup = await newGroup.save();

        // 3. CRITICAL: Add this group ID to the User's list too
        // (We link it both ways)
        await User.findByIdAndUpdate(req.user.id, {
            $push: { groups: savedGroup._id }
        });

        res.json(savedGroup);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 2: JOIN A GROUP ---
// URL: POST /api/groups/join
router.post('/join', authMiddleware, async (req, res) => {
    try {
        const { inviteCode } = req.body; // User sends: { "inviteCode": "X7K9P2" }

        // 1. Find the group by the code
        const group = await Group.findOne({ inviteCode });
        if (!group) {
            return res.status(404).json({ msg: "Invalid Invite Code" });
        }

        // 2. Check if already a member
        // (We look if the 'members' array includes the User's ID)
        if (group.members.includes(req.user.id)) {
            return res.status(400).json({ msg: "You are already in this group" });
        }

        // 3. Add User to Group
        group.members.push(req.user.id);
        await group.save();

        // 4. Add Group to User
        await User.findByIdAndUpdate(req.user.id, {
            $push: { groups: group._id }
        });

        res.json({ msg: "Joined successfully", group: group });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 3: GET GROUP DATA ---
// URL: GET /api/groups/:id  (e.g., /api/groups/65a1b2...)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        
        // 1. Find the group
        const group = await Group.findById(req.params.id).populate('members', 'email'); // <--- LOOKUP THE EMAILS

        if (!group) {
            return res.status(404).json({ msg: "Group not found" });
        }

        // 2. SECURITY CHECK (UPDATED)
        // Since 'members' is now an array of Objects, we map it to IDs first
        const isMember = group.members.some(member => member._id.toString() === req.user.id);
        
        if (!isMember) {
            return res.status(403).json({ msg: "Access Denied. You are not a member." });
        }

        // 3. Return the data
        res.json(group);

    } catch (err) {
        console.error(err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: "Group not found" });
        }
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 4: UPDATE GROUP NOTES ---
// URL: POST /api/groups/:id/notes
router.post('/:id/notes', authMiddleware, async (req, res) => {
    try {
        const { noteText } = req.body;
        const groupId = req.params.id;

        // 1. Find Group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        // 2. SECURITY: Are you a member?
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        // 3. Update Notes
        group.shared_notes = noteText;
        await group.save();

        res.json({ msg: "Group notes updated", shared_notes: group.shared_notes });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 5: UPLOAD GROUP PHOTO ---
// URL: POST /api/groups/:id/photos
router.post('/:id/photos', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const groupId = req.params.id;

        if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

        // 1. Find Group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        // 2. SECURITY Check
        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        // 3. Add filename to shared_photos
        group.shared_photos.push(req.file.filename);
        await group.save();

        res.json({ msg: "Photo uploaded", filename: req.file.filename });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 6: LEAVE GROUP (Member Only) ---
// POST http://localhost:5000/api/groups/:id/leave
router.post('/:id/leave', authMiddleware, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        // 1. Remove Group ID from the User's "groups" array
        await User.findByIdAndUpdate(userId, {
            $pull: { groups: groupId }
        });

        // 2. Remove User ID from the Group's "members" array
        await Group.findByIdAndUpdate(groupId, {
            $pull: { members: userId }
        });

        res.json({ msg: "You have left the group." });

    } catch (err) {
        console.error("Leave Error:", err);
        res.status(500).send('Server Error');
    }
});

// --- ROUTE 7: DELETE GROUP (Admin Only) ---
// DELETE http://localhost:5000/api/groups/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ msg: "Group not found" });

        // 1. Security Check: Are you the Admin?
        // We convert to string because one is an Object (ObjectId) and one is a String
        if (group.admin.toString() !== userId) {
            return res.status(403).json({ msg: "Only the Admin can delete this group." });
        }

        // 2. Cleanup: Remove this group ID from ALL members' profiles
        await User.updateMany(
            { _id: { $in: group.members } }, // Find all users in this group
            { $pull: { groups: groupId } }   // Remove the group ID
        );

        // 3. Destroy the Group
        await Group.findByIdAndDelete(groupId);

        res.json({ msg: "Group deleted permanently." });

    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;