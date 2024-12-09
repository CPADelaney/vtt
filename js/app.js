// app.js

import { Board } from './board.js';
import { CharacterManager } from './characterManager.js';
import { MonsterManager } from './monsterManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';

export class App {
  constructor() {
    // Configuration & Data
    this.rows = 8;
    this.cols = 8;
    this.users = ["DM", "Player1", "Player2"];
    this.currentUser = "DM";

    this.weapons = [
      { id: 1, name: "Short Sword", damageDice: "1d6", stat: "STR", baseMod: 2 },
      { id: 2, name: "Long Bow",    damageDice: "1d8", stat: "DEX", baseMod: 1 },
      { id: 3, name: "Dagger",      damageDice: "1d4", stat: "DEX", baseMod: 3 }
    ];

    this.characters = [];
    this.nextCharacterId = 1;

    this.monsters = [
      { id: 1, name: "Sand Wurm", HP: 50, AC: 14, STR: 18, DEX: 8, CON: 16, INT: 5, WIS: 10, CHA: 5, habitats: ["Desert"], attacks: [{ weaponId: 1, customMod: 0 }] },
      { id: 2, name: "Cactus Crawler", HP: 20, AC: 12, STR: 12, DEX: 14, CON: 10, INT: 2, WIS: 8, CHA: 6, habitats: ["Desert", "Grasslands"], attacks: [] },
      { id: 3, name: "River Drake", HP: 30, AC: 15, STR: 14, DEX: 12, CON: 13, INT: 6, WIS: 10, CHA: 8, habitats: ["Riverlands"], attacks: [] },
      { id: 4, name: "Plains Stalker", HP: 25, AC: 13, STR: 13, DEX: 16, CON: 11, INT: 4, WIS: 10, CHA: 6, habitats: ["Grasslands"], attacks: [] }
    ];

    this.entityTokens = {};
    this.messages = [];

    this.board = new Board(this.rows, this.cols, this.entityTokens, this);
    this.uiManager = new UIManager(this);
    this.chatManager = new ChatManager(this);
    this.characterManager = new CharacterManager(this);
    this.monsterManager = new MonsterManager(this);
  }

  initialize() {
    this.board.initialize();
    // After initialization, explicitly request the UI to render based on current data
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
  }

  isDM() {
    return this.currentUser === "DM";
  }

  canControlEntity(entity) {
    if (entity.type === "character") {
      const ch = this.characterManager.getCharacterById(entity.id);
      return ch && (this.isDM() || ch.owner === this.currentUser);
    } else {
      return this.isDM();
    }
  }

  placeCharacterOnBoard(charId, row, col) {
    this.characterManager.placeCharacterOnBoard(charId, row, col);
  }
  
  placeMonsterOnBoard(monId, row, col) {
    this.monsterManager.placeMonsterOnBoard(monId, row, col);
  }

  getCharacterById(id) {
    return this.characterManager.getCharacterById(id);
  }

  getMonsterById(id) {
    return this.monsterManager.getMonsterById(id);
  }

  isEntitySelected(ent) {
    return this.board.isEntitySelected(ent);
  }
  
  moveSelectedEntities(rowOffset, colOffset) {
    const selected = this.board.selectedEntities;
    
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (!pos) continue;
      
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
  
      if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
        // Out of bounds, skip
        continue;
      }
  
      // Remove the old position
      delete this.entityTokens[`${pos.row},${pos.col}`];
  
      // Place the entity at the new position
      const key = `${newRow},${newCol}`;
      if (!this.entityTokens[key]) {
        this.entityTokens[key] = { type: ent.type, id: ent.id };
      }
  
      // If you want to ensure the entity's "placed" property or other logic is updated,
      // you could call the manager's method again or just rely on this logic.
    }
  
    // Redraw the board after moving
    this.board.redrawBoard();
  }

}

