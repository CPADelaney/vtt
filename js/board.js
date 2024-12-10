// js/board.js
import { performAttack, performAoeAttack } from './combat.js';

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
    this.terrainEffects = {}; // Store terrain effects if needed
  }

  initialize() {
    this.buildGrid();
    this.setupEventListeners();
    this.redrawBoard();
  }

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

  redrawBoard() {
    const cells = this.gridEl.querySelectorAll('td');
    cells.forEach(cell => {
      cell.innerHTML = '';
      cell.classList.remove('terrain-acidic');
    });

    // Place entities
    for (const key in this.entityTokens) {
      const [r, c] = key.split(',').map(Number);
      const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
      if (cell) {
        const entity = this.entityTokens[key];
        const token = document.createElement('div');
        token.classList.add('token', entity.type);
        token.textContent = entity.type === 'character' ? 'C' : 'M';
        cell.appendChild(token);
      }
    }

    // Draw terrain effects if any
    if (this.app.terrainEffects) {
      for (const key in this.app.terrainEffects) {
        const [r, c] = key.split(',').map(Number);
        const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
        if (cell) {
          if (this.app.terrainEffects[key].type === 'acidic') {
            cell.classList.add('terrain-acidic');
          }
        }
      }
    }

    this.updateSelectionStyles();
  }

  handleDrop(ev, r, c) {
    ev.preventDefault();
    if (this.draggedCharId !== null) {
      this.app.placeCharacterOnBoard(this.draggedCharId, r, c);
      this.draggedCharId = null;
    }
    if (this.draggedMonsterId !== null) {
      this.app.placeMonsterOnBoard(this.draggedMonsterId, r, c);
      this.draggedMonsterId = null;
    }
  }

  setupEventListeners() {
    this.gridEl.addEventListener('mousedown', (e) => this.handleGridMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

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

  handleGridMouseDown(e) {
    if (e.button !== 0) return;

    const rect = this.gridEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = 40;
    const cellHeight = 40;

    const c = Math.floor(x / cellWidth);
    const r = Math.floor(y / cellHeight);

    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;

    // AoE Attack Mode
    if (this.app.currentAction && this.app.currentAction.type === 'aoe') {
      this.app.saveStateForUndo();
      const aoePositions = this.getAoEAreaPositions(this.app.currentAction.aoeShape, { row: r, col: c }, this.app.currentAction.radius);
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

    // Single-target Attack Mode
    if (this.app.currentAction && this.app.currentAction.type === 'attack') {
      const key = `${r},${c}`;
      const entity = this.entityTokens[key];
      if (entity && this.isCellHighlighted(r, c)) {
        this.app.saveStateForUndo();
        const { attacker, entityType, attackEntry, weapon } = this.app.currentAction;
        performAttack(attacker, entityType, attackEntry, weapon, this.app, { type: entity.type, id: entity.id });
        this.clearHighlights();
        this.app.clearAction();
        return;
      } else {
        return; 
      }
    }

    // Normal selection/marquee
    const key = `${r},${c}`;
    const entity = this.entityTokens[key];
    const ctrlPressed = e.ctrlKey;

    if (entity) {
      if (ctrlPressed) {
        if (this.isEntitySelected(entity)) {
          this.selectedEntities = this.selectedEntities.filter(se => !(se.type === entity.type && se.id === entity.id));
        } else {
          this.selectedEntities.push({ type: entity.type, id: entity.id });
        }
      } else {
        if (!this.isEntitySelected(entity)) {
          this.selectedEntities = [{ type: entity.type, id: entity.id }];
        }
      }

      if (this.selectedEntities.length > 0 && this.selectedEntities.every(ent => this.app.canControlEntity(ent))) {
        this.isDraggingTokens = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.originalPositions = this.selectedEntities.map(ent => {
          let pos = this.getEntityPosition(ent.type, ent.id);
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

  handleMouseMove(e) {
    if (this.app.currentAction && this.app.currentAction.type === 'aoe') {
      const rect = this.gridEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cellWidth = 40;
      const cellHeight = 40;
      const c = Math.floor(x / cellWidth);
      const r = Math.floor(y / cellHeight);

      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
        this.clearHighlights();
        const aoePositions = this.getAoEAreaPositions(this.app.currentAction.aoeShape, { row: r, col: c }, this.app.currentAction.radius);
        this.highlightTiles(aoePositions, 'target-highlight');
      }
    }

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

  clearDragHighlights() {
    const cells = this.gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.style.outline = '');
  }

  isEntitySelected(entity) {
    return this.selectedEntities.some(se => se.type === entity.type && se.id === entity.id);
  }

  getEntityPosition(type, id) {
    for (const key in this.entityTokens) {
      const ent = this.entityTokens[key];
      if (ent.type === type && ent.id === id) {
        const [r, c] = key.split(',').map(Number);
        return { row: r, col: c };
      }
    }
    return null;
  }

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

  // AoE Helpers
  getAoEAreaPositions(shape, centerPos, radius) {
    let positions = [];
    if (shape === 'circle') {
      for (let rr = centerPos.row - radius; rr <= centerPos.row + radius; rr++) {
        for (let cc = centerPos.col - radius; cc <= centerPos.col + radius; cc++) {
          if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
            const dx = rr - centerPos.row;
            const dy = cc - centerPos.col;
            if (dx*dx + dy*dy <= radius*radius) {
              positions.push({ row: rr, col: cc });
            }
          }
        }
      }
    } else if (shape === 'cone') {
      // Simple example: a cone "forward" direction is assumed upward
      // Add more complex logic as needed
      for (let rr = centerPos.row - radius; rr <= centerPos.row; rr++) {
        for (let cc = centerPos.col - (radius - (centerPos.row - rr)); cc <= centerPos.col + (radius - (centerPos.row - rr)); cc++) {
          if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
            positions.push({ row: rr, col: cc });
          }
        }
      }
    }
    // Add other shapes as needed
    return positions;
  }

  getEntitiesInPositions(positions) {
    let entities = [];
    for (let pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (this.entityTokens[key]) {
        entities.push(this.entityTokens[key]);
      }
    }
    return entities;
  }

  filterAoETargets(entities, actionData) {
    // Check actionData.attackDef.conditions if excludeAllies etc.
    if (actionData.attackDef.conditions && actionData.attackDef.conditions.excludeAllies) {
      // Suppose attacker is a character: exclude characters owned by same user?
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
