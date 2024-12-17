import { Grid } from './grid.js';
import { TokenManager } from './token.js';
import { InteractionManager } from './interaction.js';
import { GridConfig } from './config.js';
const DnD5eRuleset = {
    name: 'Dungeons & Dragons 5th Edition (Placeholder)',
    validateToken(token) {
        // Simple validation - token just needs an id and position
        return token && token.id && 
            typeof token.x === 'number' && 
            typeof token.y === 'number';
    },
    getDefaultToken() {
        return {
            id: `token-${Date.now()}`,
            x: 0,
            y: 0,
            color: 'blue',
            label: 'Token'
        };
    }
};

class VirtualTabletopApp {
    constructor() {
        this.initialize();
        this.currentRuleset = DnD5eRuleset;  // Use the placeholder
    }

    initialize() {
        // Initialize the SVG canvas
        this.canvas = document.getElementById('grid-canvas');
        if (!this.canvas) {
            throw new Error('Grid canvas element not found');
        }

        // Set up grid configuration
        this.gridConfig = GridConfig.getInstance();

        // Initialize core components
        this.grid = new Grid(this.canvas);
        this.tokenManager = new TokenManager(this.currentRuleset);
        this.interactionManager = new InteractionManager(this.canvas);

        // Set up event listeners
        this.setupEventListeners();

        // Initial render
        this.render();
    }

    setupEventListeners() {
        // Listen for ruleset changes
        document.addEventListener('ruleset-changed', (event) => {
            this.changeRuleset(event.detail.ruleset);
        });

        // Listen for token creation
        document.addEventListener('token-created', (event) => {
            this.tokenManager.createToken(event.detail.tokenData);
            this.render();
        });

        // Listen for grid configuration changes
        document.addEventListener('grid-config-changed', () => {
            this.render();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Error handling
        window.addEventListener('error', (error) => {
            this.handleError(error);
        });
    }

    changeRuleset(newRuleset) {
        try {
            this.tokenManager.changeRuleset(newRuleset);
            this.currentRuleset = newRuleset;
            this.render();
        } catch (error) {
            this.handleError(error);
        }
    }

    handleResize() {
        // Get the container dimensions
        const container = this.canvas.parentElement;
        const { width, height } = container.getBoundingClientRect();

        // Update grid dimensions
        this.grid.updateDimensions(width, height);
        
        // Re-render the application
        this.render();
    }

    handleError(error) {
        console.error('Virtual Tabletop Error:', error);
        // You could add UI error handling here
        // For example, showing an error toast or modal
    }

    render() {
        // Clear the canvas
        while (this.canvas.firstChild) {
            this.canvas.removeChild(this.canvas.firstChild);
        }

        // Render the grid
        this.grid.render();

        // Render all tokens
        const tokens = this.tokenManager.getAllTokens();
        tokens.forEach(token => {
            this.tokenManager.renderToken(token);
        });
    }

    // Public API methods
    addToken(tokenData) {
        return this.tokenManager.createToken(tokenData);
    }

    removeToken(tokenId) {
        this.tokenManager.removeToken(tokenId);
        this.render();
    }

    getTokenAt(x, y) {
        return this.tokenManager.getTokenAt(x, y);
    }

    exportState() {
        return {
            gridConfig: this.gridConfig,
            tokens: this.tokenManager.getAllTokens(),
            ruleset: this.currentRuleset.name
        };
    }

    importState(state) {
        try {
            // Update grid configuration
            Object.assign(this.gridConfig, state.gridConfig);

            // Clear existing tokens
            this.tokenManager.clearTokens();

            // Import tokens
            state.tokens.forEach(token => {
                this.tokenManager.createToken(token);
            });

            // Render the updated state
            this.render();
        } catch (error) {
            this.handleError(error);
        }
    }

    // Development/Debug methods
    enableDebugMode() {
        this.isDebugMode = true;
        this.grid.enableDebugMode();
        console.log('Debug mode enabled');
    }

    disableDebugMode() {
        this.isDebugMode = false;
        this.grid.disableDebugMode();
        console.log('Debug mode disabled');
    }
}

// Create and export singleton instance
const virtualTabletop = new VirtualTabletopApp();
export default virtualTabletop;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        virtualTabletop.initialize();
    } catch (error) {
        console.error('Failed to initialize Virtual Tabletop:', error);
    }
});
