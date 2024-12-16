import { performAttack, performAoeAttack } from './combat.js';

export class Board {
  constructor(appInstance) {
    this.app = appInstance;

    this.boardScrollContainer = document.getElementById('board-scroll-container');
    this.mapControls = document.getElementById('map-controls');
    this.mapLayer = document.getElementById('map-layer'); // Large scalable layer with grid background
    this.marqueeEl = document.getElementById('selection-marquee');
    this.contextMenu = document.getElementById('context-menu');
    this.contextDelete = document.getElementById('context-delete');

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

    // Conceptual cell size (for calculating positions)
    this.cellWidth = 60;
    this.cellHeight = 60;

    // Zoom factor and bounds
    this.scaleFactor = 1; 
    this.minScale = 0.2;
    this.maxScale = 3;

    // Panning and zooming will be handled here
  }

  initialize() {
    this.setupEventListeners();
    this.redrawTokens();
    // Optionally center view if you know where to center
    this.centerView();
  }

  redrawTokens() {
    // Remove old tokens
    this.mapLayer.querySelectorAll('.token').forEach(t => t.remove());

    // For each entity token, place it on the mapLayer
    for (const key in this.app.entityTokens) {
      const entity = this.app.entityTokens[key];
      const [r, c] = key.split(',').map(Number);

      const x = c * this.cellWidth; // Pixel x position
      const y = r * this.cellHeight; // Pixel y position

      const token = document.createElement('div');
      token.classList.add('token', entity.type);
      token.textContent = (entity.type === 'character') ? 'C' : 'M';
      token.style.left = `${x}px`;
      token.style.top = `${y}px`;
      this.mapLayer.appendChild(token);
    }

    // If you have any terrain effects, handle them similarly
    // For AoE highlights, you might consider drawing highlights as overlays
  }

  centerView() {
    // Optionally center view on a particular point if desired
    // For now, you can scroll to middle of map-layer
    const scrollW = this.boardScrollContainer.clientWidth;
    const scrollH = this.boardScrollContainer.clientHeight;
    const layerRect = this.mapLayer.getBoundingClientRect();

    // Map layer width/height in current scale:
    const layerWidth = 5000 * this.scaleFactor;  // If map-layer is 5000x5000
    const layerHeight = 5000 * this.scaleFactor;

    this.boardScrollContainer.scrollLeft = (layerWidth - scrollW) / 2;
    this.boardScrollContainer.scrollTop = (layerHeight - scrollH) / 2;
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
    this.mapLayer.style.transform = `scale(${this.scaleFactor})`;
  }

  handleWheelZoom(e) {
    e.preventDefault();
    const rect = this.mapLayer.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / this.scaleFactor;
    const offsetY = (e.clientY - rect.top) / this.scaleFactor;

    const zoomAmount = -e.deltaY * 0.001;
    const oldScale = this.scaleFactor;
    this.scaleFactor = Math.min(Math.max(this.scaleFactor + zoomAmount, this.minScale), this.maxScale);

    this.applyScale();

    const newRect = this.mapLayer.getBoundingClientRect();
    const newOffsetX = offsetX * this.scaleFactor;
    const newOffsetY = offsetY * this.scaleFactor;

    const dx = (newOffsetX - (e.clientX - newRect.left));
    const dy = (newOffsetY - (e.clientY - newRect.top));

    this.boardScrollContainer.scrollLeft += dx;
    this.boardScrollContainer.scrollTop += dy;
  }

