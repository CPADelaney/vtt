// js/hooks/useSystemManager.js
import { useState, useCallback, useEffect } from 'react';

const SYSTEMS_CONFIG = {
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

export function useSystemManager() {
    const [systems, setSystems] = useState(SYSTEMS_CONFIG);
    const [currentSystemId, setCurrentSystemId] = useState('5e');
    const [isValidating, setIsValidating] = useState(true);

    // Validate all systems on mount
    useEffect(() => {
        async function validateSystems() {
            const validatedSystems = { ...systems };
            
            for (const [systemId, system] of Object.entries(validatedSystems)) {
                try {
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
                    
                    system.isReady = validationResults.every(result => result);
                    console.log(`System ${system.name} validation:`,
                        system.isReady ? 'Ready' : 'Missing components');
                } catch (e) {
                    console.error(`Error validating system ${system.name}:`, e);
                    system.isReady = false;
                }
            }
            
            setSystems(validatedSystems);
            setIsValidating(false);
        }

        validateSystems();
    }, []);

    const getAvailableSystems = useCallback(() => {
        return Object.entries(systems)
            .filter(([_, system]) => system.isReady)
            .map(([id, system]) => ({
                id,
                name: system.name
            }));
    }, [systems]);

    const setSystem = useCallback((systemId) => {
        const system = systems[systemId];
        if (system?.isReady) {
            setCurrentSystemId(systemId);
            console.log(`Switched to system: ${system.name}`);
            return true;
        }
        console.warn(`Attempted to switch to unavailable system: ${systemId}`);
        return false;
    }, [systems]);

    const getCurrentSystem = useCallback(() => {
        return systems[currentSystemId];
    }, [systems, currentSystemId]);

    const hasComponent = useCallback(async (componentPath) => {
        const system = getCurrentSystem();
        if (!system) return false;
        
        try {
            const response = await fetch(`js/${system.path}/${componentPath}`);
            return response.ok;
        } catch (e) {
            return false;
        }
    }, [getCurrentSystem]);

    return {
        isValidating,
        currentSystemId,
        getAvailableSystems,
        setSystem,
        getCurrentSystem,
        hasComponent
    };
}
