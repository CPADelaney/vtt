// characterManager.js

export class CharacterManager {
  constructor(app) {
    this.app = app;
  }

  getCharacterById(id) {
    return this.app.characters.find(ch => ch.id === id);
  }

  createCharacter(data, attacks) {
    // Give every character an unarmed strike (attackId:4) by default
    attacks.push({ attackId: 4 });

    const newChar = {
      id: this.app.nextCharacterId++,
      ...data,
      placed: false,
      attacks: attacks
    };
    this.app.characters.push(newChar);
    this.app.uiManager.renderCharacterList();
  }
  placeCharacterOnBoard(charId, row, col) {
    console.log("placeCharacterOnBoard called with", charId, row, col);
    const ch = this.getCharacterById(charId);
    if (!ch) {
      console.log("No character found with id:", charId);
      return;
    }
    // Temporarily remove condition if blocking:
    // if (ch.placed) {
    //   console.log("Character already placed");
    //   return;
    // }
  
    if (!this.app.canControlEntity({ type: "character", id: charId })) {
      console.log("Cannot control entity");
      return;
    }
  
    const key = `${row},${col}`;
    if (this.app.entityTokens[key]) {
      console.log("Cell already occupied");
      return;
    }
  
    ch.placed = true;
    this.app.entityTokens[key] = { type: "character", id: charId };
    console.log("Character placed on board at", key, this.app.entityTokens[key]);
  
    this.app.board.redrawBoard();
    this.app.uiManager.renderCharacterList();
  }

  addAttackToCharacter(charId, attackId) {
    // DM method to add new attacks
    const ch = this.getCharacterById(charId);
    if (!ch) return;
    ch.attacks.push({ attackId: attackId });
    this.app.uiManager.renderCharacterList();
  }
}
