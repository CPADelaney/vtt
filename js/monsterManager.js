// monsterManager.js
export class MonsterManager {
  constructor(app) {
    this.app = app;
  }

  // Find template monster by ID
  getTemplateMonsterById(id) {
    return this.app.monsters.find(m => m.id === id);
  }

  // Find placed monster instance by ID
  getMonsterById(id) {
    return this.app.placedMonsters.find(m => m.id === id) || null;
  }

  placeMonsterOnBoard(monId, row, col) {
    console.log("placeMonsterOnBoard called with", monId, row, col);
    const template = this.getTemplateMonsterById(monId);
    if (!template) {
      console.warn("No monster template found with id:", monId);
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

    const newMonster = JSON.parse(JSON.stringify(template));
    newMonster.id = this.app.nextMonsterInstanceId++;
    newMonster.templateId = monId; // store the original template ID
    this.app.placedMonsters.push(newMonster);

    this.app.entityTokens[key] = { type: "monster", id: newMonster.id };
    console.log("Monster placed on board at", key, this.app.entityTokens[key]);
    console.log("Current entityTokens:", this.app.entityTokens);

    this.app.board.redrawBoard();
    console.log("After redrawBoard in placeMonsterOnBoard");
    this.app.uiManager.renderMonsterList();
    console.log("After renderMonsterList in placeMonsterOnBoard");
  }

  addAttackToMonster(monId, attackId) {
    const template = this.getTemplateMonsterById(monId);
    if (!template) {
      console.warn("No monster template with id", monId);
      return;
addAttackToMonster(monId, attackId) {
    const monster = this.getTemplateMonsterById(monId);
    if (!monster) {
        console.warn("No monster with id", monId);
        return;
    }
    if (!template.attacks) template.attacks = [];
    template.attacks.push({ attackId });
    console.log("Attack added to monster template", monId, "Attacks:", template.attacks);
    this.app.uiManager.renderMonsterList();
  }
    monster.attacks.push({ attackId });
    console.log("Attack added to monster", monId, "Attacks:", monster.attacks);
    // Dynamically update the modal content
    if (this.app.uiManager.monsterSheetModal.style.display === 'block') {
        this.app.uiManager.renderAttacksSection(monster, 'monster', document.getElementById('monster-attacks'));
    }
}

  addCustomAttackToMonster(monId, customAttack) {
    const template = this.getTemplateMonsterById(monId);
    if (!template) {
      console.warn("No monster template found with id:", monId);
      return;
    }
    if (!template.attacks) template.attacks = [];
    // Assign a unique pseudo attackId
    const attackId = Date.now();
    template.attacks.push({ attackId, custom: customAttack });
    console.log("Custom attack added to monster template", monId, customAttack);
    this.app.uiManager.renderMonsterList();
  }
}
