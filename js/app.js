// js/app.js

import { rollSingleDice, rollCombinedDiceExpression } from './dice.js';

export class App {
  constructor() {
    // Configuration Constants
    this.rows = 8;
    this.cols = 8;
    this.users = ["DM", "Player1", "Player2"];
    this.currentUser = "DM";

    // Data Structures
    this.weapons = [
      { id: 1, name: "Short Sword", damageDice: "1d6", stat: "STR", baseMod: 2 },
      { id: 2, name: "Long Bow", damageDice: "1d8", stat: "DEX", baseMod: 1 },
      { id: 3, name: "Dagger", damageDice: "1d4", stat: "DEX", baseMod: 3 }
    ];

    this.characters = [];
    this.nextCharacterId = 1;

    this.monsters = [
      { id: 1, name: "Sand Wurm", HP: 50, AC: 14, STR: 18, DEX: 8, CON: 16, INT: 5, WIS: 10, CHA: 5, habitats: ["Desert"], attacks: [{ weaponId: 1, customMod: 0 }] },
      { id: 2, name: "Cactus Crawler", HP: 20, AC: 12, STR: 12, DEX: 14, CON: 10, INT: 2, WIS: 8, CHA: 6, habitats: ["Desert", "Grasslands"], attacks: [] },
      { id: 3, name: "River Drake", HP: 30, AC: 15, STR: 14, DEX: 12, CON: 13, INT: 6, WIS: 10, CHA: 8, habitats: ["Riverlands"], attacks: [] },
      { id: 4, name: "Plains Stalker", HP: 25, AC: 13, STR: 13, DEX: 16, CON: 11, INT: 4, WIS: 10, CHA: 6, habitats: ["Grasslands"], attacks: [] }
    ];

    this.entityTokens = {}; // Key: "row,col", Value: { type: "character" | "monster", id: Number }
    this.messages = []; // Chat messages

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

    // DOM Elements
    this.gridEl = document.getElementById('grid');
    this.marqueeEl = document.getElementById('selection-marquee');
    this.logEl = document.getElementById('log');
    this.commandInput = document.getElementById('command-input');
    this.characterListEntries = document.getElementById('character-list-entries');
    this.monsterList = document.getElementById('monster-list');
    this.monsterFilter = document.getElementById('monster-filter');
    this.monsterListEntries = document.getElementById('monster-list-entries');

    // Modals
    this.sheetModal = document.getElementById('character-sheet-modal');
    this.monsterSheetModal = document.getElementById('monster-sheet-modal');
    this.closeSheet = document.getElementById('close-sheet');
    this.closeMonsterSheet = document.getElementById('close-monster-sheet');

    this.createCharacterModal = document.getElementById('create-character-modal');
    this.closeCreateCharacter = document.getElementById('close-create-character');
    this.createCharacterForm = document.getElementById('create-character-form');
    this.attackCreationList = document.getElementById('attack-creation-list');
    this.addAttackBtn = document.getElementById('add-attack-btn');
    this.assignOwnerField = document.getElementById('assign-owner-field');
    this.createCharacterBtn = document.getElementById('create-character-btn');

    // Context Menu
    this.contextMenu = document.getElementById('context-menu');
    this.contextDelete = document.getElementById('context-delete');
    this.contextMenuVisible = false;
  }

  // Initialize the application
  initialize() {
    this.buildGrid();
    this.setupEventListeners();
    this.renderCharacterList();
    this.renderMonsterList();
    this.renderLog();
  }

  // Utility Methods
  isDM() {
    return this.currentUser === "DM";
  }

  getCharacterById(id) {
    return this.characters.find(ch => ch.id === id);
  }

  getMonsterById(id) {
    return this.monsters.find(m => m.id === id);
  }

  getEntityPosition(type, id) {
    for (const key in this.entityTokens) {
      const et = this.entityTokens[key];
      if (et.type === type && et.id === id) {
        const [r, c] = key.split(',').map(Number);
        return { row: r, col: c };
      }
    }
    return null;
  }

