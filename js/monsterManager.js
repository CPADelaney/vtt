// monsterManager.js
export class MonsterManager {
  constructor(app) {
    this.app = app;
  }

  getMonsterById(id) {
    return this.app.monsters.find(m => m.id === id);
  }

  placeMonsterOnBoard(monId, row, col) {
    console.log("placeMonsterOnBoard called with", monId, row, col);
    const m = this.getMonsterById(monId);
    if (!m) {
      console.warn("No monster found with id:", monId);
      return;
    }
    if (!this.app.isDM()) {
      console.warn("Not DM, cannot place monster:", monId);
      return;
    }

    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) {
      console.warn("Cell occupied at", key);
      return;
    }
    this.app.entityTokens[key] = { type: "monster", id: monId };
    console.log("Monster placed on board at", key, this.app.entityTokens[key]);
    console.log("Current entityTokens:", this.app.entityTokens);

    this.app.board.redrawBoard();
    console.log("After redrawBoard in placeMonsterOnBoard");
    this.app.uiManager.renderMonsterList();
    console.log("After renderMonsterList in placeMonsterOnBoard");
  }

  addAttackToMonster(monId, attackId) {
    const m = this.getMonsterById(monId);
    if (!m) {
      console.warn("No monster with id", monId);
      return;
    }
    if (!m.attacks) m.attacks = [];
    m.attacks.push({ attackId });
    console.log("Attack added to monster", monId, "Attacks:", m.attacks);
    this.app.uiManager.renderMonsterList();
  }
}
