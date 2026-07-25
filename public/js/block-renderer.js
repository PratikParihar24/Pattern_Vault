// public/js/block-renderer.js

const BlockRenderer = {
    render: function (block, decryptedContent) {
        const el = document.createElement('div');
        el.className = `ve-block ve-block-${block.type || 'paragraph'}`;
        el.dataset.id = block._id;
        el.dataset.type = block.type || 'paragraph';
        el.dataset.order = block.order || 1.0;
        el.dataset.indent = block.indent || 0;

        if (block.indent) {
            el.style.marginLeft = `${block.indent * 24}px`;
        }

        const text = decryptedContent !== undefined ? decryptedContent : (block.rawContent || block.content || '');

        let innerHTML = '';
        switch (block.type) {
            case 'page':
                innerHTML = `
                    <div class="ve-page-link-card" style="display:flex; align-items:center; gap:8px; background:#181818; padding:8px 12px; border-radius:6px; border:1px solid #2a2a2a; width:100%; cursor:pointer;">
                        <span>📄</span>
                        <div class="ve-content ve-page-link-title" contenteditable="true" placeholder="Untitled Sub-page">${text}</div>
                        <span class="ve-page-nav-arrow" style="margin-left:auto; color:#00e5ff; font-size:0.9rem;">↗</span>
                    </div>
                `;
                break;
            case 'heading1':
                innerHTML = `<div class="ve-content ve-h1" contenteditable="true" placeholder="Heading 1">${text}</div>`;
                break;
            case 'heading2':
                innerHTML = `<div class="ve-content ve-h2" contenteditable="true" placeholder="Heading 2">${text}</div>`;
                break;
            case 'heading3':
                innerHTML = `<div class="ve-content ve-h3" contenteditable="true" placeholder="Heading 3">${text}</div>`;
                break;
            case 'todo':
                const checked = block.checked ? 'checked' : '';
                innerHTML = `
                    <label class="ve-todo-box">
                        <input type="checkbox" class="ve-todo-checkbox" ${checked}>
                        <span class="ve-todo-checkmark"></span>
                    </label>
                    <div class="ve-content ve-todo-text ${checked ? 've-completed' : ''}" contenteditable="true" placeholder="To-do">${text}</div>
                `;
                break;
            case 'bullet':
                innerHTML = `
                    <span class="ve-bullet-dot">•</span>
                    <div class="ve-content" contenteditable="true" placeholder="List item">${text}</div>
                `;
                break;
            case 'quote':
                innerHTML = `<div class="ve-content ve-quote" contenteditable="true" placeholder="Empty quote">${text}</div>`;
                break;
            case 'code':
                innerHTML = `<pre class="ve-code-pre"><code class="ve-content" contenteditable="true" placeholder="// Code here">${text}</code></pre>`;
                break;
            case 'divider':
                innerHTML = `<div class="ve-divider-line"><hr></div>`;
                break;
            case 'toggle':
                const collapsed = block.collapsed ? 'collapsed' : '';
                innerHTML = `
                    <button class="ve-toggle-arrow ${collapsed}">▶</button>
                    <div class="ve-content ve-toggle-title" contenteditable="true" placeholder="Toggle header">${text}</div>
                `;
                break;
            case 'paragraph':
            default:
                innerHTML = `<div class="ve-content" contenteditable="true" placeholder="Type '/' for commands...">${text}</div>`;
                break;
        }

        const handleHTML = `<div class="ve-drag-handle" draggable="true" title="Drag to reorder / Click for menu">⋮⋮</div>`;
        el.innerHTML = handleHTML + innerHTML;

        // Setup todo checkbox toggle event
        const checkbox = el.querySelector('.ve-todo-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const textEl = el.querySelector('.ve-todo-text');
                if (e.target.checked) {
                    textEl.classList.add('ve-completed');
                } else {
                    textEl.classList.remove('ve-completed');
                }
                block.checked = e.target.checked;
                block.isDirty = true;
                BlockStore.saveBlock(block);
                SyncEngine.scheduleAutosave();
            });
        }

        // Setup toggle collapse event
        const toggleBtn = el.querySelector('.ve-toggle-arrow');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                toggleBtn.classList.toggle('collapsed');
                block.collapsed = toggleBtn.classList.contains('collapsed');
                block.isDirty = true;
                BlockStore.saveBlock(block);
                SyncEngine.scheduleAutosave();
            });
        }

        // Setup sub-page link navigation click event
        const navArrow = el.querySelector('.ve-page-nav-arrow');
        if (navArrow) {
            navArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof loadPageIntoEditor === 'function') {
                    loadPageIntoEditor(block);
                }
            });
        }

        return el;
    }
};

window.BlockRenderer = BlockRenderer;