  isEntitySelected(ent) {
    return this.selectedEntities.some(e => e.type === ent.type && e.id === ent.id);
  }

  canControlEntity(entity) {
    if (entity.type === "character") {
      const ch = this.getCharacterById(entity.id);
      return ch && (this.isDM() || ch.owner === this.currentUser);
    } else {
      return this.isDM(); // Only DM controls monsters
    }
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

  handleDrop(ev, r, c) {
    ev.preventDefault();
    if (this.draggedCharId !== null) {
      this.placeCharacterOnBoard(this.draggedCharId, r, c);
    }
    if (this.draggedMonsterId !== null) {
      this.placeMonsterOnBoard(this.draggedMonsterId, r, c);
    }
  }

  // Event Listeners Setup
  setupEventListeners() {
    // Grid Interaction
    this.gridEl.addEventListener('mousedown', (e) => this.handleGridMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Context Menu
    document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    this.contextDelete.addEventListener('click', () => {
      this.deleteSelectedEntities();
      this.hideContextMenu();
    });
    document.addEventListener('click', (e) => {
      if (this.contextMenuVisible && !this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Dice and Chat
    this.commandInput.addEventListener('keypress', (e) => this.handleCommandInput(e));
    document.querySelectorAll('.dice-button').forEach(btn => {
      btn.addEventListener('click', () => this.handleDiceButtonClick(btn));
    });
    document.getElementById('roll-expression').addEventListener('click', () => {
      const expr = document.getElementById('dice-expression').value;
      if (expr) {
        const result = rollCombinedDiceExpression(expr);
        this.addMessage({ text: result, sender: this.currentUser, private: false });
      }
    });

    // Modals
    this.closeSheet.addEventListener('click', () => {
      this.sheetModal.style.display = "none";
    });
    this.closeMonsterSheet.addEventListener('click', () => {
      this.monsterSheetModal.style.display = "none";
    });

    // Create Character Modal
    this.createCharacterBtn.addEventListener('click', () => this.openCreateCharacterModal());
    this.closeCreateCharacter.addEventListener('click', () => {
      this.createCharacterModal.style.display = "none";
    });
    this.addAttackBtn.addEventListener('click', () => this.addAttackInput());
    this.createCharacterForm.addEventListener('submit', (e) => this.handleCreateCharacterSubmit(e));

    // User Selection
    document.getElementById('user-select').addEventListener('change', (e) => {
      this.currentUser = e.target.value;
      this.renderCharacterList();
      this.renderMonsterList();
      this.renderLog();
    });

    // Monster Filter
    this.monsterFilter.addEventListener('change', () => this.renderMonsterList());
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

      if (this.selectedEntities.length > 0 && this.selectedEntities.every(ent => this.canControlEntity(ent))) {
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
        this.moveSelectedEntities(rowOffset, colOffset);
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

    if (entity && this.isEntitySelected(entity) && this.canControlEntity(entity)) {
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

  // Dice and Chat Handlers
  handleCommandInput(e) {
    if (e.key === 'Enter') {
      const command = this.commandInput.value.trim();
      this.commandInput.value = '';

      if (!command) return;

      if (command.toLowerCase().startsWith('/roll')) {
        const parts = command.split(/\s+/);
        let recipients = null;
        let diceExprIndex = 1;

        if (parts.length > 2 && parts[1].toLowerCase() === '/w') {
          recipients = [];
          let i = 2;
          for (; i < parts.length; i++) {
            if (parts[i].match(/d/)) {
              diceExprIndex = i;
              break;
            } else {
              if (this.users.includes(parts[i])) {
                recipients.push(parts[i]);
              }
            }
          }
        }

        const diceExpr = parts.slice(diceExprIndex).join('');
        if (diceExpr) {
          const result = rollCombinedDiceExpression(diceExpr);
          if (recipients && recipients.length > 0) {
            if (!recipients.includes("DM")) recipients.push("DM");
            if (!recipients.includes(this.currentUser)) recipients.push(this.currentUser);
            this.addMessage({ text: result, sender: this.currentUser, private: true, recipients: recipients });
          } else {
            this.addMessage({ text: result, sender: this.currentUser, private: false });
          }
        } else {
          this.addMessage({ text: "No dice expression provided.", sender: "System", private: false });
        }

      } else if (command.startsWith('/')) {
        this.addMessage({ text: `Unrecognized command: ${command}`, sender: "System", private: false });
      } else {
        this.addMessage({ text: command, sender: this.currentUser, private: false });
      }
    }
  }

  handleDiceButtonClick(btn) {
    const sides = parseInt(btn.dataset.sides, 10);
    const result = rollSingleDice(sides);
    this.addMessage({ text: `Rolled d${sides}: ${result}`, sender: this.currentUser, private: false });
  }

  // Message Handling
  addMessage(msgObj) {
    this.messages.push(msgObj);
    this.renderLog();
  }

  renderLog() {
    let displayText = '';
    for (let msg of this.messages) {
      if (!msg.private) {
        displayText += `${msg.sender}: ${msg.text}\n`;
      } else {
        if (this.isDM() || (msg.recipients && msg.recipients.includes(this.currentUser))) {
          let recipientsStr = msg.recipients.join(', ');
          displayText += `${msg.sender} -> ${recipientsStr}: ${msg.text}\n`;
        }
      }
    }
    this.logEl.textContent = displayText;
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  // Entity Selection and Movement
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

  moveSelectedEntities(rowOffset, colOffset) {
    let newPositions = [];
    for (let i = 0; i < this.selectedEntities.length; i++) {
      const ent = this.selectedEntities[i];
      const oldPos = this.originalPositions[i];
      const newRow = oldPos.row + rowOffset;
      const newCol = oldPos.col + colOffset;
      if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
        return;
      }
      const destKey = `${newRow},${newCol}`;
      if (this.entityTokens[destKey] && !this.selectedEntities.some(se => {
        const p = this.getEntityPosition(se.type, se.id);
        return p && p.row === newRow && p.col === newCol;
      })) {
        return;
      }
      newPositions.push({ ...ent, row: newRow, col: newCol });
    }

    for (const ent of this.selectedEntities) {
      const pos = this.getEntityPosition(ent.type, ent.id);
      if (pos) delete this.entityTokens[`${pos.row},${pos.col}`];
    }

    for (const np of newPositions) {
      this.entityTokens[`${np.row},${np.col}`] = { type: np.type, id: np.id };
    }

    this.redrawBoard();
  }

  redrawBoard() {
    const cells = this.gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.textContent = '');
    for (const key in this.entityTokens) {
      const et = this.entityTokens[key];
      const [r, c] = key.split(',').map(Number);
      const cell = this.gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
      if (et.type === "character") cell.textContent = '@';
      else cell.textContent = 'M';
    }
    this.updateSelectionStyles();
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

  deleteSelectedEntities() {
    for (let ent of this.selectedEntities) {
      const pos = this.getEntityPosition(ent.type, ent.id);
      if (pos) delete this.entityTokens[`${pos.row},${pos.col}`];
      if (ent.type === "character") {
        const ch = this.getCharacterById(ent.id);
        if (ch) ch.placed = false;
      }
      // Monsters could have a placed flag if needed
    }
    this.selectedEntities = [];
    this.redrawBoard();
    this.renderCharacterList();
    this.renderMonsterList();
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

  // Context Menu Actions
  handleContextDelete() {
    this.deleteSelectedEntities();
    this.hideContextMenu();
  }

  // Dice Rolling Utilities
  rollDamageDice(diceExp, statMod, baseMod, customMod) {
    const match = diceExp.match(/(\d+)d(\d+)/);
    if (!match) return { total: 0, details: "Invalid dice expression." };
    let diceCount = parseInt(match[1], 10);
    let diceSides = parseInt(match[2], 10);
    let rolls = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(rollSingleDice(diceSides));
    }
    let sum = rolls.reduce((a, b) => a + b, 0) + statMod + baseMod + customMod;
    return { total: sum, details: `(${rolls.join(',')})+Stat(${statMod})+Wep(${baseMod})+Custom(${customMod})` };
  }

  // Attack Functionality
  performAttack(entityData, type, attackEntry, weapon) {
    let possibleTargets = this.getPossibleTargets(type, entityData);
    if (possibleTargets.length === 0) {
      this.addMessage({ sender: "System", text: "No targets available.", private: false });
      return;
    }

    let targetName = prompt("Choose a target (Type exact name):\n" + possibleTargets.map(pt => pt.name).join('\n'));
    if (!targetName) return;
    let target = possibleTargets.find(pt => pt.name === targetName);
    if (!target) {
      this.addMessage({ sender: "System", text: "Invalid target selected.", private: false });
      return;
    }

    let statVal = entityData[weapon.stat];
    let statMod = Math.floor((statVal - 10) / 2);
    let roll = rollSingleDice(20);
    let totalAttack = roll + statMod + weapon.baseMod + attackEntry.customMod;

    let damage = this.rollDamageDice(weapon.damageDice, statMod, weapon.baseMod, attackEntry.customMod);

    this.addMessage({
      sender: entityData.name,
      text: `Attacks ${target.name} with ${weapon.name}!\nAttack Roll: d20(${roll})+Stat(${statMod})+Wep(${weapon.baseMod})+Custom(${attackEntry.customMod}) = ${totalAttack}\nDamage: ${damage.details} = ${damage.total}`,
      private: false
    });
  }

  getPossibleTargets(attackerType, attackerData) {
    let targets = this.characters.map(ch => ({ type: "character", id: ch.id, name: ch.name, placed: ch.placed }));
    for (const key in this.entityTokens) {
      const et = this.entityTokens[key];
      if (et.type === "character") {
        // Already included
      } else {
        const m = this.getMonsterById(et.id);
        if (m && !targets.find(t => t.type === "monster" && t.id === m.id)) {
          targets.push({ type: "monster", id: m.id, name: m.name, placed: true });
        }
      }
    }
    // Remove self
    targets = targets.filter(t => t.name !== attackerData.name);
    return targets;
  }

  // Rendering Functions
  renderCharacterList() {
    this.characterListEntries.innerHTML = '';
    let visibleChars = this.characters.filter(ch => this.isDM() || ch.owner === this.currentUser);
    for (let ch of visibleChars) {
      const div = document.createElement('div');
      div.className = 'character-list-item';

      const canPlace = !ch.placed && this.canControlEntity({ type: "character", id: ch.id });

      const dragIcon = document.createElement('span');
      dragIcon.textContent = '⚔';
      dragIcon.className = 'drag-icon';
      dragIcon.setAttribute('draggable', canPlace ? 'true' : 'false');
      if (canPlace) {
        dragIcon.addEventListener('dragstart', (ev) => {
          this.draggedCharId = ch.id;
          this.draggedMonsterId = null;
        });
        dragIcon.addEventListener('dragend', () => {
          this.draggedCharId = null;
        });
      }

      div.appendChild(dragIcon);

      let textNode = document.createTextNode(`${ch.name} (Owner: ${ch.owner})`);
      div.appendChild(textNode);

      let openBtn = document.createElement('button');
      openBtn.textContent = 'Open Sheet';
      openBtn.disabled = !this.canControlEntity({ type: "character", id: ch.id });
      openBtn.addEventListener('click', () => {
        if (this.canControlEntity({ type: "character", id: ch.id })) {
          this.openCharacterSheet(ch);
        }
      });

      div.appendChild(openBtn);
      this.characterListEntries.appendChild(div);
    }
  }

  renderMonsterList() {
    if (this.isDM()) {
      this.monsterList.style.display = "block";
    } else {
      this.monsterList.style.display = "none";
      return;
    }

    this.monsterListEntries.innerHTML = '';
    const filter = this.monsterFilter.value;
    let filtered = this.monsters;
    if (filter) {
      filtered = this.monsters.filter(m => m.habitats.includes(filter));
    }

    for (let m of filtered) {
      const div = document.createElement('div');
      div.className = 'monster-list-item';

      const canPlace = true;

      const dragIcon = document.createElement('span');
      dragIcon.textContent = '⚔';
      dragIcon.className = 'drag-icon';
      dragIcon.setAttribute('draggable', canPlace ? 'true' : 'false');
      if (canPlace) {
        dragIcon.addEventListener('dragstart', () => {
          this.draggedMonsterId = m.id;
          this.draggedCharId = null;
        });
        dragIcon.addEventListener('dragend', () => {
          this.draggedMonsterId = null;
        });
      }

      div.appendChild(dragIcon);

      let textNode = document.createTextNode(`${m.name}`);
      div.appendChild(textNode);

      let openBtn = document.createElement('button');
      openBtn.textContent = 'View Stats';
      openBtn.addEventListener('click', () => {
        if (this.isDM()) {
          this.openMonsterSheet(m);
        }
      });

      div.appendChild(openBtn);
      this.monsterListEntries.appendChild(div);
    }
  }

  renderLog() {
    let displayText = '';
    for (let msg of this.messages) {
      if (!msg.private) {
        displayText += `${msg.sender}: ${msg.text}\n`;
      } else {
        if (this.isDM() || (msg.recipients && msg.recipients.includes(this.currentUser))) {
          let recipientsStr = msg.recipients.join(', ');
          displayText += `${msg.sender} -> ${recipientsStr}: ${msg.text}\n`;
        }
      }
    }
    this.logEl.textContent = displayText;
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  // Modal Handling
  openCharacterSheet(ch) {
    document.getElementById('character-name').textContent = ch.name;
    document.getElementById('character-details').innerHTML = `
      <table>
        <tr><th>Class</th><td>${ch.class}</td></tr>
        <tr><th>Level</th><td>${ch.level}</td></tr>
        <tr><th>HP</th><td>${ch.HP}</td></tr>
        <tr><th>AC</th><td>${ch.AC}</td></tr>
        <tr><th>STR</th><td>${ch.STR}</td></tr>
        <tr><th>DEX</th><td>${ch.DEX}</td></tr>
        <tr><th>CON</th><td>${ch.CON}</td></tr>
        <tr><th>INT</th><td>${ch.INT}</td></tr>
        <tr><th>WIS</th><td>${ch.WIS}</td></tr>
        <tr><th>CHA</th><td>${ch.CHA}</td></tr>
      </table>
    `;
    this.renderAttacksSection(ch, "character", document.getElementById('character-attacks'));
    this.sheetModal.style.display = "block";
  }

  openMonsterSheet(m) {
    document.getElementById('monster-name').textContent = m.name;
    document.getElementById('monster-details').innerHTML = `
      <table>
        <tr><th>HP</th><td>${m.HP}</td></tr>
        <tr><th>AC</th><td>${m.AC}</td></tr>
        <tr><th>STR</th><td>${m.STR}</td></tr>
        <tr><th>DEX</th><td>${m.DEX}</td></tr>
        <tr><th>CON</th><td>${m.CON}</td></tr>
        <tr><th>INT</th><td>${m.INT}</td></tr>
        <tr><th>WIS</th><td>${m.WIS}</td></tr>
        <tr><th>CHA</th><td>${m.CHA}</td></tr>
        <tr><th>Habitats</th><td>${m.habitats.join(', ')}</td></tr>
      </table>
    `;
    this.renderAttacksSection(m, "monster", document.getElementById('monster-attacks'));
    this.monsterSheetModal.style.display = "block";
  }

  renderAttacksSection(entityData, type, containerEl) {
    containerEl.innerHTML = `<h4>Attacks</h4>`;
    if (!entityData.attacks || entityData.attacks.length === 0) {
      containerEl.innerHTML += `<p>No attacks.</p>`;
      return;
    }

    for (let att of entityData.attacks) {
      const w = this.weapons.find(wep => wep.id === att.weaponId);
      if (!w) continue;
      const attackDiv = document.createElement('div');
      attackDiv.textContent = `${w.name} (Custom Mod: ${att.customMod}) `;
      const attackBtn = document.createElement('button');
      attackBtn.textContent = "Attack!";
      attackBtn.addEventListener('click', () => {
        this.performAttack(entityData, type, att, w);
      });
      attackDiv.appendChild(attackBtn);
      containerEl.appendChild(attackDiv);
    }
  }

  // Create Character Modal Handling
  openCreateCharacterModal() {
    if (this.isDM()) {
      this.assignOwnerField.style.display = "block";
    } else {
      this.assignOwnerField.style.display = "none";
    }
    this.createCharacterModal.style.display = "block";
  }

  addAttackInput() {
    const row = document.createElement('div');
    row.className = 'attack-input-row';
    row.innerHTML = `
      <select class="attack-weapon-select" required>
        <option value="">--Select Weapon--</option>
        ${this.weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
      </select>
      <input type="number" class="attack-custom-mod" value="0" style="width:50px;" title="Custom modifier" />
      <button type="button" class="remove-attack">X</button>
    `;
    this.attackCreationList.appendChild(row);
    const removeBtn = row.querySelector('.remove-attack');
    removeBtn.addEventListener('click', () => {
      row.remove();
    });
  }

  handleCreateCharacterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(this.createCharacterForm);
    let owner = this.currentUser;
    if (this.isDM()) {
      owner = formData.get('owner') || owner;
      if (!this.users.includes(owner)) owner = "DM";
    }
    const newChar = {
      id: this.nextCharacterId++,
      owner: owner,
      name: formData.get('name'),
      class: formData.get('class'),
      level: parseInt(formData.get('level'), 10),
      HP: parseInt(formData.get('HP'), 10),
      AC: parseInt(formData.get('AC'), 10),
      STR: parseInt(formData.get('STR'), 10),
      DEX: parseInt(formData.get('DEX'), 10),
      CON: parseInt(formData.get('CON'), 10),
      INT: parseInt(formData.get('INT'), 10),
      WIS: parseInt(formData.get('WIS'), 10),
      CHA: parseInt(formData.get('CHA'), 10),
      placed: false,
      attacks: []
    };

    const weaponSelects = this.createCharacterForm.querySelectorAll('.attack-weapon-select');
    const customMods = this.createCharacterForm.querySelectorAll('.attack-custom-mod');
    for (let i = 0; i < weaponSelects.length; i++) {
      const wid = parseInt(weaponSelects[i].value, 10);
      if (!isNaN(wid)) {
        const cmod = parseInt(customMods[i].value, 10) || 0;
        newChar.attacks.push({ weaponId: wid, customMod: cmod });
      }
    }

    this.characters.push(newChar);
    this.createCharacterModal.style.display = "none";
    this.createCharacterForm.reset();
    this.attackCreationList.innerHTML = '';
    this.renderCharacterList();
  }

  // Placing Entities on the Board
  placeCharacterOnBoard(charId, row, col) {
    const ch = this.getCharacterById(charId);
    if (!ch) return;
    if (ch.placed) return;
    if (!this.canControlEntity({ type: "character", id: charId })) return;

    const key = `${row},${col}`;
    if (this.entityTokens[key]) return;
    this.entityTokens[key] = { type: "character", id: charId };
    ch.placed = true;
    this.redrawBoard();
    this.renderCharacterList();
  }

  placeMonsterOnBoard(monId, row, col) {
    const m = this.getMonsterById(monId);
    if (!m) return;
    if (!this.isDM()) return;
    const key = `${row},${col}`;
    if (this.entityTokens[key]) return;
    this.entityTokens[key] = { type: "monster", id: monId };
    this.redrawBoard();
    this.renderMonsterList();
  }
}
