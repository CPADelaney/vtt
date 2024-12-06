// js/board.js

export class Board {
  constructor(rows, cols, entityTokens, appInstance) {
    this.rows = rows;
    this.cols = cols;
    this.entityTokens = entityTokens;
    this.app = appInstance;

    // DOM Elements
    this.gridEl = document.getElementById('grid');
    this.marqueeEl = document.getElementById('selection-marquee');
    this.contextMenu = document.getElementById('context-menu');
    this.contextDelete = document.getElementById('context-delete');

    // Selection and Dragging States
    this.selectedEntities = [];
    this.isDraggingTokens = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.originalPositions = [];

    this.isMarqueeSelecting = false;
    this.marqueeStart = { x: 0, y: 0 };
    this.marqueeRect = { x: 0, y: 0, w: 0, h: 0 };

    // Drag Indicators
    this.draggedCharId = null;
    this.draggedMonsterId = null;

    this.contextMenuVisible = false;
  }

  // Initialize Board Functionalities
  initialize() {
    this.buildGrid();
    this.setupEventListeners();
    this.app.redrawBoard();
  }

  // Grid Setup
  buildGrid() {
    for (let r = 0; r < this.rows; r++) {
      const rowEl = document.createElement('tr');
      for (let c = 0; c < this.cols; c++) {
        const cell = document.createElement('td');
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('dragover', (ev) => ev.preventDefault());
        cell.addEventListener('drop', (ev) => this.handleDrop(ev, r, c));
        rowEl.appendChild(cell);
      }
      this.gridEl.appendChild(rowEl);
    }
  }

  // Handle Drop Events on Grid Cells
  handleDrop(ev, r, c) {
    ev.preventDefault();
    if (this.draggedCharId !== null) {
      this.app.placeCharacterOnBoard(this.draggedCharId, r, c);
    }
    if (this.draggedMonsterId !== null) {
      this.app.placeMonsterOnBoard(this.draggedMonsterId, r, c);
    }
  }

