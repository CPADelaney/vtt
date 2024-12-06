// js/main.js
import { buildBoard } from './board.js';
import { renderCharacterList, renderMonsterList } from './ui.js';
import { renderLog, addMessage } from './chat.js';
import { handleCommand } from './commands.js';
import { isDM, rollSingleDice } from './utils.js';
import { currentUser, setCurrentUser } from './data.js';
import { rollCombinedDiceExpression } from './dice.js';
import { weapons } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
  buildBoard();
  renderCharacterList();
  renderMonsterList();
  renderLog();

  const userSelectEl = document.getElementById('user-select');
  userSelectEl.addEventListener('change', (e) => {
    setCurrentUser(e.target.value);
    renderCharacterList();
    renderMonsterList();
    renderLog();
  });

  const commandInput = document.getElementById('command-input');
  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.value.trim();
      commandInput.value = '';
      handleCommand(command);
    }
  });

  document.querySelectorAll('.dice-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const sides = parseInt(btn.dataset.sides, 10);
      const result = rollSingleDice(sides);
      addMessage({ text: `Rolled d${sides}: ${result}`, sender: currentUser, private: false });
    });
  });

  document.getElementById('roll-expression').addEventListener('click', () => {
    const expr = document.getElementById('dice-expression').value;
    if (expr) {
      const result = rollCombinedDiceExpression(expr);
      addMessage({ text: result, sender: currentUser, private: false });
    }
  });

  const createCharacterBtn = document.getElementById('create-character-btn');
  const createCharacterModal = document.getElementById('create-character-modal');
  const closeCreateCharacter = document.getElementById('close-create-character');
  const createCharacterForm = document.getElementById('create-character-form');
  const attackCreationList = document.getElementById('attack-creation-list');
  const addAttackBtn = document.getElementById('add-attack-btn');
  const assignOwnerField = document.getElementById('assign-owner-field');

  createCharacterBtn.addEventListener('click', () => {
    if (isDM()) {
      assignOwnerField.style.display = "block";
    } else {
      assignOwnerField.style.display = "none";
    }
    createCharacterModal.style.display = "block";
  });

  closeCreateCharacter.onclick = () => {
    createCharacterModal.style.display = "none";
  };

  addAttackBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'attack-input-row';
    row.innerHTML = `
      <select class="attack-weapon-select" required>
        <option value="">--Select Weapon--</option>
        ${weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
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
      if (!["DM", "Player1", "Player2"].includes(owner)) owner = "DM";
    }
    const newChar = {
      id: nextCharacterId++,
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

    const weaponSelects = createCharacterForm.querySelectorAll('.attack-weapon-select');
    const customMods = createCharacterForm.querySelectorAll('.attack-custom-mod');
    for (let i = 0; i < weaponSelects.length; i++) {
      const wid = parseInt(weaponSelects[i].value, 10);
      if (!isNaN(wid)) {
        const cmod = parseInt(customMods[i].value, 10) || 0;
        newChar.attacks.push({ weaponId: wid, customMod: cmod });
      }
    }

    characters.push(newChar);
    createCharacterModal.style.display = "none";
    createCharacterForm.reset();
    attackCreationList.innerHTML = '';
    renderCharacterList();
  });

  const closeSheet = document.getElementById('close-sheet');
  closeSheet.onclick = () => {
    document.getElementById('character-sheet-modal').style.display = "none";
  };

  const closeMonsterSheet = document.getElementById('close-monster-sheet');
  closeMonsterSheet.onclick = () => {
    document.getElementById('monster-sheet-modal').style.display = "none";
  };
});

// Function to set currentUser in data.js
export function setCurrentUser(user) {
  currentUser = user;
}
