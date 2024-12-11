// js/attacks.js

export const weapons = [
  { id: 1, name: "Short Sword", damageDice: "1d6", stat: "STR", baseMod: 2 },
  { id: 2, name: "Long Bow", damageDice: "1d8", stat: "DEX", baseMod: 1 },
  { id: 3, name: "Dagger", damageDice: "1d4", stat: "DEX", baseMod: 3 }
];

export const attacksData = {
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
