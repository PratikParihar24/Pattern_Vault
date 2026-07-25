const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const Block = require('../models/Block');

const safeObjectId = (id) => (id && mongoose.Types.ObjectId.isValid(id) ? id : null);

// 1. GET ALL PAGES (Sidebar list / tree)
router.get('/pages', authMiddleware, async (req, res) => {
    try {
        const { group } = req.query;
        const query = {
            type: 'page',
            deleted: { $ne: true }
        };

        if (group && mongoose.Types.ObjectId.isValid(group)) {
            query.group = group;
        } else {
            query.user = req.user.id;
            query.group = null;
        }

        const pages = await Block.find(query).sort({ order: 1, updatedAt: -1 });
        res.json(pages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2. GET FAVORITE PAGES
router.get('/pages/favorites', authMiddleware, async (req, res) => {
    try {
        const favorites = await Block.find({
            user: req.user.id,
            type: 'page',
            deleted: { $ne: true },
            'properties.favorite': true
        }).sort({ order: 1 });
        res.json(favorites);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 3. GET TRASHED PAGES
router.get('/pages/trash', authMiddleware, async (req, res) => {
    try {
        const trashed = await Block.find({
            user: req.user.id,
            type: 'page',
            deleted: true
        }).sort({ deletedAt: -1 });
        res.json(trashed);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 4. GET ALL BLOCKS FOR A SPECIFIC PAGE
router.get('/page/:pageId', authMiddleware, async (req, res) => {
    try {
        const { pageId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(pageId)) {
            return res.json([]);
        }

        const pageBlock = await Block.findById(pageId);
        if (!pageBlock) {
            return res.json([]);
        }

        const query = {
            pageId: pageId,
            deleted: { $ne: true }
        };

        // If it's a private page (not a group page), isolate by user ID
        if (!pageBlock.group) {
            query.user = req.user.id;
        }

        const blocks = await Block.find(query).sort({ order: 1 });
        res.json(blocks);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 5. CREATE A SINGLE BLOCK (Page or Content Block)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            pageId,
            parentBlockId,
            type,
            content,
            properties,
            order,
            indent,
            group
        } = req.body;

        let finalGroup = safeObjectId(group);
        const validPageId = safeObjectId(pageId);

        if (!finalGroup && validPageId) {
            const parentBlock = await Block.findById(validPageId);
            if (parentBlock && parentBlock.group) {
                finalGroup = parentBlock.group;
            }
        }

        const newBlock = new Block({
            user: req.user.id,
            pageId: validPageId,
            parentBlockId: safeObjectId(parentBlockId),
            type: type || 'paragraph',
            content: content || '',
            properties: properties || undefined,
            order: typeof order === 'number' ? order : 1.0,
            indent: typeof indent === 'number' ? indent : 0,
            group: finalGroup
        });

        const savedBlock = await newBlock.save();
        res.json(savedBlock);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 6. BATCH UPDATE BLOCKS (For debounced autosave)
router.put('/batch/save', authMiddleware, async (req, res) => {
    try {
        const { blocks } = req.body;
        if (!Array.isArray(blocks)) {
            return res.status(400).json({ msg: 'Invalid blocks array' });
        }

        // Sort items so page blocks are saved first, enabling temp ID resolution for children
        const sortedBlocks = [...blocks].sort((a, b) => {
            if (a.type === 'page' && b.type !== 'page') return -1;
            if (a.type !== 'page' && b.type === 'page') return 1;
            return 0;
        });

        const tempIdMap = {};
        const updatedBlocks = [];

        for (const item of sortedBlocks) {
            if (!item._id) continue;

            const isTemp = typeof item._id === 'string' && item._id.startsWith('temp_');
            if (isTemp) {
                const resolvedPageId = tempIdMap[item.pageId] || safeObjectId(item.pageId);
                const resolvedParentBlockId = tempIdMap[item.parentBlockId] || safeObjectId(item.parentBlockId);
                let resolvedGroup = safeObjectId(item.group);

                if (!resolvedGroup && resolvedPageId) {
                    const parentBlock = await Block.findById(resolvedPageId);
                    if (parentBlock && parentBlock.group) {
                        resolvedGroup = parentBlock.group;
                    }
                }

                const newBlock = new Block({
                    user: req.user.id,
                    pageId: resolvedPageId,
                    parentBlockId: resolvedParentBlockId,
                    type: item.type || 'paragraph',
                    content: item.content || '',
                    properties: item.properties || undefined,
                    checked: Boolean(item.checked),
                    collapsed: Boolean(item.collapsed),
                    order: typeof item.order === 'number' ? item.order : 1.0,
                    indent: typeof item.indent === 'number' ? item.indent : 0,
                    group: resolvedGroup
                });
                const saved = await newBlock.save();
                tempIdMap[item._id] = saved._id;
                updatedBlocks.push(saved);
            } else if (mongoose.Types.ObjectId.isValid(item._id)) {
                const updateFields = {};
                if (item.content !== undefined) updateFields.content = item.content;
                if (item.properties !== undefined) updateFields.properties = item.properties;
                if (item.checked !== undefined) updateFields.checked = Boolean(item.checked);
                if (item.collapsed !== undefined) updateFields.collapsed = Boolean(item.collapsed);
                if (typeof item.order === 'number') updateFields.order = item.order;
                if (typeof item.indent === 'number') updateFields.indent = item.indent;
                if (item.group !== undefined) updateFields.group = safeObjectId(item.group);

                try {
                    const updated = await Block.findOneAndUpdate(
                        { _id: item._id },
                        {
                            $set: updateFields,
                            $inc: { version: 1 }
                        },
                        { new: true }
                    );
                    if (updated) updatedBlocks.push(updated);
                } catch (castErr) {
                    console.warn(`[Batch Save] Skipped invalid block ID: ${item._id}`);
                }
            }
        }

        res.json({ msg: 'Batch saved successfully', count: updatedBlocks.length, blocks: updatedBlocks });
    } catch (err) {
        console.error("[Batch Save Error]", err);
        res.status(500).send('Server Error');
    }
});

// 7. BATCH REORDER BLOCKS
router.put('/reorder/batch', authMiddleware, async (req, res) => {
    try {
        const { items } = req.body; // Array of { _id, order, parentBlockId }
        if (!Array.isArray(items)) return res.status(400).json({ msg: 'Invalid items array' });

        const operations = items.filter(item => mongoose.Types.ObjectId.isValid(item._id)).map(item => ({
            updateOne: {
                filter: { _id: item._id, user: req.user.id },
                update: {
                    $set: {
                        order: item.order,
                        parentBlockId: safeObjectId(item.parentBlockId)
                    },
                    $inc: { version: 1 }
                }
            }
        }));

        if (operations.length > 0) {
            await Block.bulkWrite(operations);
        }
        res.json({ msg: 'Reorder complete' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 8. EMPTY TRASH
router.delete('/trash/empty', authMiddleware, async (req, res) => {
    try {
        const result = await Block.deleteMany({ user: req.user.id, deleted: true });
        res.json({ msg: 'Trash emptied', deletedCount: result.deletedCount });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 9. UPDATE A SINGLE BLOCK
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const { content, properties, checked, collapsed, order, indent, version } = req.body;

        const updateData = {};
        if (content !== undefined) updateData.content = content;
        if (properties !== undefined) updateData.properties = properties;
        if (checked !== undefined) updateData.checked = checked;
        if (collapsed !== undefined) updateData.collapsed = collapsed;
        if (order !== undefined) updateData.order = order;
        if (indent !== undefined) updateData.indent = indent;

        let query = { _id: req.params.id, user: req.user.id };
        if (typeof version === 'number') {
            query.version = version;
        }

        const block = await Block.findOneAndUpdate(
            query,
            {
                $set: updateData,
                $inc: { version: 1 }
            },
            { new: true }
        );

        if (!block) {
            const existing = await Block.findById(req.params.id);
            if (!existing) return res.status(404).json({ msg: 'Block not found' });
            return res.status(409).json({ msg: 'Sync conflict: Block was modified elsewhere.' });
        }

        res.json(block);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Helper function for recursive soft deletion (Trash)
async function trashBlockRecursive(blockId, now) {
    await Block.updateOne({ _id: blockId }, { $set: { deleted: true, deletedAt: now } });
    const childBlocks = await Block.find({ pageId: blockId });
    if (childBlocks.length > 0) {
        await Block.updateMany({ pageId: blockId }, { $set: { deleted: true, deletedAt: now } });
        for (const child of childBlocks) {
            if (child.type === 'page') {
                await trashBlockRecursive(child._id, now);
            }
        }
    }
}

// Helper function for recursive hard deletion
async function hardDeleteBlockRecursive(blockId) {
    await Block.deleteOne({ _id: blockId });
    const childBlocks = await Block.find({ pageId: blockId });
    if (childBlocks.length > 0) {
        await Block.deleteMany({ pageId: blockId });
        for (const child of childBlocks) {
            if (child.type === 'page') {
                await hardDeleteBlockRecursive(child._id);
            }
        }
    }
}

// 9. SOFT DELETE A BLOCK (Move to Trash)
router.put('/:id/trash', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const block = await Block.findById(req.params.id);
        if (!block) return res.status(404).json({ msg: 'Block not found' });
        if (!block.group && block.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const now = new Date();
        await trashBlockRecursive(block._id, now);

        res.json({ msg: 'Moved to trash', id: block._id });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 10. RESTORE FROM TRASH
router.put('/:id/restore', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const block = await Block.findById(req.params.id);
        if (!block) return res.status(404).json({ msg: 'Block not found' });
        if (!block.group && block.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        block.deleted = false;
        block.deletedAt = null;
        await block.save();

        if (block.type === 'page') {
            await Block.updateMany(
                { pageId: block._id },
                { $set: { deleted: false, deletedAt: null } }
            );
        }

        res.json({ msg: 'Restored from trash', id: block._id });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 11. HARD DELETE (PERMANENT)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const block = await Block.findById(req.params.id);
        if (!block) return res.status(404).json({ msg: 'Block not found' });
        if (!block.group && block.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        await hardDeleteBlockRecursive(block._id);

        res.json({ msg: 'Permanently deleted', id: req.params.id });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 12. DUPLICATE A PAGE
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const originalPage = await Block.findOne({ _id: req.params.id, type: 'page' });
        if (!originalPage) return res.status(404).json({ msg: 'Page not found' });
        if (!originalPage.group && originalPage.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const newPage = new Block({
            user: req.user.id,
            pageId: originalPage.pageId,
            parentBlockId: originalPage.parentBlockId,
            type: 'page',
            content: `${originalPage.content} (Copy)`,
            properties: { ...originalPage.properties },
            order: originalPage.order + 0.1,
            group: originalPage.group
        });
        const savedNewPage = await newPage.save();

        // Copy child blocks
        const childBlocks = await Block.find({ pageId: originalPage._id, deleted: false });
        const newChildBlocks = childBlocks.map(b => ({
            user: req.user.id,
            pageId: savedNewPage._id,
            parentBlockId: b.parentBlockId,
            type: b.type,
            content: b.content,
            properties: b.properties,
            checked: b.checked,
            collapsed: b.collapsed,
            order: b.order,
            indent: b.indent,
            group: b.group
        }));

        if (newChildBlocks.length > 0) {
            await Block.insertMany(newChildBlocks);
        }

        res.json(savedNewPage);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 13. MOVE A PAGE (Reparent)
router.put('/:id/move', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid block ID' });
        }
        const { targetPageId } = req.body; // New parent page ID or null
        const page = await Block.findOne({ _id: req.params.id, user: req.user.id, type: 'page' });
        if (!page) return res.status(404).json({ msg: 'Page not found' });

        page.pageId = targetPageId || null;
        await page.save();

        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
