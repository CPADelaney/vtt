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

        this.gridSize = 50;
        this.cols = Math.ceil(window.innerWidth / this.gridSize) + 5;
        this.rows = Math.ceil(window.innerHeight / this.gridSize) + 5;

        // Initialize mouse handler
        this.mouseHandler = new MouseHandler(this);
        
        // Initialize remaining event listeners
        this.initializeEventListeners();
        this.createGrid();
    }

    initializeEventListeners() {
        // Grid toggle
        this.toggleButton.addEventListener('click', () => this.toggleGridType());

        // Window resize handling
        window.addEventListener('resize', () => this.handleResize());
    }

    updateTransform() {
        this.tabletop.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(${this.scale})`;
    }

    toggleGridType() {
        this.isHexGrid = !this.isHexGrid;
        this.tabletop.className = this.isHexGrid ? 'hex-grid' : 'square-grid';
        this.createGrid();
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
        const hexWidth = this.gridSize * 2;
        const hexHeight = this.gridSize * Math.sqrt(3);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                const offset = row % 2 === 0 ? 0 : hexWidth / 2;
                cell.style.left = `${col * hexWidth + offset}px`;
                cell.style.top = `${row * (hexHeight * 0.75)}px`;
                
                this.tabletop.appendChild(cell);
            }
        }
    }

    handleResize() {
        this.cols = Math.ceil(window.innerWidth / this.gridSize) + 5;
        this.rows = Math.ceil(window.innerHeight / this.gridSize) + 5;
        this.createGrid();
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
    
    // Example: Add a token at the center of the viewport
    vtt.addToken(window.innerWidth / 2, window.innerHeight / 2);
});
