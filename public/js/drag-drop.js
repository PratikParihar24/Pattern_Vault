// public/js/drag-drop.js

const DragDropManager = {
    draggedEl: null,
    dropIndicator: null,

    init: function (containerEl, onReorderCallback) {
        if (!containerEl) return;

        if (!this.dropIndicator) {
            const ind = document.createElement('div');
            ind.className = 've-drop-indicator hidden';
            document.body.appendChild(ind);
            this.dropIndicator = ind;
        }

        // HTML5 DragStart
        containerEl.addEventListener('dragstart', (e) => {
            const handle = e.target.closest('.ve-drag-handle');
            const blockEl = e.target.closest('.ve-block');
            if (!blockEl) return;

            this.draggedEl = blockEl;
            blockEl.classList.add('ve-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', blockEl.dataset.id);
            }
        });

        // HTML5 DragOver
        containerEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.draggedEl) return;

            const targetBlock = e.target.closest('.ve-block');
            if (targetBlock && targetBlock !== this.draggedEl) {
                const rect = targetBlock.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                this.dropIndicator.style.width = `${rect.width}px`;
                this.dropIndicator.style.left = `${rect.left}px`;
                if (e.clientY < midY) {
                    this.dropIndicator.style.top = `${rect.top}px`;
                    this.dropIndicator.dataset.position = 'before';
                    this.dropIndicator.dataset.targetId = targetBlock.dataset.id;
                } else {
                    this.dropIndicator.style.top = `${rect.bottom}px`;
                    this.dropIndicator.dataset.position = 'after';
                    this.dropIndicator.dataset.targetId = targetBlock.dataset.id;
                }
                this.dropIndicator.classList.remove('hidden');
            }
        });

        // HTML5 Drop & DragEnd
        const handleDropEnd = (e) => {
            if (!this.dropIndicator.classList.contains('hidden') && this.draggedEl) {
                const pos = this.dropIndicator.dataset.position;
                const targetId = this.dropIndicator.dataset.targetId;
                const targetEl = containerEl.querySelector(`[data-id="${targetId}"]`);

                if (targetEl && this.draggedEl && targetEl !== this.draggedEl) {
                    if (pos === 'before') {
                        containerEl.insertBefore(this.draggedEl, targetEl);
                    } else {
                        containerEl.insertBefore(this.draggedEl, targetEl.nextSibling);
                    }

                    if (typeof onReorderCallback === 'function') {
                        onReorderCallback();
                    }
                }
            }

            if (this.draggedEl) {
                this.draggedEl.classList.remove('ve-dragging');
                this.draggedEl = null;
            }
            this.dropIndicator.classList.add('hidden');
        };

        containerEl.addEventListener('drop', (e) => {
            e.preventDefault();
            handleDropEnd(e);
        });

        containerEl.addEventListener('dragend', handleDropEnd);
    }
};

window.DragDropManager = DragDropManager;
