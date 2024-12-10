// uiManager.js
// Now all rendering logic lives here. The UIManager pulls data from App (and indirectly from managers) to display.

import { rollCombinedDiceExpression, rollSingleDice } from './dice.js';
import { attacksData } from './attacks.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.bindDomElements();
    this.setupUIEventListeners();
  }

  bindDomElements() {
    // Store references
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
  }

  setupUIEventListeners() {
    // Chat input
    this.commandInput.addEventListener('keypress', (e) => {
      this.app.chatManager.handleCommandInput(e);
    });

    // Dice buttons
    document.querySelectorAll('.dice-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10);
        const result = rollSingleDice(sides);
        this.app.chatManager.addMessage({ text: `Rolled d${sides}: ${result}`, sender: this.app.currentUser, private: false });
      });
    });

    // Roll expression
    document.getElementById('roll-expression').addEventListener('click', () => {
      const expr = document.getElementById('dice-expression').value;
      if (expr) {
        const result = rollCombinedDiceExpression(expr);
        this.app.chatManager.addMessage({ text: result, sender: this.app.currentUser, private: false });
      }
    });

    // Close modals
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

    // User selection
    document.getElementById('user-select').addEventListener('change', (e) => {
      this.app.currentUser = e.target.value;
      this.renderCharacterList();
      this.renderMonsterList();
      this.renderLog();
    });

    // Monster Filter
    this.monsterFilter.addEventListener('change', () => this.renderMonsterList());
  }

  renderLog() {
    let displayText = '';
    for (let msg of this.app.messages) {
      if (!msg.private) {
        displayText += `${msg.sender}: ${msg.text}\n`;
      } else {
        if (this.app.isDM() || (msg.recipients && msg.recipients.includes(this.app.currentUser))) {
          let recipientsStr = msg.recipients.join(', ');
          displayText += `${msg.sender} -> ${recipientsStr}: ${msg.text}\n`;
        }
      }
    }
    this.logEl.textContent = displayText;
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  renderCharacterList() {
    const characters = this.app.characters;
    const container = this.characterListEntries;
    container.innerHTML = '';
    let visibleChars = characters.filter(ch => this.app.isDM() || ch.owner === this.app.currentUser);

    for (let ch of visibleChars) {
      const div = document.createElement('div');
      div.className = 'character-list-item';

      const canPlace = !ch.placed && this.app.canControlEntity({ type: "character", id: ch.id });

      const dragIcon = document.createElement('span');
      dragIcon.textContent = '⚔';
      dragIcon.className = 'drag-icon';
      dragIcon.setAttribute('draggable', canPlace ? 'true' : 'false');
      if (canPlace) {
        dragIcon.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('text', ''); // essential for Chrome/Firefox to initiate a valid drag
          this.app.board.draggedCharId = ch.id; // or draggedMonsterId if monster
          this.app.board.draggedMonsterId = null;
          ev.dataTransfer.effectAllowed = 'move';
        });
        dragIcon.addEventListener('dragend', () => {
          this.app.board.draggedCharId = null;
        });
      }

      div.appendChild(dragIcon);

      let textNode = document.createTextNode(`${ch.name} (Owner: ${ch.owner})`);
      div.appendChild(textNode);

      let openBtn = document.createElement('button');
      openBtn.textContent = 'Open Sheet';
      openBtn.disabled = !this.app.canControlEntity({ type: "character", id: ch.id });
      openBtn.addEventListener('click', () => {
        if (this.app.canControlEntity({ type: "character", id: ch.id })) {
          this.openCharacterSheet(ch);
        }
      });

      div.appendChild(openBtn);
      container.appendChild(div);
    }
  }
  renderMonsterList() {
    if (this.app.isDM()) {
      this.monsterList.style.display = "block";
    } else {
      this.monsterList.style.display = "none";
      return;
    }
  
    this.monsterListEntries.innerHTML = '';
    const filter = this.monsterFilter.value;
    let filtered = this.app.monsters;
    if (filter) {
      filtered = this.app.monsters.filter(m => m.habitats.includes(filter));
    }
  
    for (let m of filtered) {
      const div = document.createElement('div');
      div.className = 'monster-list-item';
  
      const canPlace = this.app.isDM();
  
      const dragIcon = document.createElement('span');
      dragIcon.textContent = '⚔';
      dragIcon.className = 'drag-icon';
      dragIcon.setAttribute('draggable', canPlace ? 'true' : 'false');
      if (canPlace) {
        dragIcon.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('text', '');
          this.app.board.draggedMonsterId = m.id;
          this.app.board.draggedCharId = null;
          ev.dataTransfer.effectAllowed = 'move';
        });
        dragIcon.addEventListener('dragend', () => {
          this.app.board.draggedMonsterId = null;
        });
      }
  
      div.appendChild(dragIcon);
  
      let textNode = document.createTextNode(`${m.name}`);
      div.appendChild(textNode);
  
      let openBtn = document.createElement('button');
      openBtn.textContent = 'View Stats';
      openBtn.addEventListener('click', () => {
        if (this.app.isDM()) {
          this.openMonsterSheet(m);
        }
      });
      div.appendChild(openBtn);
  
      // Add attack button if DM
      if (this.app.isDM()) {
        let addAttackBtn = document.createElement('button');
        addAttackBtn.textContent = 'Add Attack';
        addAttackBtn.addEventListener('click', () => {
          // Prompt for attackId
          const attackId = prompt("Enter attackId to add to this monster:");
          if (attackId && !isNaN(parseInt(attackId, 10))) {
            this.app.monsterManager.addAttackToMonster(m.id, parseInt(attackId, 10));
          } else {
            alert("Invalid attackId.");
          }
        });
        div.appendChild(addAttackBtn);
      }
  
      this.monsterListEntries.appendChild(div);
    }
  }

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
        const attackDef = attacksData[att.attackId];
        if (!attackDef) continue;
  
        const attackDiv = document.createElement('div');
        attackDiv.textContent = `${attackDef.name} `;
        const attackBtn = document.createElement('button');
        attackBtn.textContent = "Attack!";
  
        attackBtn.addEventListener('click', () => {
          const actionData = {
            type: attackDef.type === 'aoe' ? 'aoe' : 'attack',
            aoeShape: attackDef.shape || null,
            radius: attackDef.radius || 0,
            attacker: entityData,
            entityType: type,
            attackEntry: att,
            attackDef: attackDef
          };
  
          this.app.startAction(actionData);
  
          // Debugging the attacker’s position:
          console.log("Attempting to find attacker position for", entityData, "type:", type);
          const attackerPos = this.app.board.getEntityPosition(type, entityData.id);
          console.log("attackerPos:", attackerPos);
          if (!attackerPos) {
            console.warn("No attacker position found. The entity may not be placed on the board or type/id mismatch.");
            return;
          }
  
          if (attackDef.type === 'single') {
            console.log("Highlighting range for single target attack.");
            console.log("Calling getPositionsInRange with", attackerPos, "range:", attackDef.range);
            const possiblePositions = this.app.board.getPositionsInRange(attackerPos, attackDef.range);
            console.log("possiblePositions:", possiblePositions);
            this.app.board.highlightTiles(possiblePositions, 'target-highlight');
          } else if (attackDef.type === 'aoe') {
            console.log("AOE attack selected, highlights on mousemove.");
          }
        });
  
        attackDiv.appendChild(attackBtn);
        containerEl.appendChild(attackDiv);
      }
    }
  


  openCreateCharacterModal() {
    if (this.app.isDM()) {
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
        ${this.app.weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
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
    let owner = this.app.currentUser;
    if (this.app.isDM()) {
      owner = formData.get('owner') || owner;
      if (!this.app.users.includes(owner)) owner = "DM";
    }
    const newCharData = {
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
      CHA: parseInt(formData.get('CHA'), 10)
    };

    const weaponSelects = this.createCharacterForm.querySelectorAll('.attack-weapon-select');
    const customMods = this.createCharacterForm.querySelectorAll('.attack-custom-mod');
    let attacks = [];
    for (let i = 0; i < weaponSelects.length; i++) {
      const wid = parseInt(weaponSelects[i].value, 10);
      if (!isNaN(wid)) {
        const cmod = parseInt(customMods[i].value, 10) || 0;
        attacks.push({ weaponId: wid, customMod: cmod });
      }
    }

    this.app.characterManager.createCharacter(newCharData, attacks);
    this.createCharacterModal.style.display = "none";
    this.createCharacterForm.reset();
    this.attackCreationList.innerHTML = '';
  }
}
