// script.js
import { MouseHandler } from './mouseHandler.js';

class VirtualTabletop {
    constructor() {
        this.tabletop = document.getElementById('tabletop');
        this.container = document.getElementById('tabletop-container');
        this.toggleButton = document.getElementById('toggleGrid');
        this.zoomSlider = document.getElementById('zoomSlider');
        this.zoomValue = document.getElementById('zoomValue');
        
        this.isHexGrid = false;
        this.scale = 1;
        this.currentX = 0;
        this.currentY = 0;

        this.gridSize = 50; // Base size for grid cells
        this.tokens = new Set(); // Store token positions
        
        // Calculate grid dimensions
        this.updateGridDimensions();

        // Initialize mouse handler
        this.mouseHandler = new MouseHandler(this);
        
        // Initialize remaining event listeners
        this.initializeEventListeners();
        this.createGrid();
    }

    updateGridDimensions() {
        if (this.isHexGrid) {
            // For hexes, we need to account for the overlap
            const hexWidth = this.gridSize * Math.sqrt(3);
            const hexHeight = this.gridSize * 2;
            this.cols = Math.ceil(window.innerWidth / (hexWidth * 0.75)) + 2;
            this.rows = Math.ceil(window.innerHeight / (hexHeight * 0.75)) + 2;
        } else {
            this.cols = Math.ceil(window.innerWidth / this.gridSize) + 5;
            this.rows = Math.ceil(window.innerHeight / this.gridSize) + 5;
        }
    }

    initializeEventListeners() {
        this.toggleButton.addEventListener('click', () => this.toggleGridType());
        window.addEventListener('resize', () => this.handleResize());
    }

    updateTransform() {
        this.tabletop.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(${this.scale})`;
    }

    toggleGridType() {
        // Store current tokens before changing grid
        this.saveTokenPositions();
        
        this.isHexGrid = !this.isHexGrid;
        this.tabletop.className = this.isHexGrid ? 'hex-grid' : 'square-grid';
        
        this.updateGridDimensions();
        this.createGrid();
        
        // Restore tokens after grid change
        this.restoreTokens();
    }

    saveTokenPositions() {
        this.tokens.clear();
        document.querySelectorAll('.token').forEach(token => {
            this.tokens.add({
                x: parseFloat(token.style.left),
                y: parseFloat(token.style.top),
                selected: token.classList.contains('selected')
            });
        });
    }

    restoreTokens() {
        this.tokens.forEach(tokenData => {
            const token = this.addToken(tokenData.x, tokenData.y);
            if (tokenData.selected) {
                token.classList.add('selected');
                this.mouseHandler.selectedTokens.add(token);
            }
        });
    }

    createGrid() {
        this.tabletop.innerHTML = '';
        
        if (this.isHexGrid) {
            this.createHexGrid();
        } else {
            this.createSquareGrid();
        }
    }

    createSquareGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.left = `${col * this.gridSize}px`;
                cell.style.top = `${row * this.gridSize}px`;
                this.tabletop.appendChild(cell);
            }
        }
    }

    createHexGrid() {
        const hexHeight = this.gridSize * 2;
        const hexWidth = this.gridSize * Math.sqrt(3);
        const verticalSpacing = hexHeight * 0.75;
        const horizontalSpacing = hexWidth;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                // Offset every other row horizontally
                const offset = row % 2 === 0 ? 0 : horizontalSpacing / 2;
                cell.style.left = `${col * horizontalSpacing + offset}px`;
                cell.style.top = `${row * verticalSpacing}px`;
                
                this.tabletop.appendChild(cell);
            }
        }
    }

    handleResize() {
        this.saveTokenPositions();
        this.updateGridDimensions();
        this.createGrid();
        this.restoreTokens();
    }

    addToken(x, y) {
        const token = document.createElement('div');
        token.className = 'token';
        token.style.left = `${x}px`;
        token.style.top = `${y}px`;
        this.tabletop.appendChild(token);
        return token;
    }
}

// Initialize the virtual tabletop when the page loads
window.addEventListener('load', () => {
    const vtt = new VirtualTabletop();
    vtt.addToken(window.innerWidth / 2, window.innerHeight / 2);
});
