// js/hooks/useCampaignManager.js
import { useEffect, useMemo, useCallback } from 'react';

export function useCampaignManager(vtt, campaignId = 'default-campaign') {
    // Helper function to get grid state
    const getGridState = useCallback(() => ({
        isHexGrid: vtt.isHexGrid,
        scale: vtt.scale,
        position: {
            x: vtt.currentX,
            y: vtt.currentY
        }
    }), [vtt]);

    // Helper function to get token state
    const getTokenState = useCallback(() => {
        try {
            return Array.from(document.querySelectorAll('.token')).map(token => ({
                x: parseFloat(token.style.left),
                y: parseFloat(token.style.top),
                stats: JSON.parse(token.dataset.stats ?? '{}'),
                id: token.id ?? `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
            }));
        } catch (error) {
            console.error('Error collecting token state:', error);
            return [];
        }
    }, []);

    // Save current state to localStorage
    const saveState = useCallback(() => {
        const state = {
            campaignId,
            gridState: getGridState(),
            tokens: getTokenState(),
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(state));
            console.log(`Campaign '${campaignId}' saved:`, new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to save campaign state:', error);
        }
    }, [campaignId, getGridState, getTokenState]);

    // Load and apply saved state
    const loadState = useCallback(() => {
        try {
            const savedState = localStorage.getItem(`vtt-state-${campaignId}`);
            if (!savedState) return false;

            const state = JSON.parse(savedState);

            // Apply grid state
            if (state.gridState.isHexGrid !== vtt.isHexGrid) {
                vtt.toggleGridType();
            }
            vtt.scale = state.gridState.scale;
            vtt.currentX = state.gridState.position.x;
            vtt.currentY = state.gridState.position.y;
            vtt.updateTransform();

            // Apply token state
            document.querySelectorAll('.token').forEach(token => token.remove());
            state.tokens.forEach(tokenData => {
                const token = vtt.addToken(tokenData.x, tokenData.y);
                token.id = tokenData.id;
                if (tokenData.stats) {
                    token.dataset.stats = JSON.stringify(tokenData.stats);
                }
            });

            console.log(`Campaign '${campaignId}' loaded from:`, 
                new Date(state.timestamp).toLocaleTimeString());
            return true;
        } catch (error) {
            console.error('Failed to load campaign state:', error);
            return false;
        }
    }, [campaignId, vtt]);

    // Token stats management
    const updateTokenStats = useCallback((tokenId, stats) => {
        const token = document.getElementById(tokenId);
        if (!token) return;

        try {
            token.dataset.stats = JSON.stringify(stats);
            saveState(); // Save immediately when stats change
        } catch (error) {
            console.error('Error updating token stats:', error);
        }
    }, [saveState]);

    const getTokenStats = useCallback((tokenId) => {
        const token = document.getElementById(tokenId);
        if (!token?.dataset?.stats) return null;

        try {
            return JSON.parse(token.dataset.stats);
        } catch (error) {
            console.error('Error parsing token stats:', error);
            return {};
        }
    }, []);

    // Set up autosave
    useEffect(() => {
        const saveInterval = setInterval(saveState, 30000);
        window.addEventListener('beforeunload', saveState);

        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('beforeunload', saveState);
        };
    }, [saveState]);

    // Return memoized manager object
    return useMemo(() => ({
        saveState,
        loadState,
        getTokenStats,
        updateTokenStats
    }), [saveState, loadState, getTokenStats, updateTokenStats]);
}
