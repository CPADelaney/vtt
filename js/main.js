// main.js
import { 
  rows, 
  cols, 
  users, 
  weapons, 
  monsters, 
  currentUser, 
  characters, 
  nextCharacterId, 
  entityTokens, 
  messages, 
  isDM 
} from './constants.js';

// Now you can modify these variables as needed
console.log(rows, cols, users, weapons, monsters);

  // Build the grid
  const gridEl = document.getElementById('grid');
  for (let r = 0; r < rows; r++) {
    const rowEl = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('td');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('dragover', (ev) => ev.preventDefault());
      cell.addEventListener('drop', (ev) => {
        ev.preventDefault();
        if (draggedCharId !== null) {
          placeCharacterOnBoard(draggedCharId, r, c);
        }
        if (draggedMonsterId !== null) {
          placeMonsterOnBoard(draggedMonsterId, r, c);
        }
      });
      rowEl.appendChild(cell);
    }
    gridEl.appendChild(rowEl);
  }

  // Selection and marquee logic
  let selectedEntities = [];
  let isDraggingTokens = false;
  let dragStartPos = {x:0,y:0};
  let originalPositions = [];

  let isMarqueeSelecting = false;
  let marqueeStart = {x:0, y:0};
  let marqueeRect = {x:0, y:0, w:0, h:0};

  gridEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    const cell = e.target.closest('td');
    if (!cell) return;

    const r = parseInt(cell.dataset.row,10);
    const c = parseInt(cell.dataset.col,10);
    const entity = entityTokens[`${r},${c}`];
    const ctrlPressed = e.ctrlKey;

    if (entity) {
      if (ctrlPressed) {
        // toggle selection
        if (isEntitySelected(entity)) {
          selectedEntities = selectedEntities.filter(se => !(se.type===entity.type && se.id===entity.id));
        } else {
          selectedEntities.push({type:entity.type,id:entity.id});
        }
      } else {
        if (isEntitySelected(entity)) {
          // already selected, do nothing
        } else {
          selectedEntities = [{type:entity.type,id:entity.id}];
        }
      }

      if (selectedEntities.length > 0 && selectedEntities.every(canControlEntity)) {
        isDraggingTokens = true;
        dragStartPos = {x:e.clientX, y:e.clientY};
        originalPositions = selectedEntities.map(ent => {
          let pos = getEntityPosition(ent.type, ent.id);
          return {...ent, row:pos.row, col:pos.col};
        });
      }
    } else {
      if (!ctrlPressed) {
        selectedEntities = [];
      }
      isMarqueeSelecting = true;
      marqueeStart = {x:e.clientX, y:e.clientY};
      marqueeEl.style.display = 'block';
      const rect = gridEl.getBoundingClientRect();
      marqueeEl.style.left = (marqueeStart.x - rect.left) + 'px';
      marqueeEl.style.top = (marqueeStart.y - rect.top) + 'px';
      marqueeEl.style.width = '0px';
      marqueeEl.style.height = '0px';
    }

    updateSelectionStyles();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDraggingTokens && selectedEntities.length > 0) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const cellWidth = 40;
      const cellHeight = 40;
      const rowOffset = Math.round(dy / cellHeight);
      const colOffset = Math.round(dx / cellWidth);
      highlightDragPositions(rowOffset, colOffset);
    }

    if (isMarqueeSelecting) {
      const rect = gridEl.getBoundingClientRect();
      const x1 = Math.min(e.clientX, marqueeStart.x);
      const y1 = Math.min(e.clientY, marqueeStart.y);
      const x2 = Math.max(e.clientX, marqueeStart.x);
      const y2 = Math.max(e.clientY, marqueeStart.y);

      marqueeRect.x = x1 - rect.left;
      marqueeRect.y = y1 - rect.top;
      marqueeRect.w = x2 - x1;
      marqueeRect.h = y2 - y1;

      marqueeEl.style.left = marqueeRect.x + 'px';
      marqueeEl.style.top = marqueeRect.y + 'px';
      marqueeEl.style.width = marqueeRect.w + 'px';
      marqueeEl.style.height = marqueeRect.h + 'px';
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isDraggingTokens) {
      isDraggingTokens = false;
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const cellWidth = 40;
      const cellHeight = 40;
      const rowOffset = Math.round(dy / cellHeight);
      const colOffset = Math.round(dx / cellWidth);

      if (rowOffset !== 0 || colOffset !== 0) {
        moveSelectedEntities(rowOffset, colOffset);
      }
      clearDragHighlights();
    }

    if (isMarqueeSelecting) {
      isMarqueeSelecting = false;
      marqueeEl.style.display = 'none';
      selectedEntities = getEntitiesInMarquee();
      updateSelectionStyles();
    }
  });

  // Context menu for deletion
  const contextMenu = document.getElementById('context-menu');
  const contextDelete = document.getElementById('context-delete');
  let contextMenuVisible = false;

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = e.target.closest('td');
    if (!cell) {
      hideContextMenu();
      return;
    }

    const r = parseInt(cell.dataset.row,10);
    const c = parseInt(cell.dataset.col,10);
    const entity = entityTokens[`${r},${c}`];

    if (entity && isEntitySelected(entity) && canControlEntity(entity)) {
      showContextMenu(e.clientX, e.clientY);
    } else {
      hideContextMenu();
    }
  });

  contextDelete.addEventListener('click', () => {
    deleteSelectedEntities();
    hideContextMenu();
  });

  document.addEventListener('click', (e) => {
    if (contextMenuVisible && !contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });


  // Dice and chat
  const logEl = document.getElementById('log');
  const commandInput = document.getElementById('command-input');

  function addMessage(msgObj) {
    messages.push(msgObj);
    renderLog();
  }

  function renderLog() {
    let displayText = '';
    for (let msg of messages) {
      if (!msg.private) {
        displayText += `${msg.sender}: ${msg.text}\n`;
      } else {
        if (isDM() || (msg.recipients && msg.recipients.includes(currentUser))) {
          let recipientsStr = msg.recipients.join(', ');
          displayText += `${msg.sender} -> ${recipientsStr}: ${msg.text}\n`;
        }
      }
    }
    logEl.textContent = displayText;
    logEl.scrollTop = logEl.scrollHeight;
  }

  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.value.trim();
      commandInput.value = '';

      if (!command) return;

      if (command.toLowerCase().startsWith('/roll')) {
        const parts = command.split(/\s+/);
        let recipients = null; 
        let diceExprIndex = 1;

        if (parts.length > 2 && parts[1].toLowerCase() === '/w') {
          recipients = [];
          let i = 2;
          for (; i<parts.length; i++) {
            if (parts[i].match(/d/)) {
              diceExprIndex = i;
              break;
            } else {
              if (users.includes(parts[i])) {
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
            if (!recipients.includes(currentUser)) recipients.push(currentUser);
            addMessage({text:result, sender:currentUser, private:true, recipients:recipients});
          } else {
            addMessage({text:result, sender:currentUser, private:false});
          }
        } else {
          addMessage({text:"No dice expression provided.", sender:"System", private:false});
        }

      } else if (command.startsWith('/')) {
        addMessage({text:`Unrecognized command: ${command}`, sender:"System", private:false});
      } else {
        addMessage({text:command, sender:currentUser, private:false});
      }
    }
  });

  function rollSingleDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function rollCombinedDiceExpression(expression) {
    const originalExpr = expression;
    expression = expression.trim().replace(/\s+/g,'');
    const regex = /([+\-])?(\d*d\d+|\d+)/gi;
    let total = 0;
    let detailParts = [];
    let match;

    while((match = regex.exec(expression)) !== null) {
      let sign = match[1] || '+';
      let token = match[2];

      let signFactor = (sign === '-') ? -1 : 1;

      if (token.includes('d')) {
        let [diceCountStr, sidesStr] = token.split('d');
        let diceCount = parseInt(diceCountStr || '1', 10);
        let sides = parseInt(sidesStr,10);

        let rolls = [];
        for (let i=0; i<diceCount; i++){
          let result = rollSingleDice(sides);
          rolls.push(result);
        }

        let sumRolls = rolls.reduce((a,b)=>a+b,0);
        total += sumRolls * signFactor;
        detailParts.push(`${sign}${diceCount}d${sides} [${rolls.join(',')}]`);
      } else {
        let num = parseInt(token,10);
        total += num * signFactor;
        detailParts.push(`${sign}${num}`);
      }
    }

    let detailStr = detailParts.join('');
    detailStr = detailStr.replace(/^\+/,''); 
    return `Rolled ${originalExpr}: ${detailStr} = ${total}`;
  }

  document.querySelectorAll('.dice-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const sides = parseInt(btn.dataset.sides, 10);
      const result = rollSingleDice(sides);
      addMessage({text:`Rolled d${sides}: ${result}`, sender:currentUser, private:false});
    });
  });

  document.getElementById('roll-expression').addEventListener('click', () => {
    const expr = document.getElementById('dice-expression').value;
    if (expr) {
      const result = rollCombinedDiceExpression(expr);
      addMessage({text:result, sender:currentUser, private:false});
    }
  });

  // Helper functions
  function canControlEntity(entity) {
    if (entity.type === "character") {
      let ch = getCharacterById(entity.id);
      return ch && (isDM() || ch.owner === currentUser);
    } else {
      return isDM(); // only DM controls monsters
    }
  }

  function getCharacterById(id) {
    return characters.find(ch => ch.id === id);
  }

  function getMonsterById(id) {
    return monsters.find(m => m.id === id);
  }

  function getEntityPosition(type,id) {
    for (const key in entityTokens) {
      const et = entityTokens[key];
      if (et.type===type && et.id===id) {
        const [r,c] = key.split(',').map(Number);
        return {row:r,col:c};
      }
    }
    return null;
  }

  function isEntitySelected(ent) {
    return selectedEntities.some(e => e.type===ent.type && e.id===ent.id);
  }

  function updateSelectionStyles() {
    const cells = gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.classList.remove('selected'));

    for (let ent of selectedEntities) {
      const pos = getEntityPosition(ent.type,ent.id);
      if (pos) {
        const cell = gridEl.querySelector(`td[data-row='${pos.row}'][data-col='${pos.col}']`);
        if (cell) cell.classList.add('selected');
      }
    }
  }

  function moveSelectedEntities(rowOffset, colOffset) {
    let newPositions = [];
    for (let i=0; i<selectedEntities.length; i++) {
      const ent = selectedEntities[i];
      const oldPos = originalPositions[i];
      const newRow = oldPos.row + rowOffset;
      const newCol = oldPos.col + colOffset;
      if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
        return;
      }
      const destKey = `${newRow},${newCol}`;
      if (entityTokens[destKey] && !selectedEntities.some(se => {
        const p = getEntityPosition(se.type,se.id);
        return p && p.row===newRow && p.col===newCol;
      })) {
        return;
      }
      newPositions.push({...ent, row:newRow, col:newCol});
    }

    for (const ent of selectedEntities) {
      const pos = getEntityPosition(ent.type, ent.id);
      if (pos) delete entityTokens[`${pos.row},${pos.col}`];
    }

    for (const np of newPositions) {
      entityTokens[`${np.row},${np.col}`] = {type:np.type, id:np.id};
    }

    redrawBoard();
  }

  function redrawBoard() {
    const cells = gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.textContent = '');
    for (const key in entityTokens) {
      const et = entityTokens[key];
      const [r,c] = key.split(',').map(Number);
      const cell = gridEl.querySelector(`td[data-row='${r}'][data-col='${c}']`);
      if (et.type==="character") cell.textContent = '@';
      else cell.textContent = 'M';
    }
    updateSelectionStyles();
  }

  function highlightDragPositions(rowOffset, colOffset) {
    clearDragHighlights();
    for (let i=0; i<selectedEntities.length; i++) {
      const ent = selectedEntities[i];
      const oldPos = originalPositions[i];
      const nr = oldPos.row + rowOffset;
      const nc = oldPos.col + colOffset;
      if (nr >=0 && nr<rows && nc>=0 && nc<cols) {
        const cell = gridEl.querySelector(`td[data-row='${nr}'][data-col='${nc}']`);
        if (cell) cell.style.outline = '2px dashed green';
      }
    }
  }

  function clearDragHighlights() {
    const cells = gridEl.querySelectorAll('td');
    cells.forEach(cell => cell.style.outline = '');
  }

  function showContextMenu(x,y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenuVisible = true;
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
    contextMenuVisible = false;
  }

  function deleteSelectedEntities() {
    for (let ent of selectedEntities) {
      const pos = getEntityPosition(ent.type,ent.id);
      if (pos) delete entityTokens[`${pos.row},${pos.col}`];
      if (ent.type==="character") {
        const ch = getCharacterById(ent.id);
        if (ch) ch.placed = false;
      }
      // Monsters don't have a placed flag in this example, but could be added
    }
    selectedEntities = [];
    redrawBoard();
    renderCharacterList();
    renderMonsterList();
  }

  function getEntitiesInMarquee() {
    const cellWidth = 40;
    const cellHeight = 40;
    let selected = [];
    for (const key in entityTokens) {
      const [r,c] = key.split(',').map(Number);
      const cellX = c * cellWidth;
      const cellY = r * cellHeight;

      if (cellX < marqueeRect.x + marqueeRect.w &&
          cellX + cellWidth > marqueeRect.x &&
          cellY < marqueeRect.y + marqueeRect.h &&
          cellY + cellHeight > marqueeRect.y) {
        selected.push({type:entityTokens[key].type, id:entityTokens[key].id});
      }
    }
    return selected;
  }

  // Attacks
  function getPossibleTargets(attackerType, attackerData) {
    let targets = characters.map(ch => ({type:"character",id:ch.id,name:ch.name, placed:ch.placed}));
    for (const key in entityTokens) {
      const et = entityTokens[key];
      if (et.type==="character") {
        // already included as all characters known
      } else {
        const m = getMonsterById(et.id);
        if (m && !targets.find(t=>t.type==="monster"&&t.id===m.id)) {
          targets.push({type:"monster",id:m.id,name:m.name,placed:true});
        }
      }
    }
    // Remove self
    targets = targets.filter(t=>t.name!==attackerData.name);
    return targets;
  }

  function rollDamageDice(diceExp, statMod, baseMod, customMod) {
    const match = diceExp.match(/(\d+)d(\d+)/);
    let diceCount = parseInt(match[1],10);
    let diceSides = parseInt(match[2],10);
    let rolls = [];
    for (let i=0; i<diceCount; i++){
      rolls.push(rollSingleDice(diceSides));
    }
    let sum = rolls.reduce((a,b)=>a+b,0) + statMod + baseMod + customMod;
    return {total:sum, details:`(${rolls.join(',')})+Stat(${statMod})+Wep(${baseMod})+Custom(${customMod})`};
  }

  function performAttack(entityData, type, attackEntry, weapon) {
    let possibleTargets = getPossibleTargets(type, entityData);
    if (possibleTargets.length===0) {
      addMessage({sender:"System",text:"No targets available."});
      return;
    }

    let targetName = prompt("Choose a target (Type exact name):\n"+possibleTargets.map(pt=>pt.name).join('\n'));
    if (!targetName) return;
    let target = possibleTargets.find(pt=>pt.name===targetName);
    if (!target) {
      addMessage({sender:"System",text:"Invalid target selected."});
      return;
    }

    let statVal = entityData[weapon.stat];
    let statMod = Math.floor((statVal - 10)/2);
    let roll = rollSingleDice(20);
    let totalAttack = roll + statMod + weapon.baseMod + attackEntry.customMod;

    let damage = rollDamageDice(weapon.damageDice, statMod, weapon.baseMod, attackEntry.customMod);

    addMessage({sender:entityData.name,
      text:`Attacks ${target.name} with ${weapon.name}!\nAttack Roll: d20(${roll})+Stat(${statMod})+Wep(${weapon.baseMod})+Custom(${attackEntry.customMod}) = ${totalAttack}\nDamage: ${damage.details} = ${damage.total}`});
  }

  // Rendering sheets
  const sheetModal = document.getElementById('character-sheet-modal');
  const monsterSheetModal = document.getElementById('monster-sheet-modal');
  const closeSheet = document.getElementById('close-sheet');
  const closeMonsterSheet = document.getElementById('close-monster-sheet');
  const charNameEl = document.getElementById('character-name');
  const charDetailsEl = document.getElementById('character-details');
  const charAttacksEl = document.getElementById('character-attacks');

  const monsterNameEl = document.getElementById('monster-name');
  const monsterDetailsEl = document.getElementById('monster-details');
  const monsterAttacksEl = document.getElementById('monster-attacks');

  closeSheet.onclick = () => sheetModal.style.display = "none";
  closeMonsterSheet.onclick = () => monsterSheetModal.style.display = "none";

  function renderAttacksSection(entityData, type, containerEl) {
    containerEl.innerHTML = `<h4>Attacks</h4>`;
    if (!entityData.attacks || entityData.attacks.length===0) {
      containerEl.innerHTML += `<p>No attacks.</p>`;
      return;
    }

    for (let att of entityData.attacks) {
      const w = weapons.find(wep=>wep.id===att.weaponId);
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

  function openCharacterSheet(ch) {
    charNameEl.textContent = ch.name;
    charDetailsEl.innerHTML = `
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
    renderAttacksSection(ch, "character", charAttacksEl);
    sheetModal.style.display = "block";
  }

  function openMonsterSheet(m) {
    monsterNameEl.textContent = m.name;
    monsterDetailsEl.innerHTML = `
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
    renderAttacksSection(m, "monster", monsterAttacksEl);
    monsterSheetModal.style.display = "block";
  }

  // Create Character Modal
  const createCharacterModal = document.getElementById('create-character-modal');
  const closeCreateCharacter = document.getElementById('close-create-character');
  const createCharacterForm = document.getElementById('create-character-form');
  const attackCreationList = document.getElementById('attack-creation-list');
  const addAttackBtn = document.getElementById('add-attack-btn');
  const assignOwnerField = document.getElementById('assign-owner-field');
  const createCharacterBtn = document.getElementById('create-character-btn');

  createCharacterBtn.addEventListener('click', () => {
    if (isDM()) {
      assignOwnerField.style.display = "block";
    } else {
      assignOwnerField.style.display = "none";
    }
    createCharacterModal.style.display = "block";
  });

  closeCreateCharacter.onclick = () => createCharacterModal.style.display = "none";

  addAttackBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'attack-input-row';
    row.innerHTML = `
      <select class="attack-weapon-select" required>
        <option value="">--Select Weapon--</option>
        ${weapons.map(w=>`<option value="${w.id}">${w.name}</option>`).join('')}
      </select>
      <input type="number" class="attack-custom-mod" value="0" style="width:50px;" title="Custom modifier" />
      <button type="button" class="remove-attack">X</button>
    `;
    attackCreationList.appendChild(row);
    const removeBtn = row.querySelector('.remove-attack');
    removeBtn.addEventListener('click', () => {
      row.remove();
    });
  });

  createCharacterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(createCharacterForm);
    let owner = currentUser;
    if (isDM()) {
      owner = formData.get('owner') || owner;
      if (!users.includes(owner)) owner = "DM";
    }
    const newChar = {
      id: nextCharacterId++,
      owner: owner,
      name: formData.get('name'),
      class: formData.get('class'),
      level: parseInt(formData.get('level'),10),
      HP: parseInt(formData.get('HP'),10),
      AC: parseInt(formData.get('AC'),10),
      STR: parseInt(formData.get('STR'),10),
      DEX: parseInt(formData.get('DEX'),10),
      CON: parseInt(formData.get('CON'),10),
      INT: parseInt(formData.get('INT'),10),
      WIS: parseInt(formData.get('WIS'),10),
      CHA: parseInt(formData.get('CHA'),10),
      placed: false,
      attacks: []
    };

    const weaponSelects = createCharacterForm.querySelectorAll('.attack-weapon-select');
    const customMods = createCharacterForm.querySelectorAll('.attack-custom-mod');
    for (let i=0; i<weaponSelects.length; i++) {
      const wid = parseInt(weaponSelects[i].value,10);
      if (!isNaN(wid)) {
        const cmod = parseInt(customMods[i].value,10) || 0;
        newChar.attacks.push({weaponId:wid, customMod:cmod});
      }
    }

    characters.push(newChar);
    createCharacterModal.style.display = "none";
    createCharacterForm.reset();
    attackCreationList.innerHTML = '';
    renderCharacterList();
  });

  // Drag from lists
  let draggedCharId = null;
  let draggedMonsterId = null;

  function placeCharacterOnBoard(charId, row, col) {
    const ch = getCharacterById(charId);
    if (!ch) return;
    if (ch.placed) return;
    if (!canControlEntity({type:"character",id:charId})) return;

    const key = `${row},${col}`;
    if (entityTokens[key]) return;
    entityTokens[key] = {type:"character",id:charId};
    ch.placed = true;
    redrawBoard();
    renderCharacterList();
  }

  function placeMonsterOnBoard(monId, row, col) {
    const m = getMonsterById(monId);
    if (!m) return;
    if (!isDM()) return;
    const key = `${row},${col}`;
    if (entityTokens[key]) return;
    entityTokens[key] = {type:"monster",id:monId};
    redrawBoard();
    renderMonsterList();
  }

  const userSelectEl = document.getElementById('user-select');
  userSelectEl.addEventListener('change', (e) => {
    currentUser = e.target.value;
    renderCharacterList();
    renderMonsterList();
    renderLog();
  });

  // Render character and monster lists
  const characterListEntries = document.getElementById('character-list-entries');
  const monsterList = document.getElementById('monster-list');
  const monsterFilter = document.getElementById('monster-filter');
  const monsterListEntries = document.getElementById('monster-list-entries');

  function renderCharacterList() {
    characterListEntries.innerHTML = '';
    let visibleChars = characters.filter(ch => isDM() || ch.owner === currentUser);
    for (let ch of visibleChars) {
      const div = document.createElement('div');
      div.className = 'character-list-item';

      const canPlace = !ch.placed && canControlEntity({type:"character",id:ch.id});

      const dragIcon = document.createElement('span');
      dragIcon.textContent = '⚔';
      dragIcon.className = 'drag-icon';
      dragIcon.setAttribute('draggable', canPlace ? 'true' : 'false');
      if (canPlace) {
        dragIcon.addEventListener('dragstart', (ev) => {
          draggedCharId = ch.id;
          draggedMonsterId = null;
        });
        dragIcon.addEventListener('dragend', (ev) => {
          draggedCharId = null;
        });
      }

      div.appendChild(dragIcon);

      let textNode = document.createTextNode(`${ch.name} (Owner: ${ch.owner})`);
      div.appendChild(textNode);

      let openBtn = document.createElement('button');
      openBtn.textContent = 'Open Sheet';
      openBtn.disabled = !canControlEntity({type:"character", id:ch.id});
      openBtn.addEventListener('click', () => {
        if (canControlEntity({type:"character", id:ch.id})) {
          openCharacterSheet(ch);
        }
      });

      div.appendChild(openBtn);
      characterListEntries.appendChild(div);
    }
  }

  function renderMonsterList() {
    if (isDM()) {
      monsterList.style.display = "block";
    } else {
      monsterList.style.display = "none";
      return;
    }

    monsterListEntries.innerHTML = '';
    const filter = monsterFilter.value;
    let filtered = monsters;
    if (filter) {
      filtered = monsters.filter(m => m.habitats.includes(filter));
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
        dragIcon.addEventListener('dragstart', (ev) => {
          draggedMonsterId = m.id;
          draggedCharId = null;
        });
        dragIcon.addEventListener('dragend', (ev) => {
          draggedMonsterId = null;
        });
      }

      div.appendChild(dragIcon);

      let textNode = document.createTextNode(`${m.name}`);
      div.appendChild(textNode);

      let openBtn = document.createElement('button');
      openBtn.textContent = 'View Stats';
      openBtn.addEventListener('click', () => {
        if (isDM()) {
          openMonsterSheet(m);
        }
      });

      div.appendChild(openBtn);
      monsterListEntries.appendChild(div);
    }
  }

  monsterFilter.addEventListener('change', renderMonsterList);

  // Initial
  renderCharacterList();
  renderMonsterList();
  renderLog();
