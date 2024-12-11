// uiManager.js

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

    // Custom attack modal elements
    this.customAttackModal = document.getElementById('monster-custom-attack-modal');
    this.closeMonsterCustomAttack = document.getElementById('close-monster-custom-attack');
    this.customAttackForm = document.getElementById('custom-attack-form');
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

    // Custom attack modal events
    this.closeMonsterCustomAttack.addEventListener('click', () => {
      this.customAttackModal.style.display = "none";
    });

    this.customAttackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.currentMonsterForCustomAttack) return;
      const formData = new FormData(this.customAttackForm);
      const customAttack = {
        name: formData.get('name'),
        type: formData.get('type'),
        damageDice: formData.get('damageDice'),
        baseMod: parseInt(formData.get('baseMod'), 10) || 0,
        stat: formData.get('stat'),
        range: parseInt(formData.get('range'), 10) || 1,
        shape: formData.get('shape') || null,
        radius: parseInt(formData.get('radius'), 10) || 0
      };

      this.app.monsterManager.addCustomAttackToMonster(this.currentMonsterForCustomAttack.id, customAttack);
      this.customAttackModal.style.display = "none";
      alert("Custom attack added!");
      this.renderMonsterList();
    });
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
          ev.dataTransfer.setData('text', '');
          this.app.board.draggedCharId = ch.id;
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

      // DM-only features:
      if (this.app.isDM()) {
        // Add Attack dropdown
        const attackSelect = document.createElement('select');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '--Select Attack--';
        attackSelect.appendChild(defaultOption);

        for (const [id, atkDef] of Object.entries(attacksData)) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = atkDef.name || `Attack ${id}`;
          attackSelect.appendChild(opt);
        }
        div.appendChild(attackSelect);

        let addAttackBtn = document.createElement('button');
        addAttackBtn.textContent = 'Add Selected Attack';
        addAttackBtn.addEventListener('click', () => {
          const attackId = attackSelect.value;
          if (attackId && attacksData[attackId]) {
            this.app.monsterManager.addAttackToMonster(m.id, attackId);
            alert("Attack added to monster template!");
          } else {
            alert("Invalid or no attack selected.");
          }
        });
        div.appendChild(addAttackBtn);

        // Add Custom Attack
        let addCustomAttackBtn = document.createElement('button');
        addCustomAttackBtn.textContent = 'Add Custom Attack';
        addCustomAttackBtn.addEventListener('click', () => {
          this.openCustomAttackModal(m);
        });
        div.appendChild(addCustomAttackBtn);
      }

      this.monsterListEntries.appendChild(div);
    }
  }

  openCustomAttackModal(monster) {
    this.currentMonsterForCustomAttack = monster;
    this.customAttackForm.reset();
    this.customAttackModal.style.display = "block";
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
  
    // Check if this entity is placed on the board
    let isPlaced = false;
    if (type === 'character') {
      // Characters have a 'placed' boolean
      isPlaced = !!entityData.placed;
    } else if (type === 'monster') {
      // Monsters are placed if they have an instance ID that appears in placedMonsters in app
      // Since getMonsterById returns a placed instance, if entityData came from placed instance, it's placed.
      // If entityData came from bestiary template, it's not placed.
      const placedInstance = this.app.getMonsterById(entityData.id);
      isPlaced = !!placedInstance; 
    }
  
    // If the entity is not placed and type is monster from bestiary, we can look up if there's any placed instance of this monster's template
    if (type === 'monster' && !isPlaced) {
      // Check if any placed monster has the same template id (assuming templateId stored somewhere)
      // If you don't store templateId, store it in placed monsters when cloning.
      const templateId = entityData.templateId || entityData.id; 
      // If entityData is a template (best case: templates are identified by low IDs, instances by high IDs)
      // you can find at least one placed instance of that template:
      const placed = this.app.placedMonsters.find(m => m.templateId === templateId);
      if (placed) {
        // If a placed instance exists, let's show that placed instance's attacks
        entityData = placed; // override with placed instance data
        isPlaced = true;
      }
    }
  
    let attacksToShow = entityData.attacks && entityData.attacks.length > 0 ? entityData.attacks : [];
    if (attacksToShow.length === 0) {
      // If no attacks defined, show unarmed if isPlaced is true
      if (isPlaced) {
        attacksToShow = [{ attackId: 'unarmed' }];
      } else {
        containerEl.innerHTML += `<p>No attacks (and not placed on board).</p>`;
        return;
      }
    }
  
    for (let att of attacksToShow) {
      const attDef = att.custom ? att.custom : attacksData[att.attackId];
      if (!attDef) continue;
  
      const attackDiv = document.createElement('div');
      attackDiv.textContent = `${attDef.name} `;
  
      const attackBtn = document.createElement('button');
      attackBtn.textContent = "Attack!";
  
      // Disable attack if not placed
      if (!isPlaced) {
        attackBtn.disabled = true;
        attackDiv.appendChild(document.createTextNode(" (Not placed on board)"));
      } else {
        attackBtn.addEventListener('click', () => {
          const actionData = {
            type: attDef.type === 'aoe' ? 'aoe' : 'attack',
            aoeShape: attDef.shape || null,
            radius: attDef.radius || 0,
            attacker: entityData,
            entityType: type,
            attackEntry: att,
            attackDef: attDef
          };
  
          if (att.weaponId) {
            const foundWeapon = this.app.weapons.find(w => w.id === att.weaponId);
            actionData.weapon = foundWeapon;
          } else {
            // Use unarmed fallback
            actionData.weapon = this.app.weapons.find(w => w.id === 0);
          }
  
          this.app.startAction(actionData);
  
          // For AoE attacks, no need attacker position if you allow targeting empty spaces
          if (attDef.type === 'single') {
            const attackerPos = this.app.board.getEntityPosition(type, entityData.id);
            if (attackerPos) {
              const possiblePositions = this.app.board.getPositionsInRange(attackerPos, attDef.range);
              this.app.board.highlightTiles(possiblePositions, 'target-highlight');
            }
          }
        });
      }
  
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
