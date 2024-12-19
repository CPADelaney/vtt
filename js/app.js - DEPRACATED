// app.js
import { Grid } from './grid.js';
import { TokenManager } from './token.js';
import { InteractionManager } from './interaction.js';
import { GridConfig } from './config.js';

// Simple placeholder ruleset
const DnD5eRuleset = {
    name: 'Dungeons & Dragons 5th Edition (Placeholder)',
    validateToken(token) {
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
        console.log('VirtualTabletopApp constructor called');
        this.currentRuleset = DnD5eRuleset;
        this.initialize();
    }

    initialize() {
        console.log('Initializing app');
        this.canvas = document.getElementById('grid-canvas');
        if (!this.canvas) {
            throw new Error('Grid canvas element not found');
        }
        console.log('Canvas found:', this.canvas);

        // Test SVG functionality
        const testRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        testRect.setAttribute('x', '0');
        testRect.setAttribute('y', '0');
        testRect.setAttribute('width', '100');
        testRect.setAttribute('height', '100');
        testRect.setAttribute('fill', 'red');
        this.canvas.appendChild(testRect);
        console.log('Test rectangle added');

        this.gridConfig = GridConfig.getInstance();
        console.log('Grid config:', this.gridConfig);

        this.grid = new Grid(this.canvas);
        console.log('Grid created:', this.grid);

        this.tokenManager = new TokenManager(this.currentRuleset);
        console.log('Token manager created');

        this.interactionManager = new InteractionManager(this.canvas);
        console.log('Interaction manager created');

        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        document.addEventListener('grid-config-changed', () => {
            console.log('Grid config changed, rendering...');
            this.render();
        });
    }

    render() {
        console.log('App render called');
        // Clear the canvas
        while (this.canvas.firstChild) {
            this.canvas.removeChild(this.canvas.firstChild);
        }

        // Re-render grid
        if (this.grid) {
            console.log('Rendering grid');
            this.grid.render();
        }

        // Render tokens if any
        if (this.tokenManager) {
            console.log('Rendering tokens');
            const tokens = this.tokenManager.getAllTokens();
            tokens.forEach(token => {
                this.tokenManager.renderToken(token);
            });
        }
    }
}

// Create and export instance
const virtualTabletop = new VirtualTabletopApp();
export default virtualTabletop;
