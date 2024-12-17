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

        // Base size represents the distance from center to any point
        this.gridSize = 30; // Reduced for better visualization
        this.tokens = new Set();

        // Hex dimensions
        this.hexHeight = this.gridSize * 2;  // Distance from top point to bottom point
        this.hexWidth = Math.sqrt(3) * this.gridSize;  // Distance from left point to right point
        
        this.updateGridDimensions();
        this.mouseHandler = new MouseHandler(this);
        this.initializeEventListeners();
        this.createGrid();
    }

    updateGridDimensions() {
        if (this.isHexGrid) {
            // For hex grid, account for the 3/4 height overlap
            const effectiveHeight = this.hexHeight * 0.75;
            this.rows = Math.ceil(window.innerHeight / effectiveHeight) + 2;
            this.cols = Math.ceil(window.innerWidth / this.hexWidth) + 2;
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
        // Distance between hex centers horizontally
        const horizontalSpacing = this.hexWidth;
        // Distance between hex centers vertically (overlapped)
        const verticalSpacing = this.hexHeight * 0.75;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                // Offset even rows by half the horizontal spacing
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
