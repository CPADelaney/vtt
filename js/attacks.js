// js/attacks.js
import { weapons } from './items.js';

export const attacksData = {
  melee: {
    id: 'melee',
    name: "Melee Attack",
    type: "single",
    range: 1,
    // For damage, stat, baseMod, we will look them up from the weapon 
    // referenced by attackEntry.weaponId at runtime.
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  },
  ranged: {
    id: 'ranged',
    name: "Ranged Attack",
    type: "single",
    range: 10,
    // Same as melee, we rely on the weapon data when we perform the attack.
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  },
  unarmed: {
    id: 'unarmed',
    name: "Unarmed Strike",
    type: "single",
    range: 1,
    // No weaponId required, we'll handle it as a fallback
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  },
  1: {
    id: 1,
    name: "Short Sword Strike",
    type: "single", 
    range: 1,
    damageDice: "1d6",
    stat: "STR",
    baseMod: 2,
    customMod: 0,
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  },
  2: {
    id: 2,
    name: "Fireball",
    type: "aoe",
    shape: "circle",
    radius: 2,
    damageDice: "3d6",
    stat: "INT",
    baseMod: 0,
    customMod: 0,
    conditions: { excludeAllies: true },
    createsTerrainEffect: false
  },
  3: {
    id: 3,
    name: "Dragon's Acid Breath",
    type: "aoe",
    shape: "cone",
    radius: 3,
    damageDice: "2d8",
    stat: "CON",
    baseMod: 1,
    customMod: 0,
    conditions: { excludeAllies: false },
    createsTerrainEffect: true,
    terrainEffectType: "acidic"
  },
  4: {
    id: 4,
    name: "Unarmed Strike",
    type: "single",
    range: 1,
    damageDice: "1d4",
    stat: "STR",
    baseMod: 0,
    customMod: 0,
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  }
};
