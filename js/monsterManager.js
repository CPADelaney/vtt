// monsterManager.js
// Contains logic for monster data manipulation only.

export class MonsterManager {
  constructor(app) {
    this.app = app;
  }

  getMonsterById(id) {
    return this.app.monsters.find(m => m.id === id);
  }

  placeMonsterOnBoard(monId, row, col) {
    const m = this.getMonsterById(monId);
    if (!m) return;
    if (!this.app.isDM()) return;
    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) return;
    this.app.entityTokens[key] = { type: "monster", id: monId };
    this.app.board.redrawBoard();
    this.app.uiManager.renderMonsterList();
  }
}