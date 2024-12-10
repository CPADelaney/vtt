// app.js

import { Board } from './board.js';
import { CharacterManager } from './characterManager.js';
import { MonsterManager } from './monsterManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { CampaignManager } from './campaignManager.js';

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

    this.currentAction = null; // { type: 'attack', attacker: {...}, attackData: {...}, weapon: {...} }
    this.recentStates = []; // For undo: store snapshots of state before actions
    this.maxUndo = 5;

    this.campaignManager = new CampaignManager(this); // Initialize the campaign manager
  }

  initialize() {
    this.campaignManager.loadState();
    
    this.board.initialize();
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
  }

  startAction(action) {
    // action = { type: 'attack', attacker: entityData, att: attackEntry, weapon: weapon }
    this.currentAction = action;
  }
  
  clearAction() {
    this.currentAction = null;
  }

  saveStateForUndo() {
    // Save a snapshot of current state for undo
    const state = this.campaignManager.gatherStateFromApp();
    this.recentStates.push(JSON.stringify(state));
    if (this.recentStates.length > this.maxUndo) {
      this.recentStates.shift();
    }
  }

  undoLastAction() {
    if (this.recentStates.length === 0) return;

    const lastStateJSON = this.recentStates.pop();
    const lastState = JSON.parse(lastStateJSON);
    this.campaignManager.applyStateToApp(lastState);
    this.board.redrawBoard();
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
  }
  
  saveCampaign() {
    this.campaignManager.saveState();
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

  deleteSelectedEntities() {
  const selected = this.board.selectedEntities;
  for (let ent of selected) {
    // Find the entity position
    const pos = this.board.getEntityPosition(ent.type, ent.id);
    if (pos) {
      const key = `${pos.row},${pos.col}`;
      delete this.entityTokens[key];
    }

    // If this is a character, also mark as not placed if needed
    if (ent.type === 'character') {
      const ch = this.getCharacterById(ent.id);
      if (ch) ch.placed = false;
    }
  }

  // Clear the selection after deletion
  this.board.selectedEntities = [];

  // Redraw the board and update UI
  this.board.redrawBoard();
  this.uiManager.renderCharacterList();
  this.uiManager.renderMonsterList();
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
  
    // First, validate that all selected entities can move
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (!pos) {
        // If an entity position is not found, skip it or consider invalid
        return; 
      }
  
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
  
      // Check bounds
      if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
        // Out of bounds: cancel the entire move
        return;
      }
  
      // Check if new position is free (optional)
      const newKey = `${newRow},${newCol}`;
      if (this.entityTokens[newKey]) {
        // Position already occupied: cancel the entire move
        return;
      }
    }
  
    // If we reach this point, all moves are valid. Proceed to actually move.
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (!pos) continue; // In case an entity disappeared
      
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      const oldKey = `${pos.row},${pos.col}`;
      const newKey = `${newRow},${newCol}`;
  
      delete this.entityTokens[oldKey];
      this.entityTokens[newKey] = { type: ent.type, id: ent.id };
    }
  
    // Redraw after moving everyone
    this.board.redrawBoard();
  }



}

