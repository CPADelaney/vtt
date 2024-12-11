// js/monsters.js
// Defines initial monster data, now referencing attacks by attackId.

import { attacksData } from './attacks.js';

export const initialMonsters = [
  {
    id: 1,
    name: "Sand Wurm",
    HP: 50, AC: 14, STR: 18, DEX: 8, CON: 16, INT: 5, WIS: 10, CHA: 5,
    habitats: ["Desert"],
    attacks: [{  }] // Short Sword Strike (just a placeholder to test)
  },
  {
    id: 2,
    name: "Cactus Crawler",
    HP: 20, AC: 12, STR: 12, DEX: 14, CON: 10, INT: 2, WIS: 8, CHA: 6,
    habitats: ["Desert", "Grasslands"],
    attacks: [{ attackId: 2 }] // Fireball (aoe)
  },
  {
    id: 3,
    name: "River Drake",
    HP: 30, AC: 15, STR: 14, DEX: 12, CON: 13, INT: 6, WIS: 10, CHA: 8,
    habitats: ["Riverlands"],
    attacks: [{ attackId: 3 }] // Dragon's Acid Breath (cone aoe)
  },
  {
    id: 4,
    name: "Plains Stalker",
    HP: 25, AC: 13, STR: 13, DEX: 16, CON: 11, INT: 4, WIS: 10, CHA: 6,
    habitats: ["Grasslands"],
    attacks: [] // No attacks by default
  }
];
