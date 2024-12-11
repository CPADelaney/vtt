// update.js
// This module handles merging loaded campaign state with the latest data sources (bestiary, items, etc.)

import { bestiary } from './monsters.js';
// If you have other sources of truth, import them here:
// import { itemCatalog } from './items.js';
// import { spellLibrary } from './spells.js';

export function mergeMonstersWithBestiary(loadedMonsters, bestiary) {
  for (let templateMonster of bestiary) {
    let loadedMonster = loadedMonsters.find(m => m.id === templateMonster.id);

    if (!loadedMonster) {
      // New monster from bestiary
      loadedMonsters.push(JSON.parse(JSON.stringify(templateMonster)));
    } else {
      // Monster already exists in loaded state
      
      // Merge attacks
      if (templateMonster.attacks && templateMonster.attacks.length > 0) {
        if (!loadedMonster.attacks) loadedMonster.attacks = [];
        
        for (let tmplAtt of templateMonster.attacks) {
          const alreadyHas = loadedMonster.attacks.some(a => a.attackId === tmplAtt.attackId);
          if (!alreadyHas) {
            loadedMonster.attacks.push(JSON.parse(JSON.stringify(tmplAtt)));
          }
        }
      }

      // Merge other fields like habitats
      loadedMonster.habitats = JSON.parse(JSON.stringify(templateMonster.habitats));
      
      // Update AC if you want the latest AC from the template
      loadedMonster.AC = templateMonster.AC;

      // Do NOT overwrite HP if you want to preserve the old/current HP.
      // Just omit a line that sets HP from the template.
    }
  }

  // If removing monsters not in bestiary is desired:
  loadedMonsters = loadedMonsters.filter(m =>
    bestiary.some(tm => tm.id === m.id)
  );

  return loadedMonsters;
}

// If you later add items or spells, you can create similar functions:
// export function mergeItemsWithCatalog(loadedItems, itemCatalog) {...}
// export function mergeSpellsWithLibrary(loadedSpells, spellLibrary) {...}
