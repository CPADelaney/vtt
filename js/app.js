// app.js

import { Board } from './board.js';
import { CharacterManager } from './characterManager.js';
import { MonsterManager } from './monsterManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { CampaignManager } from './campaignManager.js';
import { initialMonsters } from './monsters.js';
import { attacksData, weapons } from './attacks.js'; // Import weapons here

export class App {
  constructor() {
    // Configuration & Data
    console.log("App constructor called");
    this.rows = 8;
    this.cols = 8;
    this.users = ["DM", "Player1", "Player2"];
    this.currentUser = "DM"; // Default to DM for easier testing

    // Use the imported weapons array instead of defining inline
    this.weapons = weapons;

    this.characters = [];
    this.nextCharacterId = 1;
    
    // Monsters are templates
    this.monsters = initialMonsters;

    // Placed instances of monsters
    this.placedMonsters = [];
    this.nextMonsterInstanceId = 10000;

    this.entityTokens = {};
    this.messages = [];

    // Initialize managers and board
    console.log("Initializing Board and Managers");
    this.board = new Board(this.rows, this.cols, this.entityTokens, this);
    this.uiManager = new UIManager(this);
    this.chatManager = new ChatManager(this);
    this.characterManager = new CharacterManager(this);
    this.monsterManager = new MonsterManager(this);

    this.currentAction = null; // For attacks/actions
    this.recentStates = []; 
    this.maxUndo = 5;

    this.campaignManager = new CampaignManager(this);
  }

  initialize() {
    console.log("App initialize called");
    this.campaignManager.loadState();
    
    // Initialize board after loading state
    this.board.initialize();

    // Render initial UI
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
    console.log("App initialized and UI rendered");
  }

  startAction(action) {
    console.log("startAction called with:", action);
    this.currentAction = action;
  }
  
  clearAction() {
    console.log("clearAction called");
    this.currentAction = null;
  }

  saveStateForUndo() {
    console.log("saveStateForUndo called");
    const state = this.campaignManager.gatherStateFromApp();
    this.recentStates.push(JSON.stringify(state));
    if (this.recentStates.length > this.maxUndo) {
      this.recentStates.shift();
    }
    console.log("State saved, undo stack size:", this.recentStates.length);
  }

  undoLastAction() {
    console.log("undoLastAction called");
    if (this.recentStates.length === 0) {
      console.warn("No states to undo");
      return;
    }

    const lastStateJSON = this.recentStates.pop();
    const lastState = JSON.parse(lastStateJSON);
    this.campaignManager.applyStateToApp(lastState);
    this.board.redrawBoard();
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
    console.log("Last action undone");
  }
  
  saveCampaign() {
    console.log("saveCampaign called");
    this.campaignManager.saveState();
  }

  isDM() {
    return this.currentUser === "DM";
  }

  canControlEntity(entity) {
    const type = entity.type;
    const id = entity.id;
    if (type === "character") {
      const ch = this.characterManager.getCharacterById(id);
      return ch && (this.isDM() || ch.owner === this.currentUser);
    } else {
      // For monsters, only DM controls
      return this.isDM();
    }
  }

  deleteSelectedEntities() {
    console.log("deleteSelectedEntities called");
    const selected = this.board.selectedEntities;
    console.log("Deleting selected:", selected);
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (pos) {
        const key = `${pos.row},${pos.col}`;
        delete this.entityTokens[key];
        console.log("Deleted entity from:", key);
      }

      // If character, mark not placed
      if (ent.type === 'character') {
        const ch = this.getCharacterById(ent.id);
        if (ch) {
          ch.placed = false;
          console.log("Marked character as not placed:", ch);
        }
      }

      // If monster, remove from placedMonsters
      if (ent.type === 'monster') {
        const idx = this.placedMonsters.findIndex(pm => pm.id === ent.id);
        if (idx !== -1) {
          this.placedMonsters.splice(idx, 1);
          console.log("Removed placed monster instance:", ent.id);
        }
      }
    }

    this.board.selectedEntities = [];

    this.board.redrawBoard();
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    console.log("Entities deleted and UI updated");
  }

  placeCharacterOnBoard(charId, row, col) {
    console.log("App.placeCharacterOnBoard called with", charId, row, col);
    this.characterManager.placeCharacterOnBoard(charId, row, col);
  }
  
  placeMonsterOnBoard(monId, row, col) {
    console.log("App.placeMonsterOnBoard called with", monId, row, col);
    this.monsterManager.placeMonsterOnBoard(monId, row, col);
  }

  getCharacterById(id) {
    return this.characterManager.getCharacterById(id);
  }

  getMonsterById(id) {
    // Look up placed monsters instead of the template monsters
    return this.placedMonsters.find(m => m.id === id) || null;
  }

  isEntitySelected(ent) {
    return this.board.isEntitySelected(ent);
  }
  
  moveSelectedEntities(rowOffset, colOffset) {
    console.log("moveSelectedEntities called with offsets:", rowOffset, colOffset);
    const selected = this.board.selectedEntities;
  
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (!pos) {
        console.warn("No position found for entity:", ent);
        return; 
      }
  
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
        console.warn("Move out of bounds:", newRow, newCol);
        return;
      }
  
      const newKey = `${newRow},${newCol}`;
      if (this.entityTokens[newKey]) {
        console.warn("Cell occupied at", newKey);
        return;
      }
    }
  
    // Perform move
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (!pos) continue; 
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      const oldKey = `${pos.row},${pos.col}`;
      const newKey = `${newRow},${newCol}`;
      delete this.entityTokens[oldKey];
      this.entityTokens[newKey] = { type: ent.type, id: ent.id };
      console.log("Moved entity to:", newKey);
    }
  
    this.board.redrawBoard();
    console.log("Entities moved and board redrawn");
  }
}
