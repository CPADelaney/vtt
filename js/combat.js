// js/combat.js

import { rollSingleDice } from './dice.js';

/**
 * Performs an attack from an entity to a specified target.
 * @param {Object} entityData - The attacker entity data.
 * @param {string} type - The type of the attacker ("character" or "monster").
 * @param {Object} attackEntry - The attack details.
 * @param {Object} weapon - The weapon used for the attack.
 * @param {App} appInstance - Instance of the App class.
 * @param {Object} target - The target object { type: "character"/"monster", id: number }
 */
export function performAttack(entityData, type, attackEntry, weapon, appInstance, target) {
  // No prompt now; target is given directly.

  let statVal = entityData[weapon.stat];
  let statMod = Math.floor((statVal - 10) / 2);
  let roll = rollSingleDice(20);
  let totalAttack = roll + statMod + weapon.baseMod + attackEntry.customMod;

  let damage = rollDamageDice(weapon.damageDice, statMod, weapon.baseMod, attackEntry.customMod);

  appInstance.addMessage({
    sender: entityData.name,
    text: `Attacks a target with ${weapon.name}!\nAttack Roll: d20(${roll})+Stat(${statMod})+Wep(${weapon.baseMod})+Custom(${attackEntry.customMod}) = ${totalAttack}\nDamage: ${damage.details} = ${damage.total}`,
    private: false
  });

  // Apply damage to the target
  applyDamage(target, damage.total, appInstance);
}

/**
 * Rolls damage based on a dice expression and modifiers.
 * @param {string} diceExp - Dice expression (e.g., "1d6").
 * @param {number} statMod - Stat modifier.
 * @param {number} baseMod - Weapon base modifier.
 * @param {number} customMod - Custom modifier.
 * @returns {Object} - Details and total damage.
 */
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

/**
 * Applies damage to the target entity.
 * @param {Object} target - The target entity { type, id }.
 * @param {number} damage - The amount of damage to apply.
 * @param {App} appInstance - Instance of the App class.
 */
function applyDamage(target, damage, appInstance) {
  if (target.type === "character") {
    const character = appInstance.getCharacterById(target.id);
    if (character) {
      character.HP -= damage;
      appInstance.addMessage({
        sender: "System",
        text: `${character.name} takes ${damage} damage!`,
        private: false
      });
      if (character.HP <= 0) {
        appInstance.addMessage({
          sender: "System",
          text: `${character.name} has been defeated!`,
          private: false
        });
        // Optionally remove character from the board or mark as defeated
      }
    }
  } else if (target.type === "monster") {
    const monster = appInstance.getMonsterById(target.id);
    if (monster) {
      monster.HP -= damage;
      appInstance.addMessage({
        sender: "System",
        text: `${monster.name} takes ${damage} damage!`,
        private: false
      });
      if (monster.HP <= 0) {
        appInstance.addMessage({
          sender: "System",
          text: `${monster.name} has been defeated!`,
          private: false
        });
        // Optionally remove monster from the board or mark as defeated
      }
    }
  }
}
