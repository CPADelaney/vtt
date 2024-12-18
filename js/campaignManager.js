// ctateManager.js
export class campaignManager {
    constructor(vtt) {
        this.vtt = vtt;
        this.campaignId = 'default-campaign'; // Will be set properly when we add campaign management
        this.autoSaveInterval = 30000; // 30 seconds
        this.initializeAutoSave();
    }

    initializeAutoSave() {
        setInterval(() => this.saveState(), this.autoSaveInterval);
        // Also save when window is closed/refreshed
        window.addEventListener('beforeunload', () => this.saveState());
    }

    saveState() {
        const state = {
            campaignId: this.campaignId,
            gridState: this.getGridState(),
            tokens: this.getTokenState(),
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(`vtt-state-${this.campaignId}`, JSON.stringify(state));
            console.log('State saved:', new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    loadState() {
        try {
            const savedState = localStorage.getItem(`vtt-state-${this.campaignId}`);
            if (savedState) {
                const state = JSON.parse(savedState);
                this.applyGridState(state.gridState);
                this.applyTokenState(state.tokens);
                console.log('State loaded from:', new Date(state.timestamp).toLocaleTimeString());
                return true;
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
        return false;
    }

    getGridState() {
        return {
            isHexGrid: this.vtt.isHexGrid,
            scale: this.vtt.scale,
            position: {
                x: this.vtt.currentX,
                y: this.vtt.currentY
            }
        };
    }

    getTokenState() {
        const tokens = [];
        document.querySelectorAll('.token').forEach(token => {
            tokens.push({
                x: parseFloat(token.style.left),
                y: parseFloat(token.style.top),
                stats: token.dataset.stats ? JSON.parse(token.dataset.stats) : {},
                id: token.id || `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
        });
        return tokens;
    }

    applyGridState(gridState) {
        if (gridState.isHexGrid !== this.vtt.isHexGrid) {
            this.vtt.toggleGridType();
        }
        this.vtt.scale = gridState.scale;
        this.vtt.currentX = gridState.position.x;
        this.vtt.currentY = gridState.position.y;
        this.vtt.updateTransform();
    }

    applyTokenState(tokens) {
        // Clear existing tokens
        document.querySelectorAll('.token').forEach(token => token.remove());
        this.vtt.tokens.clear();

        // Add saved tokens
        tokens.forEach(tokenData => {
            const token = this.vtt.addToken(tokenData.x, tokenData.y);
            token.id = tokenData.id;
            if (tokenData.stats) {
                token.dataset.stats = JSON.stringify(tokenData.stats);
            }
        });
    }

    // Method to update token stats
    updateTokenStats(tokenId, stats) {
        const token = document.getElementById(tokenId);
        if (token) {
            token.dataset.stats = JSON.stringify(stats);
            this.saveState(); // Save immediately when stats change
        }
    }

    // Helper method to get token stats
    getTokenStats(tokenId) {
        const token = document.getElementById(tokenId);
        if (token && token.dataset.stats) {
            return JSON.parse(token.dataset.stats);
        }
        return null;
    }
}