  // Setup Event Listeners Related to the Board
  setupEventListeners() {
    // Grid Interaction
    this.gridEl.addEventListener('mousedown', (e) => this.handleGridMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Context Menu
    document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    this.contextDelete.addEventListener('click', () => {
      this.app.deleteSelectedEntities();
      this.hideContextMenu();
    });
    document.addEventListener('click', (e) => {
      if (this.contextMenuVisible && !this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });
  }

  // Grid Mouse Down Handler
  handleGridMouseDown(e) {
    if (e.button !== 0) return; // Left-click only

    const rect = this.gridEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = 40;
    const cellHeight = 40;

    const c = Math.floor(x / cellWidth);
    const r = Math.floor(y / cellHeight);

    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return; // Click outside grid

    const key = `${r},${c}`;
    const entity = this.entityTokens[key];
    const ctrlPressed = e.ctrlKey;

    if (entity) {
      if (ctrlPressed) {
        // Toggle selection
        if (this.isEntitySelected(entity)) {
          this.selectedEntities = this.selectedEntities.filter(se => !(se.type === entity.type && se.id === entity.id));
        } else {
          this.selectedEntities.push({ type: entity.type, id: entity.id });
        }
      } else {
        if (this.isEntitySelected(entity)) {
          // Already selected, do nothing
        } else {
          this.selectedEntities = [{ type: entity.type, id: entity.id }];
        }
      }

      if (this.selectedEntities.length > 0 && this.selectedEntities.every(ent => this.app.canControlEntity(ent))) {
        this.isDraggingTokens = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.originalPositions = this.selectedEntities.map(ent => {
          let pos = this.app.getEntityPosition(ent.type, ent.id);
          return { ...ent, row: pos.row, col: pos.col };
        });
      }
    } else {
      if (!ctrlPressed) {
        this.selectedEntities = [];
      }
      this.isMarqueeSelecting = true;
      this.marqueeStart = { x: x, y: y };
      this.marqueeEl.style.display = 'block';
      this.marqueeEl.style.left = `${this.marqueeStart.x}px`;
      this.marqueeEl.style.top = `${this.marqueeStart.y}px`;
      this.marqueeEl.style.width = '0px';
      this.marqueeEl.style.height = '0px';
    }

    this.updateSelectionStyles();
  }

  // Mouse Move Handler
  handleMouseMove(e) {
    if (this.isDraggingTokens && this.selectedEntities.length > 0) {
      const dx = e.clientX - this.dragStartPos.x;
      const dy = e.clientY - this.dragStartPos.y;
      const cellWidth = 40;
      const cellHeight = 40;
      const rowOffset = Math.round(dy / cellHeight);
      const colOffset = Math.round(dx / cellWidth);
      this.highlightDragPositions(rowOffset, colOffset);
    }

    if (this.isMarqueeSelecting) {
      const rect = this.gridEl.getBoundingClientRect();
      let currentX = e.clientX - rect.left;
      let currentY = e.clientY - rect.top;

      // Constrain within grid
      currentX = Math.max(0, Math.min(currentX, this.cols * 40));
      currentY = Math.max(0, Math.min(currentY, this.rows * 40));

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

  // Mouse Up Handler
  handleMouseUp(e) {
    if (this.isDraggingTokens) {
      this.isDraggingTokens = false;
      const dx = e.clientX - this.dragStartPos.x;
      const dy = e.clientY - this.dragStartPos.y;
      const cellWidth = 40;
      const cellHeight = 40;
      const rowOffset = Math.round(dy / cellHeight);
      const colOffset = Math.round(dx / cellWidth);

      if (rowOffset !== 0 || colOffset !== 0) {
        this.app.moveSelectedEntities(rowOffset, colOffset);
      }
      this.clearDragHighlights();
    }

    if (this.isMarqueeSelecting) {
      this.isMarqueeSelecting = false;
      this.marqueeEl.style.display = 'none';
      this.selectedEntities = this.getEntitiesInMarquee();
      this.updateSelectionStyles();
    }
  }

  // Context Menu Handlers
  handleContextMenu(e) {
    e.preventDefault();
    const cell = e.target.closest('td');
    if (!cell) {
      this.hideContextMenu();
      return;
    }

    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const entity = this.entityTokens[`${r},${c}`];

    if (entity && this.isEntitySelected(entity) && this.app.canControlEntity(entity)) {
      this.showContextMenu(e.pageX, e.pageY);
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

  // Update Selection Styles on the Grid
  updateSelectionStyles() {
    const cells = this.gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.classList.remove('selected'));

    for (let ent of this.selectedEntities) {
      const pos = this.app.getEntityPosition(ent.type, ent.id);
      if (pos) {
        const cell = this.gridEl.querySelector(`td[data-row='${pos.row}'][data-col='${pos.col}']`);
        if (cell) cell.classList.add('selected');
      }
    }
  }

  // Highlight Potential Drag Positions
  highlightDragPositions(rowOffset, colOffset) {
    this.clearDragHighlights();
    for (let i = 0; i < this.selectedEntities.length; i++) {
      const ent = this.selectedEntities[i];
      const oldPos = this.originalPositions[i];
      const nr = oldPos.row + rowOffset;
      const nc = oldPos.col + colOffset;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        const cell = this.gridEl.querySelector(`td[data-row='${nr}'][data-col='${nc}']`);
        if (cell) cell.style.outline = '2px dashed green';
      }
    }
  }

  // Clear All Drag Highlights
  clearDragHighlights() {
    const cells = this.gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.style.outline = '');
  }

  // Get Entities Within the Marquee Selection
  getEntitiesInMarquee() {
    const cellWidth = 40;
    const cellHeight = 40;
    let selected = [];

    for (const key in this.entityTokens) {
      const [r, c] = key.split(',').map(Number);
      const cellX = c * cellWidth;
      const cellY = r * cellHeight;

      const isSelected =
        cellX < this.marqueeRect.x + this.marqueeRect.w &&
        cellX + cellWidth > this.marqueeRect.x &&
        cellY < this.marqueeRect.y + this.marqueeRect.h &&
        cellY + cellHeight > this.marqueeRect.y;

      if (isSelected) {
        selected.push({ type: this.entityTokens[key].type, id: this.entityTokens[key].id });
      }
    }
    return selected;
  }
}
