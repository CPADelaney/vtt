// systemManager.js
export class SystemManager {
    constructor() {
        this.currentSystem = '5e';
        this.availableSystems = {
            '5e': {
                name: 'D&D 5E',
                path: 'systems/dnd5e',
                // We can add more metadata here like version, required files, etc.
                isReady: true  // Set to true when system is fully integrated
            },
            'pathfinder': {
                name: 'Pathfinder',
                path: 'systems/pathfinder',
                isReady: false
            }
        };
    }

    getAvailableSystems() {
        return Object.entries(this.availableSystems)
            .filter(([_, system]) => system.isReady)
            .map(([id, system]) => ({
                id,
                name: system.name
            }));
    }

    setSystem(systemId) {
        if (this.availableSystems[systemId]?.isReady) {
            this.currentSystem = systemId;
            return true;
        }
        return false;
    }

    getCurrentSystem() {
        return this.availableSystems[this.currentSystem];
    }
}

// Add to window for now, similar to DiceManager
window.SystemManager = SystemManager;
