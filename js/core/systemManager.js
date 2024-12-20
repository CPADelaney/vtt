// systemManager.js
window.SystemManager = class SystemManager {
    constructor() {
        this.currentSystem = '5e';
        this.availableSystems = {
            '5e': {
                name: 'D&D 5E',
                path: 'systems/dnd5e',
                requiredComponents: [
                    'combat/initiative.js',
                    'combat/actions.js',
                    'characters/character.js',
                    'ui/CombatTracker.jsx'
                ]
            },
            'pathfinder': {
                name: 'Pathfinder',
                path: 'systems/pathfinder',
                requiredComponents: [
                    'combat/initiative.js',
                    'characters/character.js'
                ]
            }
        };

        // Initialize systems
        this.validateSystems();
    }

    async validateSystems() {
        for (const [systemId, system] of Object.entries(this.availableSystems)) {
            try {
                // Check if all required components exist
                const validationResults = await Promise.all(
                    system.requiredComponents.map(async component => {
                        try {
                            const response = await fetch(`js/${system.path}/${component}`);
                            return response.ok;
                        } catch (e) {
                            console.log(`Failed to load ${component} for ${system.name}`);
                            return false;
                        }
                    })
                );

                // System is ready if all components are available
                system.isReady = validationResults.every(result => result);
                
                console.log(`System ${system.name} validation:`, 
                    system.isReady ? 'Ready' : 'Missing components');
            } catch (e) {
                console.error(`Error validating system ${system.name}:`, e);
                system.isReady = false;
            }
        }
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
            // Could add system initialization here
            console.log(`Switched to system: ${this.availableSystems[systemId].name}`);
            return true;
        }
        console.warn(`Attempted to switch to unavailable system: ${systemId}`);
        return false;
    }

    getCurrentSystem() {
        return this.availableSystems[this.currentSystem];
    }

    // Helper to check if a specific component exists for the current system
    async hasComponent(componentPath) {
        const system = this.getCurrentSystem();
        if (!system) return false;
        
        try {
            const response = await fetch(`js/${system.path}/${componentPath}`);
            return response.ok;
        } catch (e) {
            return false;
        }
    }
}

window.SystemManager = SystemManager;
