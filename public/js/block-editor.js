// Helper: get exact character offset of cursor inside contenteditable
function getCaretOffset(element) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
}

// Helper: set exact character offset of cursor inside contenteditable
function setCaretPosition(element, offset) {
    element.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    let currentLen = 0;
    let nodeToSelect = element;
    let nodeOffset = 0;

    function walk(node) {
        if (node.nodeType === 3) {
            const len = node.nodeValue.length;
            if (currentLen + len >= offset) {
                nodeToSelect = node;
                nodeOffset = Math.max(0, offset - currentLen);
                return true;
            }
            currentLen += len;
        } else {
            for (let child of node.childNodes) {
                if (walk(child)) return true;
            }
        }
        return false;
    }

    if (element.childNodes.length > 0) {
        walk(element);
    }

    try {
        range.setStart(nodeToSelect, nodeOffset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } catch (e) {}
}

class BlockEditor {
    constructor(containerEl, pageId, page = null) {
        this.container = containerEl;
        this.pageId = pageId;
        this.page = page;
        this.blocks = [];
        this.decryptedMap = {}; // _id -> plain text
        this.activeBlockEl = null;
        this.undoStack = [];
        this.redoStack = [];
        this.isUndoRedoAction = false;

        this.init();
    }

    async init() {
        this.container.innerHTML = `<div class="ve-editor-loading">Loading page blocks...</div>`;
        const rawBlocks = await SyncEngine.fetchRemotePageBlocks(this.pageId);
        this.blocks = rawBlocks;

        const key = typeof getCryptoKey === 'function' ? await getCryptoKey() : null;

        // Decrypt all blocks
        for (const b of this.blocks) {
            if (key && b.content) {
                this.decryptedMap[b._id] = await CryptoHelper.decryptText(b.content, key);
            } else {
                this.decryptedMap[b._id] = b.content || '';
            }
        }

        this.renderAll();
        this.setupKeyListeners();
        DragDropManager.init(this.container, () => this.handleReorder());
    }

    pushUndoSnapshot() {
        if (this.isUndoRedoAction) return;
        const snapshot = {
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            decryptedMap: { ...this.decryptedMap }
        };
        this.undoStack.push(snapshot);
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
    }

    async undo() {
        if (this.undoStack.length === 0) return;
        this.isUndoRedoAction = true;

        const currentSnapshot = {
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            decryptedMap: { ...this.decryptedMap }
        };
        this.redoStack.push(currentSnapshot);

        const state = this.undoStack.pop();
        this.blocks = state.blocks;
        this.decryptedMap = state.decryptedMap;

        this.renderAll();
        for (const b of this.blocks) {
            b.isDirty = true;
            await BlockStore.saveBlock(b);
        }
        SyncEngine.scheduleAutosave();

        this.isUndoRedoAction = false;
    }

    async redo() {
        if (this.redoStack.length === 0) return;
        this.isUndoRedoAction = true;

        const currentSnapshot = {
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            decryptedMap: { ...this.decryptedMap }
        };
        this.undoStack.push(currentSnapshot);

        const state = this.redoStack.pop();
        this.blocks = state.blocks;
        this.decryptedMap = state.decryptedMap;

        this.renderAll();
        for (const b of this.blocks) {
            b.isDirty = true;
            await BlockStore.saveBlock(b);
        }
        SyncEngine.scheduleAutosave();

        this.isUndoRedoAction = false;
    }

    renderAll() {
        this.container.innerHTML = '';
        if (this.blocks.length === 0) {
            // Create default initial paragraph block
            this.createNewBlock('paragraph', null, '');
            return;
        }

        this.blocks.forEach(b => {
            const el = BlockRenderer.render(b, this.decryptedMap[b._id]);
            this.container.appendChild(el);
        });
    }

    setupKeyListeners() {
        // Global document Undo/Redo listener (Notion style: works even when not focused on a specific contenteditable line)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                // If focus is inside a plain input/textarea outside editor, allow default browser undo
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.classList.contains('ve-content')) {
                    return;
                }
                e.preventDefault();
                this.undo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.classList.contains('ve-content')) {
                    return;
                }
                e.preventDefault();
                this.redo();
                return;
            }
        });

        this.container.addEventListener('keydown', (e) => {
            const contentEl = e.target.closest('.ve-content');
            if (!contentEl) return;

            const blockEl = contentEl.closest('.ve-block');
            const blockId = blockEl.dataset.id;
            const block = this.blocks.find(b => b._id === blockId);

            // Multi-block Ctrl+A selection
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                const sel = window.getSelection();
                if (sel && sel.toString() === contentEl.innerText) {
                    e.preventDefault();
                    this.container.querySelectorAll('.ve-block').forEach(el => el.classList.add('ve-block-selected'));
                    return;
                }
            }

            // Mass deletion if multiple blocks selected
            if (e.key === 'Backspace' || e.key === 'Delete') {
                const selectedBlocks = Array.from(this.container.querySelectorAll('.ve-block-selected'));
                if (selectedBlocks.length > 0) {
                    e.preventDefault();
                    this.pushUndoSnapshot();
                    selectedBlocks.forEach(bEl => this.deleteBlock(bEl));
                    return;
                }
            } else {
                // Clear selection on other key presses
                this.container.querySelectorAll('.ve-block-selected').forEach(el => el.classList.remove('ve-block-selected'));
            }

            // Handle slash menu key navigation if open
            if (SlashMenu.handleKeyDown(e, this.getSlashQuery(contentEl))) {
                return;
            }

            // Slash command trigger
            if (e.key === '/') {
                setTimeout(() => {
                    const sel = window.getSelection();
                    if (sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        const x = rect.left !== 0 ? rect.left : contentEl.getBoundingClientRect().left;
                        const y = (rect.bottom !== 0 ? rect.bottom : contentEl.getBoundingClientRect().bottom) + 5;
                        SlashMenu.show(blockEl, x, y, '', (type) => {
                            this.pushUndoSnapshot();
                            if (type === 'page') {
                                const parentId = this.pageId;
                                const groupId = (this.page && this.page.group) ? this.page.group : (typeof currentContext !== 'undefined' && currentContext.type === 'group' ? currentContext.id : null);
                                if (typeof createNewBlockPage === 'function') {
                                    createNewBlockPage(parentId, groupId ? 'group' : 'personal', groupId);
                                }
                                return;
                            }

                            // Check text prior to slash command
                            const fullText = (this.decryptedMap[block._id] !== undefined ? this.decryptedMap[block._id] : contentEl.innerText) || '';
                            const cleanText = fullText.replace(/\/[a-zA-Z0-9]*$/, '').trim();

                            if (cleanText.length > 0) {
                                // Keep current block text without slash command and create a new block below with the selected type
                                this.decryptedMap[block._id] = cleanText;
                                block.rawContent = cleanText;
                                block.isDirty = true;
                                contentEl.innerText = cleanText;
                                BlockStore.saveBlock(block);

                                this.createNewBlock(type, blockEl, '');
                            } else {
                                this.changeBlockType(blockEl, type);
                            }
                        });
                    }
                }, 10);
            }

            // Space key for markdown shortcuts
            if (e.key === ' ' && block && block.type === 'paragraph') {
                const text = contentEl.innerText.trim();
                const shortcutType = MarkdownShortcuts.checkShortcut(text);
                if (shortcutType) {
                    e.preventDefault();
                    contentEl.innerText = '';
                    this.changeBlockType(blockEl, shortcutType);
                    return;
                }
            }

            // Enter key handling (Notion style)
            if (e.key === 'Enter') {
                if (block && block.type === 'code' && e.shiftKey) {
                    return;
                }

                if (!e.shiftKey) {
                    e.preventDefault();
                    this.pushUndoSnapshot();

                    const caretPos = getCaretOffset(contentEl);
                    const fullText = (this.decryptedMap[block._id] !== undefined ? this.decryptedMap[block._id] : contentEl.innerText) || '';

                    // Notion behavior: If on an empty list item (bullet/todo) and pressing Enter -> convert current block to paragraph
                    if ((block.type === 'bullet' || block.type === 'todo') && fullText.trim().length === 0) {
                        this.changeBlockType(blockEl, 'paragraph');
                        return;
                    }

                    // Notion behavior: If on Heading 1, 2, or 3, pressing Enter always creates a new empty paragraph block below without moving/splitting heading text
                    const isHeading = (block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3');
                    if (isHeading && caretPos >= fullText.length) {
                        this.createNewBlock('paragraph', blockEl, '');
                        return;
                    }

                    const textBefore = fullText.slice(0, caretPos);
                    const textAfter = fullText.slice(caretPos);

                    this.decryptedMap[block._id] = textBefore;
                    block.rawContent = textBefore;
                    block.isDirty = true;
                    contentEl.innerText = textBefore;
                    BlockStore.saveBlock(block);

                    // Maintain list type for bullet/todo/quote when splitting non-empty list item
                    const listTypes = ['bullet', 'todo', 'quote'];
                    const nextType = listTypes.includes(block.type) ? block.type : 'paragraph';
                    this.createNewBlock(nextType, blockEl, textAfter);
                    return;
                }
            }

            // Backspace key handling (Notion style: erase empty lines and shift content upwards)
            if (e.key === 'Backspace') {
                const caretPos = getCaretOffset(contentEl);
                if (caretPos === 0) {
                    // If block is a list/heading/quote/code and has text or non-paragraph formatting, convert to normal paragraph first
                    if (block && block.type !== 'paragraph' && contentEl.innerText.trim().length > 0) {
                        e.preventDefault();
                        this.pushUndoSnapshot();
                        this.changeBlockType(blockEl, 'paragraph');
                        return;
                    }

                    const prevEl = blockEl.previousElementSibling;
                    if (prevEl) {
                        e.preventDefault();
                        this.pushUndoSnapshot();

                        const prevContentEl = prevEl.querySelector('.ve-content');
                        const prevBlockId = prevEl.dataset.id;
                        const prevBlock = this.blocks.find(b => b._id === prevBlockId);

                        const currentText = this.decryptedMap[block._id] !== undefined ? this.decryptedMap[block._id] : contentEl.innerText;
                        const prevText = prevBlock ? (this.decryptedMap[prevBlockId] !== undefined ? this.decryptedMap[prevBlockId] : (prevContentEl ? prevContentEl.innerText : '')) : '';

                        const mergeOffset = prevText.length;
                        const combinedText = prevText + currentText;

                        if (prevBlock) {
                            this.decryptedMap[prevBlockId] = combinedText;
                            prevBlock.rawContent = combinedText;
                            prevBlock.isDirty = true;
                            if (prevContentEl) prevContentEl.innerText = combinedText;
                            BlockStore.saveBlock(prevBlock);
                        }

                        this.blocks = this.blocks.filter(b => b._id !== block._id);
                        delete this.decryptedMap[block._id];
                        blockEl.remove();

                        if (!block._id.startsWith('temp_')) {
                            fetch(`/api/blocks/${block._id}/trash`, { method: 'PUT', credentials: 'include' });
                        }

                        if (prevContentEl) {
                            setCaretPosition(prevContentEl, mergeOffset);
                        }
                        SyncEngine.scheduleAutosave();
                        return;
                    }
                }
            }

            // Tab / Shift+Tab for Indent / Outdent
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.adjustIndent(blockEl, -1);
                } else {
                    this.adjustIndent(blockEl, 1);
                }
                return;
            }

            // Arrow Up / Down for navigation
            if (e.key === 'ArrowUp') {
                const prev = blockEl.previousElementSibling;
                if (prev) {
                    const prevContent = prev.querySelector('.ve-content');
                    if (prevContent) prevContent.focus();
                }
            } else if (e.key === 'ArrowDown') {
                const next = blockEl.nextElementSibling;
                if (next) {
                    const nextContent = next.querySelector('.ve-content');
                    if (nextContent) nextContent.focus();
                }
            }
        });

        // Input event for autosave triggering & live model update with debounced Undo snapshot
        let typingUndoTimer = null;
        this.container.addEventListener('input', (e) => {
            const contentEl = e.target.closest('.ve-content');
            if (!contentEl) return;

            const blockEl = contentEl.closest('.ve-block');
            const blockId = blockEl.dataset.id;
            const block = this.blocks.find(b => b._id === blockId);

            if (block) {
                if (!typingUndoTimer) {
                    this.pushUndoSnapshot();
                }
                clearTimeout(typingUndoTimer);
                typingUndoTimer = setTimeout(() => {
                    typingUndoTimer = null;
                }, 1200);

                const text = contentEl.innerText;
                this.decryptedMap[block._id] = text;
                block.rawContent = text;
                block.isDirty = true;
                BlockStore.saveBlock(block);
                SyncEngine.scheduleAutosave();
            }
        });
    }

    getSlashQuery(contentEl) {
        const text = contentEl.innerText;
        const slashIdx = text.lastIndexOf('/');
        return slashIdx !== -1 ? text.slice(slashIdx + 1) : '';
    }

    async createNewBlock(type = 'paragraph', afterBlockEl = null, initialText = '') {
        let order = 1.0;
        if (afterBlockEl) {
            const prevOrder = parseFloat(afterBlockEl.dataset.order || '1.0');
            const nextEl = afterBlockEl.nextElementSibling;
            if (nextEl) {
                const nextOrder = parseFloat(nextEl.dataset.order || '2.0');
                order = (prevOrder + nextOrder) / 2;
            } else {
                order = prevOrder + 1.0;
            }
        } else if (this.blocks.length > 0) {
            order = Math.max(...this.blocks.map(b => b.order || 1.0)) + 1.0;
        }

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const groupId = (this.page && this.page.group) ? this.page.group : (typeof currentContext !== 'undefined' && currentContext.type === 'group' ? currentContext.id : null);
        const newBlock = {
            _id: tempId,
            pageId: this.pageId,
            type: type,
            content: '',
            rawContent: initialText,
            order: order,
            indent: afterBlockEl ? parseInt(afterBlockEl.dataset.indent || '0') : 0,
            group: groupId,
            isDirty: true
        };

        this.blocks.push(newBlock);
        this.decryptedMap[tempId] = initialText;
        await BlockStore.saveBlock(newBlock);

        const el = BlockRenderer.render(newBlock, initialText);
        if (afterBlockEl && afterBlockEl.nextSibling) {
            this.container.insertBefore(el, afterBlockEl.nextSibling);
        } else {
            this.container.appendChild(el);
        }

        const contentEl = el.querySelector('.ve-content');
        if (contentEl) contentEl.focus();

        SyncEngine.scheduleAutosave(500);
    }

    async changeBlockType(blockEl, newType) {
        const blockId = blockEl.dataset.id;
        const block = this.blocks.find(b => b._id === blockId);
        if (!block) return;

        // Clean out slash command trigger text
        let cleanText = (this.decryptedMap[block._id] || '').replace(/\/[a-zA-Z0-9]*$/, '').trim();
        this.decryptedMap[block._id] = cleanText;
        block.rawContent = cleanText;
        block.type = newType;
        block.isDirty = true;
        await BlockStore.saveBlock(block);

        const newEl = BlockRenderer.render(block, cleanText);
        blockEl.replaceWith(newEl);

        const contentEl = newEl.querySelector('.ve-content');
        if (contentEl) {
            contentEl.focus();
            // Move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(contentEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        SyncEngine.scheduleAutosave();
    }

    async adjustIndent(blockEl, delta) {
        const blockId = blockEl.dataset.id;
        const block = this.blocks.find(b => b._id === blockId);
        if (!block) return;

        block.indent = Math.min(5, Math.max(0, (block.indent || 0) + delta));
        blockEl.style.marginLeft = `${block.indent * 24}px`;
        blockEl.dataset.indent = block.indent;

        block.isDirty = true;
        await BlockStore.saveBlock(block);
        SyncEngine.scheduleAutosave();
    }

    async deleteBlock(blockEl) {
        const blockId = blockEl.dataset.id;

        // If only 1 block remains, preserve it empty rather than deleting and spawning new lines
        if (this.container.children.length <= 1) {
            const block = this.blocks.find(b => b._id === blockId);
            if (block) {
                block.rawContent = '';
                block.isDirty = true;
                this.decryptedMap[blockId] = '';
                await BlockStore.saveBlock(block);
            }
            const content = blockEl.querySelector('.ve-content');
            if (content) {
                content.innerText = '';
                content.focus();
            }
            return;
        }

        const prevEl = blockEl.previousElementSibling;
        const nextEl = blockEl.nextElementSibling;

        this.blocks = this.blocks.filter(b => b._id !== blockId);
        delete this.decryptedMap[blockId];
        blockEl.remove();

        if (prevEl) {
            const content = prevEl.querySelector('.ve-content');
            if (content) content.focus();
        } else if (nextEl) {
            const content = nextEl.querySelector('.ve-content');
            if (content) content.focus();
        }

        // Issue remote soft delete if it's a persisted block
        if (!blockId.startsWith('temp_')) {
            fetch(`/api/blocks/${blockId}/trash`, { method: 'PUT', credentials: 'include' });
        }
    }

    async handleReorder() {
        const childNodes = Array.from(this.container.children);
        childNodes.forEach((el, index) => {
            const id = el.dataset.id;
            const block = this.blocks.find(b => b._id === id);
            if (block) {
                block.order = (index + 1) * 1.0;
                block.isDirty = true;
                el.dataset.order = block.order;
                BlockStore.saveBlock(block);
            }
        });

        SyncEngine.scheduleAutosave();
    }
}

window.BlockEditor = BlockEditor;
