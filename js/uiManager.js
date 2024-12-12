import { rollCombinedDiceExpression } from './dice.js';
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
    this.monsterFilter = document.getElementById('monster-filter');
    this.monsterListEntries = document.getElementById('monster-list-entries');
    this.cancelAttackBtn = document.getElementById('cancel-attack-btn');

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

    // Send command button
    this.sendCommandBtn = document.getElementById('send-command-btn');

    // Optional elements
    this.mapControls = document.getElementById('map-controls');
    this.zoomInBtn = document.getElementById('zoom-in-btn');
    this.zoomOutBtn = document.getElementById('zoom-out-btn');
    this.resizeGridBtn = document.getElementById('resize-grid-btn');
    this.userSelect = document.getElementById('user-select');
  }

  setupUIEventListeners() {
    // Chat input (Enter press in command input)
    if (this.commandInput) {
      this.commandInput.addEventListener('keypress', (e) => {
        this.app.chatManager.handleCommandInput(e);
      });
    }

    // Click on Send button simulates pressing 'Enter'
    if (this.sendCommandBtn && this.commandInput) {
      this.sendCommandBtn.addEventListener('click', () => {
        const enterKeyEvent = new KeyboardEvent('keypress', { key: 'Enter' });
        this.commandInput.dispatchEvent(enterKeyEvent);
      });
    }
  
    // Close modals
    if (this.closeSheet && this.sheetModal) {
      this.closeSheet.addEventListener('click', () => {
        this.sheetModal.style.display = "none";
      });
    }

    if (this.closeMonsterSheet && this.monsterSheetModal) {
      this.closeMonsterSheet.addEventListener('click', () => {
        this.monsterSheetModal.style.display = "none";
      });
    }
  
    // Create Character Modal
    if (this.createCharacterBtn) {
      this.createCharacterBtn.addEventListener('click', () => this.openCreateCharacterModal());
    }

    if (this.closeCreateCharacter && this.createCharacterModal) {
      this.closeCreateCharacter.addEventListener('click', () => {
        this.createCharacterModal.style.display = "none";
      });
    }

    if (this.addAttackBtn) {
      this.addAttackBtn.addEventListener('click', () => this.addAttackInput());
    }

    if (this.createCharacterForm) {
      this.createCharacterForm.addEventListener('submit', (e) => this.handleCreateCharacterSubmit(e));
    }
  
    // User selection (changes currentUser)
    if (this.userSelect) {
      this.userSelect.addEventListener('change', (e) => {
        this.app.currentUser = e.target.value;
        this.renderCharacterList();
        this.renderMonsterList();
        this.renderLog();
      
        // Hide the monsters tab button if not DM
        const monstersTabButton = document.querySelector('[data-tab="monsters-tab"]');
        if (monstersTabButton) {
          if (!this.app.isDM()) {
            monstersTabButton.style.display = "none";
          } else {
            monstersTabButton.style.display = "inline-block";
          }
        }
      });
    }
  
    // Monster Filter
    if (this.monsterFilter) {
      this.monsterFilter.addEventListener('change', () => this.renderMonsterList());
    }
  
    // Custom attack modal events
    if (this.closeMonsterCustomAttack && this.customAttackModal) {
      this.closeMonsterCustomAttack.addEventListener('click', () => {
        this.customAttackModal.style.display = "none";
      });
    }
  
    if (this.customAttackForm) {
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
  
    // Zoom controls
    if (this.zoomInBtn && this.zoomOutBtn) {
      this.zoomInBtn.addEventListener('click', () => {
        this.app.board.zoomIn();
      });
      this.zoomOutBtn.addEventListener('click', () => {
        this.app.board.zoomOut();
      });
    }

    // Map controls dragging
    if (this.mapControls) {
      let isDragging = false;
      let dragOffsetX, dragOffsetY;
      
      this.mapControls.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffsetX = e.clientX - this.mapControls.offsetLeft;
        dragOffsetY = e.clientY - this.mapControls.offsetTop;
      });
      
      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          this.mapControls.style.left = (e.clientX - dragOffsetX) + 'px';
          this.mapControls.style.top = (e.clientY - dragOffsetY) + 'px';
        }
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  
    // Resize Grid controls
    if (this.resizeGridBtn) {
      this.resizeGridBtn.addEventListener('click', () => {
        if (!this.app.isDM()) {
          alert("Only DM can resize the grid!");
          return;
        }
        const rows = parseInt(document.getElementById('grid-rows').value, 10);
        const cols = parseInt(document.getElementById('grid-cols').value, 10);
        if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0) {
          this.app.board.resizeGrid(rows, cols);
        } else {
          alert("Invalid row/col values.");
        }
      });
    }
  
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
  
        const tabId = btn.dataset.tab;
        document.querySelectorAll('#tab-content .tab-content').forEach(tc => {
          tc.classList.remove('active');
        });
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Cancel attack button event
    if (this.cancelAttackBtn) {
      this.cancelAttackBtn.addEventListener('click', () => {
        this.cancelAttackAndReopenSheet();
      });
    }
  }

  showCancelAttackButton(entityData, type) {
    if (this.cancelAttackBtn) {
      this.cancelAttackBtn.style.display = 'block';
    }
    this.lastEntityForAttack = { entityData, type };
  }

  hideCancelAttackButton() {
    if (this.cancelAttackBtn) {
      this.cancelAttackBtn.style.display = 'none';
    }
    this.lastEntityForAttack = null;
  }

  cancelAttackAndReopenSheet() {
    this.app.clearAction();
    this.app.board.clearHighlights();
    this.hideCancelAttackButton();
    this.app.board.clearOnceTileClick();
    if (this.lastEntityForAttack) {
      if (this.lastEntityForAttack.type === 'character') {
        this.openCharacterSheet(this.lastEntityForAttack.entityData);
      } else {
        this.openMonsterSheet(this.lastEntityForAttack.entityData);
      }
    }
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
    if (this.logEl) {
      this.logEl.textContent = displayText;
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
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
    this.monsterListEntries.innerHTML = '';
    const filter = this.monsterFilter.value;
    let filtered = this.app.monsters;
    if (filter) {
      filtered = filtered.filter(m => m.habitats.includes(filter));
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
  
    if (this.app.isDM()) {
      const attacksContainer = document.getElementById('monster-attacks');
  
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
      attacksContainer.appendChild(attackSelect);
  
      const addAttackBtn = document.createElement('button');
      addAttackBtn.textContent = 'Add Selected Attack';
      addAttackBtn.addEventListener('click', () => {
        const attackId = attackSelect.value;
        if (attackId && attacksData[attackId]) {
          this.app.monsterManager.addAttackToMonster(m.id, attackId);
          alert("Attack added to monster template!");
          this.renderAttacksSection(m, "monster", document.getElementById('monster-attacks'));
        } else {
          alert("Invalid or no attack selected.");
        }
      });
      attacksContainer.appendChild(addAttackBtn);
  
      const addCustomAttackBtn = document.createElement('button');
      addCustomAttackBtn.textContent = 'Add Custom Attack';
      addCustomAttackBtn.addEventListener('click', () => {
        this.openCustomAttackModal(m);
      });
      attacksContainer.appendChild(addCustomAttackBtn);
    }
  
    this.monsterSheetModal.style.display = "block";
  }

  renderAttacksSection(entityData, type, containerEl) {
    containerEl.innerHTML = `<h4>Attacks</h4>`;
  
    let isPlaced = false;
    if (type === 'character') {
      isPlaced = !!entityData.placed;
    } else if (type === 'monster') {
      const placedInstance = this.app.getMonsterById(entityData.id);
      isPlaced = !!placedInstance; 
      if (!isPlaced) {
        const templateId = entityData.templateId || entityData.id; 
        const placed = this.app.placedMonsters.find(m => m.templateId === templateId);
        if (placed) {
          entityData = placed;
          isPlaced = true;
        }
      }
    }
  
    let attacksToShow = entityData.attacks && entityData.attacks.length > 0 ? entityData.attacks : [];
    if (attacksToShow.length === 0) {
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
            actionData.weapon = this.app.weapons.find(w => w.id === 0);
          }
        
          this.app.startAction(actionData);
          
          if (type === 'character') {
            this.sheetModal.style.display = "none";
          } else if (type === 'monster') {
            this.monsterSheetModal.style.display = "none";
          }
        
          this.showCancelAttackButton(entityData, type);

          if (attDef.type === 'single') {
            const attackerPos = this.app.board.getEntityPosition(type, entityData.id);
            if (attackerPos) {
              const possiblePositions = this.app.board.getPositionsInRange(attackerPos, attDef.range);
              this.app.board.highlightTiles(possiblePositions, 'target-highlight', true);
               this.app.board.onceTileClick(targetPos => {
                 this.app.completeAction(targetPos);
               })
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
