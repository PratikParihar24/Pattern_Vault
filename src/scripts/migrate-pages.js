const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Page = require('../models/Page');
const Block = require('../models/Block');

dotenv.config();

const runMigration = async () => {
    const isDryRun = process.argv.includes('--dry-run');

    console.log(`==========================================`);
    console.log(` Starting Page -> Block Migration`);
    console.log(` Mode: ${isDryRun ? '🔍 DRY RUN (No DB mutations)' : '🚀 LIVE MIGRATION'}`);
    console.log(`==========================================\n`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.\n");

        const legacyPages = await Page.find({});
        console.log(`Found ${legacyPages.length} legacy page(s) to convert.\n`);

        let convertedCount = 0;

        for (const legacyPage of legacyPages) {
            console.log(`------------------------------------------`);
            console.log(`Processing Legacy Page ID: ${legacyPage._id}`);
            console.log(`Title (Encrypted): ${legacyPage.title}`);
            console.log(`User ID: ${legacyPage.user}`);
            console.log(`Group ID: ${legacyPage.group || 'Personal'}`);

            // 1. Prepare Root Page Block
            const pageBlockData = {
                user: legacyPage.user,
                group: legacyPage.group || null,
                pageId: null,
                parentBlockId: null,
                type: 'page',
                content: legacyPage.title, // encrypted title
                properties: {
                    icon: '📄',
                    favorite: false,
                    locked: false
                },
                order: 1.0,
                updatedAt: legacyPage.lastEdited || Date.now()
            };

            console.log(` -> Created Page-type Block structure`);

            if (!isDryRun) {
                const savedPageBlock = await new Block(pageBlockData).save();

                // 2. Prepare Child Paragraph Block with raw legacy content
                if (legacyPage.content) {
                    const contentBlockData = {
                        user: legacyPage.user,
                        group: legacyPage.group || null,
                        pageId: savedPageBlock._id,
                        parentBlockId: null,
                        type: 'paragraph',
                        content: legacyPage.content, // encrypted content string
                        order: 1.0
                    };
                    await new Block(contentBlockData).save();
                    console.log(` -> Converted legacy content string into child paragraph Block`);
                }
            } else {
                console.log(` [DRY RUN] Would create Page Block + 1 Paragraph Block for content.`);
            }

            convertedCount++;
        }

        console.log(`\n==========================================`);
        console.log(` Migration Summary:`);
        console.log(` Successfully processed: ${convertedCount} pages`);
        console.log(` Mode: ${isDryRun ? 'DRY RUN COMPLETE (Zero records modified)' : 'LIVE MIGRATION COMPLETE'}`);
        console.log(`==========================================\n`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runMigration();
