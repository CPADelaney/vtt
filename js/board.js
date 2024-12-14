import { performAttack, performAoeAttack } from './combat.js';

export class Board {
    constructor(rows, cols, entityTokens, appInstance) {
        this.rows = rows;
        this.cols = cols;
        this.app = appInstance;
        this.app.entityTokens = entityTokens;

        this.gridEl = document.getElementById('grid');
        this.marqueeEl = document.getElementById('selection-marquee');
        this.contextMenu = document.getElementById('context-menu');
        this.contextDelete = document.getElementById('context-delete');

        // Add references for scroll container and map controls
        this.boardScrollContainer = document.getElementById('board-scroll-container');
        this.mapControls = document.getElementById('map-controls');

        this.selectedEntities = [];
        this.isDraggingTokens = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.originalPositions = [];

        this.isMarqueeSelecting = false;
        this.marqueeStart = { x: 0, y: 0 };
        this.marqueeRect = { x: 0, y: 0, w: 0, h: 0 };

        this.draggedCharId = null;
        this.draggedMonsterId = null;

        this.contextMenuVisible = false;
        this.terrainEffects = {};

        // Cell dimensions
        this.cellWidth = 60;
        this.cellHeight = 60;

        // Zoom factor and bounds
        this.scaleFactor = 1;
        this.minScale = 0.2;
        this.maxScale = 3;

        this.gridEl.style.transformOrigin = 'top left';
        this.applyScale();

        // For snapping tokens directly to the hovered cell
        this.currentDragCell = null;
    }

    initialize() {
        this.buildGrid();
        this.setupEventListeners();
        this.centerViewOnGrid();
        this.redrawBoard();
    }

    zoomIn() {
        this.scaleFactor = Math.min(this.scaleFactor + 0.1, this.maxScale);
        this.applyScale();
    }

    zoomOut() {
        this.scaleFactor = Math.max(this.scaleFactor - 0.1, this.minScale);
        this.applyScale();
    }

    applyScale() {
        this.gridEl.style.transform = `translate(-50%, -50%) scale(${this.scaleFactor})`;
    }

    handleWheelZoom(e) {
        if (!this.boardScrollContainer) return;

        e.preventDefault();

        const rect = this.gridEl.getBoundingClientRect();
        const offsetX = (e.clientX - rect.left) / this.scaleFactor;
        const offsetY = (e.clientY - rect.top) / this.scaleFactor;

        const zoomAmount = -e.deltaY * 0.001;
        this.scaleFactor = Math.min(Math.max(this.scaleFactor + zoomAmount, this.minScale), this.maxScale);

        this.applyScale();

        const newRect = this.gridEl.getBoundingClientRect();
        const newOffsetX = offsetX * this.scaleFactor;
        const newOffsetY = offsetY * this.scaleFactor;

        const dx = (newOffsetX - (e.clientX - newRect.left));
        const dy = (newOffsetY - (e.clientY - newRect.top));

        this.boardScrollContainer.scrollLeft = Math.max(
            0,
            Math.min(this.boardScrollContainer.scrollLeft + dx, this.gridEl.scrollWidth)
        );
        this.boardScrollContainer.scrollTop = Math.max(
            0,
            Math.min(this.boardScrollContainer.scrollTop + dy, this.gridEl.scrollHeight)
        );
    }

    resizeGrid(newRows, newCols) {
        if (!this.app.isDM()) {
            console.warn("Only DM can resize the grid.");
            return;
        }
        this.gridEl.innerHTML = '';
        this.rows = newRows;
        this.cols = newCols;
        this.buildGrid();
        this.centerViewOnGrid();
        this.redrawBoard();
    }

    buildGrid() {
        this.gridEl.innerHTML = ''; // Clear existing grid
        for (let r = 0; r < this.rows; r++) {
            const rowEl = document.createElement('tr');
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('td');
                cell.dataset.row = r;
                cell.dataset.col = c;

                cell.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = 'move';
                });

                cell.addEventListener('drop', (ev) => this.handleDrop(ev, r, c));

