import { Board } from './board.js';
import { CharacterManager } from './characterManager.js';
import { MonsterManager } from './monsterManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { CampaignManager } from './campaignManager.js';
import { mergeMonstersWithBestiary } from './update.js';
import { bestiary } from './monsters.js';
import { weapons } from './items.js';

export class App {
  constructor() {
    this.rows = 8;
    this.cols = 8;
    this.users = ["DM", "Player1", "Player2"];
    this.currentUser = "DM";

    this.weapons = weapons; 
    this.characters = [];
    this.nextCharacterId = 1;
    this.monsters = bestiary;
    this.placedMonsters = [];
    this.nextMonsterInstanceId = 10000;

    this.entityTokens = {};
    this.messages = [];

    this.board = new Board(this.rows, this.cols, this.entityTokens, this);
    this.uiManager = new UIManager(this);
    this.chatManager = new ChatManager(this);
    this.characterManager = new CharacterManager(this);
    this.monsterManager = new MonsterManager(this);

    this.currentAction = null;
    this.recentStates = []; 
    this.maxUndo = 5;

    this.campaignManager = new CampaignManager(this);
  }

  initialize() {
    this.campaignManager.loadState();
    this.monsters = mergeMonstersWithBestiary(this.monsters, bestiary);
    this.board.initialize();
    this.uiManager.renderCharacterList();
    this.uiManager.renderMonsterList();
    this.uiManager.renderLog();
  }

  startAction(action) {
    this.currentAction = action;
  }

  clearAction() {
    this.currentAction = null;
  }

  saveStateForUndo() {
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
    const type = entity.type;
    const id = entity.id;
    if (type === "character") {
      const ch = this.characterManager.getCharacterById(id);
      return ch && (this.isDM() || ch.owner === this.currentUser);
    } else {
      return this.isDM();
    }
  }

  deleteSelectedEntities() {
    const selected = this.board.selectedEntities;
    for (let ent of selected) {
      const pos = this.board.getEntityPosition(ent.type, ent.id);
      if (pos) {
        const key = `${pos.row},${pos.col}`;
        delete this.entityTokens[key];
      }

      if (ent.type === 'character') {
        const ch = this.getCharacterById(ent.id);
        if (ch) ch.placed = false;
      }

      if (ent.type === 'monster') {
        const idx = this.placedMonsters.findIndex(pm => pm.id === ent.id);
        if (idx !== -1) this.placedMonsters.splice(idx, 1);
      }
    }

    this.board.selectedEntities = [];
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
    return this.placedMonsters.find(m => m.id === id) || null;
  }

  // New Method: moveEntity
  moveEntity(type, id, row, col) {
    const pos = this.board.getEntityPosition(type, id);
    if (!pos) {
      console.warn("No position found for entity:", { type, id });
      return; 
    }

    const newKey = `${row},${col}`;
    if (this.entityTokens[newKey]) {
      console.warn("Cell occupied at", newKey, "cannot move entity here.");
      return;
    }

    const oldKey = `${pos.row},${pos.col}`;
    delete this.entityTokens[oldKey];
    this.entityTokens[newKey] = { type, id };

    if (type === 'character') {
      const ch = this.getCharacterById(id);
      if (ch) ch.placed = true;
    }

    this.board.redrawBoard();
  }
}
