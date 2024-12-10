// campaignManager.js
// Responsible for loading and saving the campaign state.

export class CampaignManager {
  constructor(app) {
    this.app = app;
    this.storageKey = 'campaignState'; // Key used in localStorage
  }

  loadState() {
    const savedState = localStorage.getItem(this.storageKey);
    if (savedState) {
      const state = JSON.parse(savedState);
      this.applyStateToApp(state);
    } else {
      // No saved state, use defaults
      // You can set default monsters, characters, etc. here if needed
      this.applyDefaultState();
    }
  }

  saveState() {
    const state = this.gatherStateFromApp();
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  applyStateToApp(state) {
    // Assign loaded data to the app's properties
    if (state.boardState) {
      this.app.rows = state.boardState.rows || this.app.rows;
      this.app.cols = state.boardState.cols || this.app.cols;
      this.app.entityTokens = state.boardState.entityTokens || {};
    }
    this.app.characters = state.characters || [];
    this.app.monsters = state.monsters || [];
    this.app.messages = state.messages || [];
    // Add any other state you'd like to restore
  }

  applyDefaultState() {
    // Setup any default data if no saved state is found
    this.app.monsters = [
      { id: 1, name: "Sand Wurm", HP: 50, AC: 14, STR: 18, DEX: 8, CON: 16, INT: 5, WIS: 10, CHA: 5, habitats: ["Desert"], attacks: [{ weaponId: 1, customMod: 0 }] },
      { id: 2, name: "Cactus Crawler", HP: 20, AC: 12, STR: 12, DEX: 14, CON: 10, INT: 2, WIS: 8, CHA: 6, habitats: ["Desert", "Grasslands"], attacks: [] },
      { id: 3, name: "River Drake", HP: 30, AC: 15, STR: 14, DEX: 12, CON: 13, INT: 6, WIS: 10, CHA: 8, habitats: ["Riverlands"], attacks: [] },
      { id: 4, name: "Plains Stalker", HP: 25, AC: 13, STR: 13, DEX: 16, CON: 11, INT: 4, WIS: 10, CHA: 6, habitats: ["Grasslands"], attacks: [] }
    ];
    // Characters, entityTokens, messages start empty or with your chosen defaults
    this.app.characters = [];
    this.app.entityTokens = {};
    this.app.messages = [];
  }

  gatherStateFromApp() {
    // Gather current state from the app
    return {
      boardState: {
        rows: this.app.rows,
        cols: this.app.cols,
        entityTokens: this.app.entityTokens
      },
      characters: this.app.characters,
      monsters: this.app.monsters,
      messages: this.app.messages
      // Add any other app state you want to persist
    };
  }
}
