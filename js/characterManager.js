// characterManager.js
// Contains logic for character data manipulation only.

export class CharacterManager {
  constructor(app) {
    this.app = app;
  }

  getCharacterById(id) {
    return this.app.characters.find(ch => ch.id === id);
  }

  createCharacter(data, attacks) {
    const newChar = {
      id: this.app.nextCharacterId++,
      ...data,
      placed: false,
      attacks: attacks
    };
    this.app.characters.push(newChar);
    // After updating data, request UI update
    this.app.uiManager.renderCharacterList();
  }

  placeCharacterOnBoard(charId, row, col) {
    const ch = this.getCharacterById(charId);
    if (!ch) return;
    if (ch.placed) return;
    if (!this.app.canControlEntity({ type: "character", id: charId })) return;

    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) return;
    this.app.entityTokens[key] = { type: "character", id: charId };
    ch.placed = true;
    this.app.board.redrawBoard();
    this.app.uiManager.renderCharacterList();
  }
}
