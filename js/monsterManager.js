// monsterManager.js

export class MonsterManager {
  constructor(app) {
    this.app = app;
  }

  getMonsterById(id) {
    return this.app.monsters.find(m => m.id === id);
  }

  // monsterManager.js
  placeMonsterOnBoard(monId, row, col) {
    console.log("placeMonsterOnBoard called with", monId, row, col);
    const m = this.getMonsterById(monId);
    if (!m) {
      console.log("No monster found with id:", monId);
      return;
    }
  
    if (!this.app.isDM()) {
      console.log("Not DM, cannot place monster");
      return;
    }
  
    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) {
      console.log("Cell already occupied by another entity");
      return;
    }
  
    this.app.entityTokens[key] = { type: "monster", id: monId };
    console.log("Monster placed on board at", key, this.app.entityTokens[key]);
  
    this.app.board.redrawBoard();
    this.app.uiManager.renderMonsterList();
  }


  addAttackToMonster(monId, attackId) {
    // DM method to add new attacks to a monster
    const m = this.getMonsterById(monId);
    if (!m) return;
    if (!m.attacks) m.attacks = [];
    m.attacks.push({ attackId: attackId });
    this.app.uiManager.renderMonsterList();
  }
}