                rowEl.appendChild(cell);
            }
            this.gridEl.appendChild(rowEl);
        }

        this.gridEl.style.width = (this.cols * this.cellWidth) + 'px';
        this.gridEl.style.height = (this.rows * this.cellHeight) + 'px';
    }

    centerViewOnGrid() {
        if (!this.boardScrollContainer) return;
        const scrollW = this.boardScrollContainer.clientWidth;
        const scrollH = this.boardScrollContainer.clientHeight;
        const gridW = this.cols * this.cellWidth * this.scaleFactor;
        const gridH = this.rows * this.cellHeight * this.scaleFactor;
        this.boardScrollContainer.scrollLeft = (gridW - scrollW) / 2;
        this.boardScrollContainer.scrollTop = (gridH - scrollH) / 2;
    }

    setupEventListeners() {
        let isRightClickPanning = false;
        let startX, startY;

        this.gridEl.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right-click
                isRightClickPanning = true;
                startX = e.clientX;
                startY = e.clientY;
                this.gridEl.style.outline = '2px dashed rgba(255, 255, 255, 0.5)';
                this.boardScrollContainer.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent context menu
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isRightClickPanning) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                this.boardScrollContainer.scrollLeft -= dx;
                this.boardScrollContainer.scrollTop -= dy;

                startX = e.clientX;
                startY = e.clientY;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                isRightClickPanning = false;
                this.gridEl.style.outline = 'none';
                this.boardScrollContainer.style.cursor = 'default';
            }
        });

        this.gridEl.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Disable context menu on right-click
        });

        this.boardScrollContainer.addEventListener('wheel', (e) => this.handleWheelZoom(e), { passive: false });
    }

    handleMouseMove(e) {
        // Add crosshair cursor feedback during marquee selection
        if (this.isMarqueeSelecting) {
            this.gridEl.style.cursor = 'crosshair';
        } else {
            this.gridEl.style.cursor = 'default';
        }
        const rect = this.gridEl.getBoundingClientRect();

        // AoE logic
        if (this.app.currentAction && this.app.currentAction.type === 'aoe') {
            const gx = (e.clientX - rect.left) / this.scaleFactor;
            const gy = (e.clientY - rect.top) / this.scaleFactor;
            const c = Math.floor(gx / this.cellWidth);
            const r = Math.floor(gy / this.cellHeight);
            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                this.clearHighlights();
                const aoePositions = this.getAoEAreaPositions(
                    this.app.currentAction.aoeShape,
                    { row: r, col: c },
                    this.app.currentAction.radius
                );
                this.highlightTiles(aoePositions, 'target-highlight');
            }
        }

        // Token dragging logic
        if (this.isDraggingTokens && this.selectedEntities.length > 0) {
            this.clearDragHighlights();
            const gx = (e.clientX - rect.left) / this.scaleFactor;
            const gy = (e.clientY - rect.top) / this.scaleFactor;
            const c = Math.floor(gx / this.cellWidth);
            const r = Math.floor(gy / this.cellHeight);

            if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
              const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
              if (cell) cell.style.outline = '2px dashed green';
              this.currentDragCell = { row: r, col: c };
            } else {
               this.currentDragCell = null;
           }
        }

        // Marquee selection logic
        if (this.isMarqueeSelecting) {
            let currentX = (e.clientX - rect.left) / this.scaleFactor;
            let currentY = (e.clientY - rect.top) / this.scaleFactor;

            currentX = Math.max(0, Math.min(currentX, this.cols * this.cellWidth));
            currentY = Math.max(0, Math.min(currentY, this.rows * this.cellHeight));

            const x1 = Math.min(currentX, this.marqueeStart.x);
            const y1 = Math.min(currentY, this.marqueeStart.y);
            const x2 = Math.max(currentX, this.marqueeStart.x);
            const y2 = Math.max(currentY, this.marqueeStart.y);

            this.marqueeRect = {
                x: x1,
                y: y1,
                w: x2 - x1,
                h: y2 - y1
            };

            this.marqueeEl.style.left = `${x1}px`;
            this.marqueeEl.style.top = `${y1}px`;
            this.marqueeEl.style.width = `${this.marqueeRect.w}px`;
            this.marqueeEl.style.height = `${this.marqueeRect.h}px`;
        }
    }

    handleMouseUp(e) {
        if (this.isDraggingTokens) {
            this.isDraggingTokens = false;
            this.clearDragHighlights();

            // Move entities directly to the current drag cell if valid
            if (this.currentDragCell &&
                this.currentDragCell.row >= 0 && this.currentDragCell.row < this.rows &&
                this.currentDragCell.col >= 0 && this.currentDragCell.col < this.cols) {

                for (let ent of this.selectedEntities) {
                    this.app.moveEntity(ent.type, ent.id, this.currentDragCell.row, this.currentDragCell.col);
                }
            }

            this.currentDragCell = null;
        }

        if (this.isMarqueeSelecting) {
            this.isMarqueeSelecting = false;
            this.marqueeEl.style.display = 'none';
            this.selectedEntities = this.getEntitiesInMarquee();
            this.updateSelectionStyles();
        }
    }


    openEntitySheet(entity) {
        if (entity.type === 'character') {
            const ch = this.app.getCharacterById(entity.id);
            if (ch) {
                this.app.uiManager.openCharacterSheet(ch);
            }
        } else if (entity.type === 'monster') {
            const mon = this.app.getMonsterById(entity.id);
            if (mon) {
                this.app.uiManager.openMonsterSheet(mon);
            }
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        const cell = e.target.closest('td');
        if (!cell) {
            this.hideContextMenu();
            return;
        }

        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);
        const entity = this.app.entityTokens[`${r},${c}`];

        if (!entity) {
            this.hideContextMenu();
            return;
        }

        if (this.isEntitySelected(entity) && this.app.canControlEntity(entity)) {
            this.showContextMenu(e.pageX, e.pageY);
            const openSheetItem = document.getElementById('context-open-sheet');
            openSheetItem.style.display = 'block';
            openSheetItem.onclick = () => {
                this.hideContextMenu();
                this.openEntitySheet(entity);
            };
        } else {
            this.hideContextMenu();
        }
    }

    showContextMenu(x, y) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenuVisible = true;
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuVisible = false;
    }

    updateSelectionStyles() {
        const cells = this.gridEl.querySelectorAll('td');
        cells.forEach(cell => cell.classList.remove('selected'));

        for (let ent of this.selectedEntities) {
            const pos = this.getEntityPosition(ent.type, ent.id);
            if (pos) {
                const cell = this.gridEl.querySelector(`td[data-row='${pos.row}'][data-col='${pos.col}']`);
                if (cell) cell.classList.add('selected');
            }
        }
    }

    clearDragHighlights() {
        const cells = this.gridEl.querySelectorAll('td');
        cells.forEach(cell => cell.style.outline = '');
    }

    isEntitySelected(entity) {
        return this.selectedEntities.some(se => se.type === entity.type && se.id === entity.id);
    }

    getEntityPosition(type, id) {
        for (const key in this.app.entityTokens) {
            const ent = this.app.entityTokens[key];
            if (ent.type === type && ent.id === id) {
                const [r, c] = key.split(',').map(Number);
                return { row: r, col: c };
            }
        }
        return null;
    }

    getEntitiesInMarquee() {
        let selected = [];
        for (const key in this.app.entityTokens) {
            const [r, c] = key.split(',').map(Number);
            const cellX = c * this.cellWidth;
            const cellY = r * this.cellHeight;

            const isSelected =
                cellX < this.marqueeRect.x + this.marqueeRect.w &&
                cellX + this.cellWidth > this.marqueeRect.x &&
                cellY < this.marqueeRect.y + this.marqueeRect.h &&
                cellY + this.cellHeight > this.marqueeRect.y;

            if (isSelected) {
                selected.push({ type: this.app.entityTokens[key].type, id: this.app.entityTokens[key].id });
            }
        }
        return selected;
    }

    getPositionsInRange(startPos, range) {
        let positions = [];
        for (let rr = startPos.row - range; rr <= startPos.row + range; rr++) {
            for (let cc = startPos.col - range; cc <= startPos.col + range; cc++) {
                if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
                    positions.push({ row: rr, col: cc });
                }
            }
        }
        return positions;
    }

    getAoEAreaPositions(shape, centerPos, radius) {
        let positions = [];
        if (shape === 'circle') {
            for (let rr = centerPos.row - radius; rr <= centerPos.row + radius; rr++) {
                for (let cc = centerPos.col - radius; cc <= centerPos.col + radius; cc++) {
                    if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
                        const dx = rr - centerPos.row;
                        const dy = cc - centerPos.col;
                        if (dx * dx + dy * dy <= radius * radius) {
                            positions.push({ row: rr, col: cc });
                        }
                    }
                }
            }
        } else if (shape === 'cone') {
            for (let rr = centerPos.row - radius; rr <= centerPos.row; rr++) {
                for (let cc = centerPos.col - (radius - (centerPos.row - rr)); cc <= centerPos.col + (radius - (centerPos.row - rr)); cc++) {
                    if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
                        positions.push({ row: rr, col: cc });
                    }
                }
            }
        }
        return positions;
    }

    getEntitiesInPositions(positions) {
        let entities = [];
        for (let pos of positions) {
            const key = `${pos.row},${pos.col}`;
            if (this.app.entityTokens[key]) {
                entities.push(this.app.entityTokens[key]);
            }
        }
        return entities;
    }

    filterAoETargets(entities, actionData) {
        if (actionData.attackDef.conditions && actionData.attackDef.conditions.excludeAllies) {
            const attacker = actionData.attacker;
            return entities.filter(ent => {
                if (ent.type === 'character') {
                    const ch = this.app.getCharacterById(ent.id);
                    return ch && ch.owner !== attacker.owner;
                }
                return true;
            });
        }
        return entities;
    }

    highlightTiles(positions, highlightClass) {
        this.clearHighlights();
        positions.forEach(pos => {
            const cell = this.gridEl.querySelector(`td[data-row='${pos.row}'][data-col='${pos.col}']`);
            if (cell) cell.classList.add(highlightClass);
        });
    }

    clearHighlights() {
        const highlightedCells = this.gridEl.querySelectorAll('td.target-highlight');
        highlightedCells.forEach(cell => cell.classList.remove('target-highlight'));
    }

    isCellHighlighted(r, c) {
        const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
        return cell && cell.classList.contains('target-highlight');
    }
}
