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
        this.boardContent = document.getElementById('board-content'); // NEW: a large container div

        this.selectedEntities = [];
        this.isDraggingTokens = false;

        this.isMarqueeSelecting = false;

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

    applyScale() {
        this.cellWidth = Math.round(this.baseCellWidth * this.scaleFactor);
        this.cellHeight = Math.round(this.baseCellHeight * this.scaleFactor);

        // Update each cell's size
        const cells = this.gridEl.querySelectorAll('td');
        cells.forEach(cell => {
            cell.style.width = this.cellWidth + 'px';
            cell.style.height = this.cellHeight + 'px';
        });
    }

    zoomIn() {
        this.scaleFactor = Math.min(this.scaleFactor + 0.1, this.maxScale);
        this.applyScale();
    }

    zoomOut() {
        this.scaleFactor = Math.max(this.scaleFactor - 0.1, this.minScale);
        this.applyScale();
    }
    
    handleWheelZoom(e) {
        if (!this.boardScrollContainer) return;
        e.preventDefault();

        const zoomAmount = -e.deltaY * 0.001;
        const oldScale = this.scaleFactor;
        const newScale = Math.min(Math.max(this.scaleFactor + zoomAmount, this.minScale), this.maxScale);

        if (newScale !== oldScale) {
            // Before scaling, get mouse position relative to grid
            const rect = this.gridEl.getBoundingClientRect();
            const offsetX = (e.clientX - rect.left) / oldScale;
            const offsetY = (e.clientY - rect.top) / oldScale;

            this.scaleFactor = newScale;
            this.applyScale();

            // After scaling, get the new rect and adjust scroll so the point under cursor stays stable
            const newRect = this.gridEl.getBoundingClientRect();
            const newOffsetX = offsetX * newScale;
            const newOffsetY = offsetY * newScale;

            this.boardScrollContainer.scrollLeft += (newOffsetX - (e.clientX - newRect.left));
            this.boardScrollContainer.scrollTop += (newOffsetY - (e.clientY - newRect.top));
        }
    }


    // Fire Emblem-style movement preview system

    startMovementPreview(entity) {
        const origin = this.getEntityPosition('character', entity.id);
        if (!origin) return;

        this.addGhostToken(entity, origin);
        this.highlightMovementRange(entity);
    }
    
    highlightMovementRange(entity) {
        const origin = this.getEntityPosition('character', entity.id);
        if (!origin) return;

        const terrainModifiers = this.getTerrainModifiers();
        const regularRange = this.getPositionsInRange(origin, entity.movementSpeed, terrainModifiers);
        const dashRange = this.getPositionsInRange(origin, entity.movementSpeed + entity.dashSpeed, terrainModifiers);

        this.highlightTiles(regularRange, 'regular-move-highlight', false);
        dashRange.forEach(pos => {
            if (!regularRange.some(r => r.row === pos.row && r.col === pos.col)) {
                this.highlightTiles([pos], 'dash-move-highlight', false);
            }
        });
    }

