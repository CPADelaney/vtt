// js/app.js

import { Board } from './board.js'; // Adjust the path if necessary
import { rollSingleDice, rollCombinedDiceExpression } from './dice.js'; // Import dice functions
import { performAttack, getPossibleTargets, rollDamageDice } from './combat.js';

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

    // Initialize Board Module
    this.board = new Board(this.rows, this.cols, this.entityTokens, this);
  }

  // Initialize the application
  initialize() {
    this.board.initialize();
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
    return this.board.getEntityPosition(type, id);
  }

  isEntitySelected(ent) {
    return this.board.isEntitySelected(ent);
  }

  canControlEntity(entity) {
    if (entity.type === "character") {
      const ch = this.getCharacterById(entity.id);
      return ch && (this.isDM() || ch.owner === this.currentUser);
    } else {
      return this.isDM(); // Only DM controls monsters
    }
  }

  // Setup Event Listeners Related to Non-Board Functionalities
  setupEventListeners() {
    // Context Menu actions are already handled in Board module

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
    const result = this.rollSingleDice(sides);
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

  // Dice Rolling Functions
  rollSingleDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }
  rollCombinedDiceExpression(expression) {
    const originalExpr = expression;
    expression = expression.trim().replace(/\s+/g, '');
    const regex = /([+\-])?(\d*d\d+|\d+)/gi;
    let total = 0;
    let detailParts = [];
    let match;
    while ((match = regex.exec(expression)) !== null) {
      let sign = match[1] || '+';
      let token = match[2];
      let signFactor = (sign === '-') ? -1 : 1;
      if (token.includes('d')) {
        let [diceCountStr, sidesStr] = token.split('d');
        let diceCount = parseInt(diceCountStr || '1', 10);
        let sides = parseInt(sidesStr, 10);
        let rolls = [];
        for (let i = 0; i < diceCount; i++) {
          let result = this.rollSingleDice(sides);
          rolls.push(result);
        }
        let sumRolls = rolls.reduce((a, b) => a + b, 0);
        total += sumRolls * signFactor;
        detailParts.push(`${sign}${diceCount}d${sides} [${rolls.join(',')}]`);
      } else {
        let num = parseInt(token, 10);
        total += num * signFactor;
        detailParts.push(`${sign}${num}`);
      }
    }
    let detailStr = detailParts.join('');
    detailStr = detailStr.replace(/^\+/, ''); // Remove leading +
    return `Rolled ${originalExpr}: ${detailStr} = ${total}`;
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
          this.board.draggedCharId = ch.id;
          this.board.draggedMonsterId = null;
        });
        dragIcon.addEventListener('dragend', () => {
          this.board.draggedCharId = null;
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
          this.board.draggedMonsterId = m.id;
          this.board.draggedCharId = null;
        });
        dragIcon.addEventListener('dragend', () => {
          this.board.draggedMonsterId = null;
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
        performAttack(entityData, type, att, w);
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
    this.board.redrawBoard();
    this.renderCharacterList();
  }

  placeMonsterOnBoard(monId, row, col) {
    const m = this.getMonsterById(monId);
    if (!m) return;
    if (!this.isDM()) return;
    const key = `${row},${col}`;
    if (this.entityTokens[key]) return;
    this.entityTokens[key] = { type: "monster", id: monId };
    this.board.redrawBoard();
    this.renderMonsterList();
  }
}
