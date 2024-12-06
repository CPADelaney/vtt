export const rows = 8;
export const cols = 8;
export const users = ["DM","Player1","Player2"];
export let currentUser = "DM";
export const weapons = [
  {id:1, name:"Short Sword", damageDice:"1d6", stat:"STR", baseMod:2},
  {id:2, name:"Long Bow", damageDice:"1d8", stat:"DEX", baseMod:1},
  {id:3, name:"Dagger", damageDice:"1d4", stat:"DEX", baseMod:3}
];
export let characters = [];
export let nextCharacterId = 1;
export const monsters = [
  {id:1, name:"Sand Wurm", HP:50, AC:14, STR:18, DEX:8, CON:16, INT:5, WIS:10, CHA:5, habitats:["Desert"], attacks:[{weaponId:1, customMod:0}]},
  {id:2, name:"Cactus Crawler", HP:20, AC:12, STR:12, DEX:14, CON:10, INT:2, WIS:8, CHA:6, habitats:["Desert","Grasslands"], attacks:[]},
  {id:3, name:"River Drake", HP:30, AC:15, STR:14, DEX:12, CON:13, INT:6, WIS:10, CHA:8, habitats:["Riverlands"], attacks:[]},
  {id:4, name:"Plains Stalker", HP:25, AC:13, STR:13, DEX:16, CON:11, INT:4, WIS:10, CHA:6, habitats:["Grasslands"], attacks:[]}
];
export let entityTokens = {};
export let messages = [];

export function isDM() {
  return currentUser === "DM";
}