  setupEventListeners() {
    document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
    this.boardScrollContainer.addEventListener('wheel', (e) => this.handleWheelZoom(e), { passive: false });

    // Right-click pan:
    let isPanning = false;
    let startX, startY, scrollLeft, scrollTop;
    this.boardScrollContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    this.boardScrollContainer.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right-click
        isPanning = true;
        startX = e.pageX - this.boardScrollContainer.offsetLeft;
        startY = e.pageY - this.boardScrollContainer.offsetTop;
        scrollLeft = this.boardScrollContainer.scrollLeft;
        scrollTop = this.boardScrollContainer.scrollTop;
        this.boardScrollContainer.style.cursor = 'grabbing';
      }
    });
    this.boardScrollContainer.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      e.preventDefault();
      const x = e.pageX - this.boardScrollContainer.offsetLeft;
      const y = e.pageY - this.boardScrollContainer.offsetTop;
      this.boardScrollContainer.scrollLeft = scrollLeft - (x - startX);
      this.boardScrollContainer.scrollTop = scrollTop - (y - startY);
    });
    this.boardScrollContainer.addEventListener('mouseup', () => {
      isPanning = false;
      this.boardScrollContainer.style.cursor = 'grab';
    });

    // If you have marquee selection or attacks, you'll need to convert mouse coords to map coordinates:
    this.mapLayer.addEventListener('mousedown', (e) => this.handleMapMouseDown(e));
    this.mapLayer.addEventListener('mousemove', (e) => this.handleMapMouseMove(e));
    this.mapLayer.addEventListener('mouseup', (e) => this.handleMapMouseUp(e));

    if (this.contextDelete) {
      this.contextDelete.addEventListener('click', () => {
        this.app.deleteSelectedEntities();
        this.hideContextMenu();
      });
    }

    if (this.mapControls) {
      let isDraggingControls = false;
      let dragOffsetX, dragOffsetY;

      this.mapControls.addEventListener('mousedown', (e) => {
        isDraggingControls = true;
        dragOffsetX = e.clientX - this.mapControls.offsetLeft;
        dragOffsetY = e.clientY - this.mapControls.offsetTop;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDraggingControls) {
          this.mapControls.style.left = (e.clientX - dragOffsetX) + 'px';
          this.mapControls.style.top = (e.clientY - dragOffsetY) + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        isDraggingControls = false;
      });
    }
  }

  // Convert screen coords to map coords
  screenToMap(e) {
    const rect = this.mapLayer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scaleFactor;
    const y = (e.clientY - rect.top) / this.scaleFactor;
    return { x, y };
  }

  // Handle mouse down on map for selection/marquee/attacks
  handleMapMouseDown(e) {
    if (e.button !== 0) return; // Left click only

    const { x, y } = this.screenToMap(e);
    const r = Math.floor(y / this.cellHeight);
    const c = Math.floor(x / this.cellWidth);

    if (this.app.currentAction && this.app.currentAction.type === 'aoe') {
      this.handleAoEClick(r, c);
      return;
    }

    if (this.app.currentAction && this.app.currentAction.type === 'attack') {
      this.handleAttackClick(r, c);
      return;
    }

    // Normal selection/marquee
    const entity = this.getEntityAt(r, c);
    const ctrlPressed = e.ctrlKey;

    if (entity) {
      // Entity clicked
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

      if (this.selectedEntities.every(ent => this.app.canControlEntity(ent))) {
        this.isDraggingTokens = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.originalPositions = this.selectedEntities.map(ent => {
          let pos = this.getEntityPosition(ent.type, ent.id);
          return { ...ent, row: pos.row, col: pos.col };
        });
      }
    } else {
      // Empty space, start marquee
      if (!ctrlPressed) {
        this.selectedEntities = [];
      }

      this.isMarqueeSelecting = true;
      this.marqueeStart = { x, y };
      this.marqueeEl.style.display = 'block';
      this.marqueeEl.style.left = `${x}px`;
      this.marqueeEl.style.top = `${y}px`;
      this.marqueeEl.style.width = '0px';
      this.marqueeEl.style.height = '0px';
    }

    this.updateSelectionStyles();
  }

  handleMapMouseMove(e) {
    const { x, y } = this.screenToMap(e);

    // AoE hover highlight
    if (this.app.currentAction && this.app.currentAction.type === 'aoe') {
      const r = Math.floor(y / this.cellHeight);
      const c = Math.floor(x / this.cellWidth);
      this.highlightAoE(r, c);
    }

    // Token dragging
    if (this.isDraggingTokens && this.selectedEntities.length > 0) {
      this.clearDragHighlights();
      const r = Math.floor(y / this.cellHeight);
      const c = Math.floor(x / this.cellWidth);
      if (r >= 0 && c >= 0) {
        // Just highlight cell or remember current drag cell if needed
        // Since we have no actual cells, you might visually draw a highlight or just store current drag cell
        this.currentDragCell = { row: r, col: c };
        // No <td> to outline, so you might draw a fake highlight if you want
      }
    }

    // Marquee selection
    if (this.isMarqueeSelecting) {
      let currentX = x;
      let currentY = y;

      // Clamp if needed based on map size
      currentX = Math.max(0, Math.min(currentX, 5000)); // Adjust if map-layer is 5000x5000
      currentY = Math.max(0, Math.min(currentY, 5000));

      const x1 = Math.min(currentX, this.marqueeStart.x);
      const y1 = Math.min(currentY, this.marqueeStart.y);
      const x2 = Math.max(currentX, this.marqueeStart.x);
      const y2 = Math.max(currentY, this.marqueeStart.y);

      this.marqueeRect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

      this.marqueeEl.style.left = `${x1}px`;
      this.marqueeEl.style.top = `${y1}px`;
      this.marqueeEl.style.width = `${this.marqueeRect.w}px`;
      this.marqueeEl.style.height = `${this.marqueeRect.h}px`;
    }
  }

  handleMapMouseUp(e) {
    if (this.isDraggingTokens) {
      this.isDraggingTokens = false;
      this.clearDragHighlights();

      if (this.currentDragCell) {
        // Move entities if needed
        for (let ent of this.selectedEntities) {
          this.app.moveEntity(ent.type, ent.id, this.currentDragCell.row, this.currentDragCell.col);
        }
      }

      this.currentDragCell = null;
      this.redrawTokens();
    }

    if (this.isMarqueeSelecting) {
      this.isMarqueeSelecting = false;
      this.marqueeEl.style.display = 'none';
      this.selectedEntities = this.getEntitiesInMarquee();
      this.updateSelectionStyles();
    }
  }

  // Example AoE handling
  handleAoEClick(r, c) {
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
  }

  handleAttackClick(r, c) {
    const entity = this.getEntityAt(r, c);
    if (entity && this.isCellHighlighted(r, c)) {
      this.app.saveStateForUndo();
      const { attacker, entityType, attackEntry, weapon } = this.app.currentAction;
      performAttack(
        attacker, entityType, attackEntry, weapon, this.app, { type: entity.type, id: entity.id }
      );
      this.clearHighlights();
      this.app.clearAction();
    }
  }

  highlightAoE(r, c) {
    this.clearHighlights();
    const aoePositions = this.getAoEAreaPositions(
      this.app.currentAction.aoeShape, 
      { row: r, col: c }, 
      this.app.currentAction.radius
    );
    // Instead of highlighting <td>, you might create a semi-transparent div or some visual overlay at aoePositions
    // For now, this is conceptual.
  }

  getEntityAt(r, c) {
    const key = `${r},${c}`;
    return this.app.entityTokens[key] || null;
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

  updateSelectionStyles() {
    // Without <td>, you might highlight selected tokens or show some visual cue.
    // For now, this is a no-op or you can visually change the token background.
    this.mapLayer.querySelectorAll('.token').forEach(token => {
      token.classList.remove('selected');
    });

    for (let ent of this.selectedEntities) {
      const pos = this.getEntityPosition(ent.type, ent.id);
      if (pos) {
        const x = pos.col * this.cellWidth;
        const y = pos.row * this.cellHeight;
        // Find the token at these coords and add a 'selected' class
        const token = [...this.mapLayer.querySelectorAll('.token')].find(t => {
          const tx = parseInt(t.style.left, 10);
          const ty = parseInt(t.style.top, 10);
          return tx === x && ty === y;
        });
        if (token) token.classList.add('selected');
      }
    }
  }

  clearDragHighlights() {
    // If you had any highlights, remove them
  }

  clearHighlights() {
    // Remove AoE or targeting highlights if any
  }

  isCellHighlighted(r, c) {
    // Since we no longer have <td>, you'd store highlight info differently.
    // If you do highlight by storing positions in an array, check it here.
    return false;
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

  handleContextMenu(e) {
    e.preventDefault();
    // Convert to map coords if needed and find entity
    const { x, y } = this.screenToMap(e);
    const r = Math.floor(y / this.cellHeight);
    const c = Math.floor(x / this.cellWidth);
    const entity = this.getEntityAt(r, c);
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

  // AoE-related utility methods:
  getAoEAreaPositions(shape, centerPos, radius) {
    let positions = [];
    if (shape === 'circle') {
      for (let rr = centerPos.row - radius; rr <= centerPos.row + radius; rr++) {
        for (let cc = centerPos.col - radius; cc <= centerPos.col + radius; cc++) {
          const dx = rr - centerPos.row;
          const dy = cc - centerPos.col;
          if (dx*dx + dy*dy <= radius*radius) {
            positions.push({ row: rr, col: cc });
          }
        }
      }
    } else if (shape === 'cone') {
      for (let rr = centerPos.row - radius; rr <= centerPos.row; rr++) {
        for (let cc = centerPos.col - (radius - (centerPos.row - rr)); cc <= centerPos.col + (radius - (centerPos.row - rr)); cc++) {
          positions.push({ row: rr, col: cc });
        }
      }
    }
    return positions.filter(pos => pos.row >= 0 && pos.col >= 0);
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
}