handleDrop(ev, r, c) {
  ev.preventDefault();
  // Logic to handle dropped entity tokens
  // For example:
  if (this.draggedCharId !== null) {
    this.app.placeCharacterOnBoard(this.draggedCharId, r, c);
    this.draggedCharId = null;
  }
  if (this.draggedMonsterId !== null) {
    this.app.placeMonsterOnBoard(this.draggedMonsterId, r, c);
    this.draggedMonsterId = null;
  }
}

    clearHighlights(preserveGhost = true) {
        const highlightClasses = [
            'regular-move-highlight',
            'dash-move-highlight',
            'target-highlight'
        ];

        highlightClasses.forEach(className => {
            const highlightedCells = this.gridEl.querySelectorAll(`.${className}`);
            highlightedCells.forEach(cell => cell.classList.remove(className));
        });

        if (!preserveGhost && this.ghostToken) {
            this.ghostToken.remove();
            this.ghostToken = null;
        }
    }
    
    addGhostToken(entity, origin) {
        const cell = this.gridEl.querySelector(`td[data-row='${origin.row}'][data-col='${origin.col}']`);
        if (cell) {
            const ghostToken = document.createElement('div');
            ghostToken.className = 'token ghost-token';
            ghostToken.textContent = entity.name || 'C'; // Or other identifier
            cell.appendChild(ghostToken);
            this.ghostToken = ghostToken;
        }
    }

    handleMovement(entity) {
        const highlightedCells = this.gridEl.querySelectorAll('.regular-move-highlight, .dash-move-highlight');

        // Clean up existing listeners
        highlightedCells.forEach(cell => {
            const clone = cell.cloneNode(true);
            cell.parentNode.replaceChild(clone, cell);
        });

        // Add new listeners
        highlightedCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const row = parseInt(cell.dataset.row, 10);
                const col = parseInt(cell.dataset.col, 10);

                this.moveEntity('character', entity.id, row, col);

                // Clear highlights but keep the ghost token
                this.clearHighlights(false);
            });
        });
    }

    endTurn(entity) {
        this.clearHighlights(false); // Remove all highlights, including ghost token
        console.log(`${entity.name}'s turn ended.`);
    }

    handleGridMouseDown(e) {
        if (e.button !== 0) return; // Only handle left-click
        
        const cell = e.target.closest('td');
        if (!cell) return;

        const rect = this.gridEl.getBoundingClientRect();
        const gx = (e.clientX - rect.left) / this.scaleFactor;
        const gy = (e.clientY - rect.top) / this.scaleFactor;
        const c = Math.floor(gx / this.cellWidth);
        const r = Math.floor(gy / this.cellHeight);

        const key = `${r},${c}`;
        const entity = this.app.entityTokens[key];
        const ctrlPressed = e.ctrlKey;

        // Check for AoE or single-target attacks
        if (this.app.currentAction) {
            if (this.app.currentAction.type === 'aoe') {
                // AoE Attack Logic
                this.app.saveStateForUndo();
                const aoePositions = this.getAoEAreaPositions(
                    this.app.currentAction.aoeShape, 
                    { row: r, col: c }, 
                    this.app.currentAction.radius
                );
                const affectedEntities = this.getEntitiesInPositions(aoePositions);
                const finalTargets = this.filterAoETargets(affectedEntities, this.app.currentAction);

                performAoeAttack(
                    this.app.currentAction.attacker,
                    this.app.currentAction.entityType,
                    this.app.currentAction.attackEntry,
                    this.app.currentAction.attackDef,
                    this.app,
                    finalTargets,
                    aoePositions
                );

                this.clearHighlights();
                this.app.clearAction();
                return;
            }

            if (this.app.currentAction.type === 'attack') {
                // Single-target Attack Logic
                // Check if clicked cell contains a highlighted targetable entity
                if (entity && this.isCellHighlighted(r, c)) {
                    this.app.saveStateForUndo();
                    const { attacker, entityType, attackEntry, weapon } = this.app.currentAction;
                    performAttack(attacker, entityType, attackEntry, weapon, this.app, { type: entity.type, id: entity.id });
                    this.clearHighlights();
                    this.app.clearAction();
                    return;
                } else {
                    // Clicked a non-highlighted cell or no entity - do nothing here
                    return;
                }
            }
        }

        // Normal mode (not attacking):
        if (entity) {
            // Clicking on an entity
            if (ctrlPressed) {
                // Toggle selection
                if (this.isEntitySelected(entity)) {
                    this.selectedEntities = this.selectedEntities.filter(se => !(se.type === entity.type && se.id === entity.id));
                } else {
                    this.selectedEntities.push({ type: entity.type, id: entity.id });
                }
            } else {
                // Replace selection with just this entity if not already selected
                if (!this.isEntitySelected(entity)) {
                    this.selectedEntities = [{ type: entity.type, id: entity.id }];
                }
            }

            // Check if we can drag the selected entities
            if (this.selectedEntities.length > 0 && this.selectedEntities.every(ent => this.app.canControlEntity(ent))) {
                this.isDraggingTokens = true;
                this.originalPositions = this.selectedEntities.map(ent => {
                    const pos = this.getEntityPosition(ent.type, ent.id);
                    return { ...ent, row: pos.row, col: pos.col };
                });
                this.clearDragHighlights();

                // Highlight the initial drag cell
                const cellUnderMouse = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
                if (cellUnderMouse) cellUnderMouse.style.outline = '2px dashed green';
                this.currentDragCell = { row: r, col: c };
            }

        } else {
            // Clicking on empty space
            if (!ctrlPressed) {
                // Clear selection and start marquee selection
                this.selectedEntities = [];
                this.isMarqueeSelecting = true;
                this.marqueeStart = { x: gx, y: gy };
                this.marqueeEl.style.display = 'block';
                this.marqueeEl.style.left = `${this.marqueeStart.x}px`;
                this.marqueeEl.style.top = `${this.marqueeStart.y}px`;
                this.marqueeEl.style.width = '0px';
                this.marqueeEl.style.height = '0px';
            }
        }

        this.updateSelectionStyles();
    }

    getPositionsInRange(startPos, maxDistance, terrainModifiers = {}) {
        const visited = new Set();
        const queue = [{ row: startPos.row, col: startPos.col, distance: 0 }];
        const positions = [];

        while (queue.length > 0) {
            const { row, col, distance } = queue.shift();
            const key = `${row},${col}`;

            if (visited.has(key) || distance > maxDistance) continue;
            visited.add(key);

            const cell = this.gridEl.querySelector(`td[data-row='${row}'][data-col='${col}']`);
            if (!cell || cell.classList.contains('obstacle') || cell.classList.contains('wall')) continue;

            positions.push({ row, col });

            const terrainModifier = terrainModifiers[key] || 1;

            const neighbors = [
                { row: row - 1, col: col },
                { row: row + 1, col: col },
                { row: row, col: col - 1 },
                { row: row, col: col + 1 }
            ];

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (!visited.has(neighborKey)) {
                    queue.push({
                        row: neighbor.row,
                        col: neighbor.col,
                        distance: distance + terrainModifier
                    });
                }
            }
        }

        return positions;
    }
    
    getTerrainModifiers() {
        const modifiers = {};
        const cells = this.gridEl.querySelectorAll('td');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row, 10);
            const col = parseInt(cell.dataset.col, 10);
            const key = `${row},${col}`;

            if (cell.classList.contains('difficult-terrain')) {
                modifiers[key] = 2; // Difficult terrain costs 2
            } else {
                modifiers[key] = 1; // Default cost
            }
        });

        return modifiers;
    }

    getEntityPosition(type, id) {
        for (const key in this.app.entityTokens) {
            const entity = this.app.entityTokens[key];
            if (entity.type === type && entity.id === id) {
                const [row, col] = key.split(',').map(Number);
                return { row, col };
            }
        }
        console.warn(`Entity of type "${type}" with ID "${id}" not found.`);
        return null;
    }

    redrawBoard() {
        const cells = this.gridEl.querySelectorAll('td');
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('terrain-acidic');
        });

        for (const key in this.app.entityTokens) {
            const [r, c] = key.split(',').map(Number);
            const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
            if (cell) {
                const entity = this.app.entityTokens[key];
                const token = document.createElement('div');
                token.classList.add('token', entity.type);
                token.textContent = entity.type === 'character' ? 'C' : 'M';
                cell.appendChild(token);
            }
        }

        if (this.app.terrainEffects) {
            for (const key in this.app.terrainEffects) {
                const [r, c] = key.split(',').map(Number);
                const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
                if (cell && this.app.terrainEffects[key].type === 'acidic') {
                    cell.classList.add('terrain-acidic');
                }
            }
        }

        this.updateSelectionStyles();
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
        this.gridEl.innerHTML = '';
        for (let r = 0; r < this.rows; r++) {
            const rowEl = document.createElement('tr');
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('td');
                cell.dataset.row = r;
                cell.dataset.col = c;
                // Set initial size
                cell.style.width = this.cellWidth + 'px';
                cell.style.height = this.cellHeight + 'px';
                rowEl.appendChild(cell);
            }
            this.gridEl.appendChild(rowEl);
        }
    }

    centerViewOnGrid() {
        // Grid is centered at 50%,50% of a large board-content area
        // So to center view on the grid, just scroll to the middle of board-content
        this.boardScrollContainer.scrollLeft = (this.contentWidth - this.boardScrollContainer.clientWidth) / 2;
        this.boardScrollContainer.scrollTop = (this.contentHeight - this.boardScrollContainer.clientHeight) / 2;
    }

    setupEventListeners() {
        let isRightClickPanning = false;
        let startX, startY;

        this.gridEl.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                // Right-click panning
                isRightClickPanning = true;
                startX = e.clientX;
                startY = e.clientY;
                this.boardScrollContainer.style.cursor = 'grabbing';
                e.preventDefault();
            } else if (e.button === 0) {
                this.handleGridMouseDown(e);
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
                this.boardScrollContainer.style.cursor = 'default';
            }
        });

        this.gridEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Wheel zoom
        this.boardScrollContainer.addEventListener('wheel', (e) => this.handleWheelZoom(e), { passive: false });

        // Mouse move/up for marquee and dragging
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
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

    isCellHighlighted(r, c) {
        const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
        return cell && cell.classList.contains('target-highlight');
    }

    isEntitySelected(entity) {
        return this.selectedEntities.some(se => se.type === entity.type && se.id === entity.id);
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

    highlightTiles(positions, highlightClass, clearExisting = true) {
        if (clearExisting) this.clearHighlights();

        positions.forEach(pos => {
            const cell = this.gridEl.querySelector(`td[data-row='${pos.row}'][data-col='${pos.col}']`);
            if (cell) cell.classList.add(highlightClass);
        });
    }
}
