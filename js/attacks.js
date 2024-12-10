// attacks.js
export const attacksData = {
  // A simple single-target melee attack
  1: {
    id: 1,
    name: "Short Sword Strike",
    type: "single", // single-target
    range: 1, // Melee range
    damageDice: "1d6",
    stat: "STR",
    baseMod: 2,
    customMod: 0,
    conditions: { excludeAllies: false },
    createsTerrainEffect: false
  },

  // A fireball, AoE attack
  2: {
    id: 2,
    name: "Fireball",
    type: "aoe",
    shape: "circle",
    radius: 2, // 2 cells radius
    damageDice: "3d6",
    stat: "INT",
    baseMod: 0,
    customMod: 0,
    conditions: { excludeAllies: true },
    createsTerrainEffect: false
  },

  // A cone breath weapon that also changes terrain
  3: {
    id: 3,
    name: "Dragon's Breath (Cone of Acid)",
    type: "aoe",
    shape: "cone",
    radius: 3, // 3 cells in a cone shape
    damageDice: "2d8",
    stat: "CON",
    baseMod: 1,
    customMod: 0,
    conditions: { excludeAllies: false }, // Maybe it affects everyone in the area
    createsTerrainEffect: true,
    terrainEffectType: "acidic" // A terrain type you handle in redrawBoard
  }
};
