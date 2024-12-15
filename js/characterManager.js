export class CharacterManager {
    constructor(app) {
      this.app = app;
    }

    getCharacterById(id) {
      return this.app.characters.find(ch => ch.id === id);
    }

    createCharacter(newCharData, attacks) {

      const newChar = {
        id: this.app.nextCharacterId++,
        ...newCharData,
        placed: false,
        attacks: attacks || []
      };
      this.app.characters.push(newChar);
      console.log("Character created:", newChar);

      this.app.uiManager.renderCharacterList();
    }

    placeCharacterOnBoard(charId, row, col) {
      console.log("placeCharacterOnBoard called with", charId, row, col);
      const ch = this.getCharacterById(charId);
      if (!ch) {
        console.warn("No character found with id:", charId);
        return;
      }
      // If you have a condition like ch.placed, comment it out for testing:
      if (ch.placed) return;

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
      const ch = this.getCharacterById(charId);
      if (!ch) {
addAttackToCharacter(charId, attackId) {
    const ch = this.getCharacterById(charId);
    if (!ch) {
        console.warn("No character with id", charId);
        return;
      }
      ch.attacks.push({ attackId });
      console.log("Attack added to character", charId, "Attacks:", ch.attacks);
      this.app.uiManager.renderCharacterList();
    }
  }
    ch.attacks.push({ attackId });
    console.log("Attack added to character", charId, "Attacks:", ch.attacks);
    // Dynamically update the modal content
    if (this.app.uiManager.sheetModal.style.display === 'block') {
        this.app.uiManager.renderAttacksSection(ch, 'character', document.getElementById('character-attacks'));
    }
}
