// characterManager.js

export class CharacterManager {
  constructor(app) {
    this.app = app;
  }

  getCharacterById(id) {
    return this.app.characters.find(ch => ch.id === id);
  }

  placeCharacterOnBoard(charId, row, col) {
    console.log("placeCharacterOnBoard called with", charId, row, col);
    const ch = this.getCharacterById(charId);
    if (!ch) {
      console.warn("No character found with id:", charId);
      return;
    }
    if (ch.placed) {
      console.warn("Character already placed:", ch);
      // Temporarily allow re-placement for debugging:
      // return;
    }
    if (!this.app.canControlEntity({ type: "character", id: charId })) {
      console.warn("Cannot control this character:", charId);
      return;
    }

    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) {
      console.warn("Cell already occupied at", key);
      return;
    }
    ch.placed = true;
    this.app.entityTokens[key] = { type: "character", id: charId };
    console.log("Character placed on board at", key, this.app.entityTokens[key]);
    console.log("Current entityTokens:", this.app.entityTokens);

    this.app.board.redrawBoard();
    console.log("After redrawBoard in placeCharacterOnBoard");
    this.app.uiManager.renderCharacterList();
    console.log("After renderCharacterList in placeCharacterOnBoard");
  }
  
  addAttackToCharacter(charId, attackId) {
    // DM method to add new attacks
    const ch = this.getCharacterById(charId);
    if (!ch) return;
    ch.attacks.push({ attackId: attackId });
    this.app.uiManager.renderCharacterList();
  }
  
}
