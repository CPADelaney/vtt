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
            size: 25,
            label: 'Token'
        };
    }
};
// In app.js

class VirtualTabletopApp {
    constructor() {
        this.initialize();
        this.currentRuleset = DnD5eRuleset;
    }
initialize() {
    this.canvas = document.getElementById('grid-canvas');
    console.log('Canvas found:', this.canvas);

    this.gridConfig = GridConfig.getInstance();
    console.log('Grid config:', this.gridConfig);

    this.grid = new Grid(this.canvas);
    console.log('Grid created:', this.grid);

    // Test drawing something directly on the canvas
    const testRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    testRect.setAttribute('x', '100');
    testRect.setAttribute('y', '100');
    testRect.setAttribute('width', '100');
    testRect.setAttribute('height', '100');
    testRect.setAttribute('fill', 'red');
    this.canvas.appendChild(testRect);

    this.tokenManager = new TokenManager(this.currentRuleset);
    this.interactionManager = new InteractionManager(this.canvas);

    this.setupEventListeners();
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
