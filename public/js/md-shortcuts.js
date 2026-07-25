// public/js/md-shortcuts.js

const MarkdownShortcuts = {
    // Check if the current line starts with a markdown shortcut pattern when Space is pressed
    checkShortcut: function (text) {
        if (!text) return null;

        if (text === '#') return 'heading1';
        if (text === '##') return 'heading2';
        if (text === '###') return 'heading3';
        if (text === '-' || text === '*') return 'bullet';
        if (text === '[]' || text === '- []' || text === '[ ]') return 'todo';
        if (text === '>') return 'quote';
        if (text === '```') return 'code';
        if (text === '---') return 'divider';

        return null;
    }
};

window.MarkdownShortcuts = MarkdownShortcuts;
