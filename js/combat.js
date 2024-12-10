// js/combat.js
import { rollSingleDice } from './dice.js';

export function performAttack(entityData, type, attackEntry, weapon, appInstance, target) {
  let statVal = entityData[weapon.stat];
  let statMod = Math.floor((statVal - 10) / 2);
  let roll = rollSingleDice(20);
  let totalAttack = roll + statMod + weapon.baseMod + (attackEntry.customMod || 0);

  let damage = rollDamageDice(weapon.damageDice, statMod, weapon.baseMod, (attackEntry.customMod || 0));

  appInstance.chatManager.addMessage({
    sender: entityData.name,
    text: `Attacks a target with ${weapon.name}!\nAttack Roll: d20(${roll})+Stat(${statMod})+Wep(${weapon.baseMod})+Custom(${attackEntry.customMod||0}) = ${totalAttack}\nDamage: ${damage.details} = ${damage.total}`,
    private: false
  });

  applyDamage(target, damage.total, appInstance);
}

export function performAoeAttack(attacker, entityType, attackEntry, attackDef, appInstance, targets, aoePositions) {
  // Calculate damage
  const statVal = attacker[attackDef.stat] || 10;
  const statMod = Math.floor((statVal - 10) / 2);
  const damage = rollDamageDice(attackDef.damageDice, statMod, attackDef.baseMod, attackDef.customMod);

  appInstance.chatManager.addMessage({
    sender: attacker.name,
    text: `${attacker.name} unleashes ${attackDef.name}! Damage: ${damage.details} = ${damage.total}`,
    private: false
  });

  for (let t of targets) {
    applyDamage(t, damage.total, appInstance);
  }

  if (attackDef.createsTerrainEffect) {
    if (!appInstance.terrainEffects) appInstance.terrainEffects = {};
    for (let pos of aoePositions) {
      const key = `${pos.row},${pos.col}`;
      appInstance.terrainEffects[key] = { type: attackDef.terrainEffectType, duration: 5 };
    }
    appInstance.board.redrawBoard();
  }
}

export function rollDamageDice(diceExp, statMod, baseMod, customMod) {
  const match = diceExp.match(/(\d+)d(\d+)/);
  if (!match) return { total: 0, details: "Invalid dice expression." };
  let diceCount = parseInt(match[1], 10);
  let diceSides = parseInt(match[2], 10);
  let rolls = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(rollSingleDice(diceSides));
  }
  let sum = rolls.reduce((a, b) => a + b, 0) + statMod + baseMod + customMod;
  return { total: sum, details: `(${rolls.join(',')})+Stat(${statMod})+Wep(${baseMod})+Custom(${customMod})` };
}

function applyDamage(target, damage, appInstance) {
  if (target.type === "character") {
    const character = appInstance.getCharacterById(target.id);
    if (character) {
      character.HP -= damage;
      appInstance.chatManager.addMessage({
        sender: "System",
        text: `${character.name} takes ${damage} damage!`,
        private: false
      });
      if (character.HP <= 0) {
        appInstance.chatManager.addMessage({
          sender: "System",
          text: `${character.name} has been defeated!`,
          private: false
        });
      }
    }
  } else if (target.type === "monster") {
    const monster = appInstance.getMonsterById(target.id);
    if (monster) {
      monster.HP -= damage;
      appInstance.chatManager.addMessage({
        sender: "System",
        text: `${monster.name} takes ${damage} damage!`,
        private: false
      });
      if (monster.HP <= 0) {
        appInstance.chatManager.addMessage({
          sender: "System",
          text: `${monster.name} has been defeated!`,
          private: false
        });
      }
    }
  }
}
