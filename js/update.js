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
      // New monster added to bestiary since last load
      loadedMonsters.push(JSON.parse(JSON.stringify(templateMonster)));
    } else {
      // Merge any new attacks or fields
      if (templateMonster.attacks && templateMonster.attacks.length > 0) {
        if (!loadedMonster.attacks) loadedMonster.attacks = [];
        
        for (let tmplAtt of templateMonster.attacks) {
          const alreadyHas = loadedMonster.attacks.some(a => a.attackId === tmplAtt.attackId);
          if (!alreadyHas) {
            loadedMonster.attacks.push(JSON.parse(JSON.stringify(tmplAtt)));
          }
        }
      }

      // Merge other fields as needed
      // For example, update habitats from template:
      loadedMonster.habitats = JSON.parse(JSON.stringify(templateMonster.habitats));
      // Update static stats if you want them to always reflect bestiary changes:
      loadedMonster.AC = templateMonster.AC;
    }
  }

  // Remove monsters that no longer exist in the bestiary, if desired
  loadedMonsters = loadedMonsters.filter(m =>
    bestiary.some(tm => tm.id === m.id)
  );

  return loadedMonsters;
}

// If you later add items or spells, you can create similar functions:
// export function mergeItemsWithCatalog(loadedItems, itemCatalog) {...}
// export function mergeSpellsWithLibrary(loadedSpells, spellLibrary) {...}
