// public/js/export-engine.js

const ExportEngine = {
    exportPageAsMarkdown: async function (page, blocksArray, decryptedCache) {
        const title = (decryptedCache && decryptedCache[page._id]) || page.rawTitle || 'Untitled Page';
        let md = `# ${title}\n\n`;

        blocksArray.forEach(b => {
            const text = (decryptedCache && decryptedCache[b._id]) || b.rawContent || b.content || '';
            const indent = '  '.repeat(b.indent || 0);

            switch (b.type) {
                case 'heading1':
                    md += `# ${text}\n\n`;
                    break;
                case 'heading2':
                    md += `## ${text}\n\n`;
                    break;
                case 'heading3':
                    md += `### ${text}\n\n`;
                    break;
                case 'todo':
                    md += `${indent}- [${b.checked ? 'x' : ' '}] ${text}\n`;
                    break;
                case 'bullet':
                    md += `${indent}- ${text}\n`;
                    break;
                case 'quote':
                    md += `> ${text}\n\n`;
                    break;
                case 'code':
                    md += `\`\`\`\n${text}\n\`\`\`\n\n`;
                    break;
                case 'divider':
                    md += `---\n\n`;
                    break;
                case 'toggle':
                case 'paragraph':
                default:
                    md += `${indent}${text}\n\n`;
                    break;
            }
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.ExportEngine = ExportEngine;
