// script.js
import { MouseHandler } from './mouseHandler.js';
class VirtualTabletop {
    constructor() {
        this.tabletop = document.getElementById('tabletop');
        this.container = document.getElementById('tabletop-container');
        this.toggleButton = document.getElementById('toggleGrid');
        this.zoomInButton = document.getElementById('zoomIn');
        this.zoomOutButton = document.getElementById('zoomOut');
        this.zoomValue = document.getElementById('zoomValue');
        
        this.isHexGrid = false;
        this.scale = 1;
        this.currentX = 0;
        this.currentY = 0;

        // Base grid size
        this.gridSize = 50; // Back to original size for squares
        this.tokens = new Set();

        // Hex specific calculations
        this.hexSize = 30; // Kept smaller for hexes
        this.hexHeight = this.hexSize * 2;
        this.hexWidth = Math.sqrt(3) * this.hexSize;
        
        this.updateGridDimensions();
        this.mouseHandler = new MouseHandler(this);
        this.initializeEventListeners();
        this.createGrid();
    }

    updateGridDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (this.isHexGrid) {
            const effectiveHeight = this.hexHeight * 0.75;
            this.rows = Math.ceil(viewportHeight / effectiveHeight) + 2;
            this.cols = Math.ceil(viewportWidth / this.hexWidth) + 2;
        } else {
            // Add just enough cells to cover viewport plus a small buffer
            this.rows = Math.ceil(viewportHeight / this.gridSize) + 2;
            this.cols = Math.ceil(viewportWidth / this.gridSize) + 2;
        }
    }

    initializeEventListeners() {
        // Grid toggle
        this.toggleButton.addEventListener('click', () => this.toggleGridType());

        // Zoom controls
        this.zoomInButton.addEventListener('click', () => this.handleZoomButton(1.1));
        this.zoomOutButton.addEventListener('click', () => this.handleZoomButton(0.9));

        // Window resize handling
        window.addEventListener('resize', () => this.handleResize());
    }

    handleZoomButton(factor) {
        // Get center of viewport for zoom origin
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate position relative to transformed tabletop
        const beforeZoomX = (centerX - this.currentX) / this.scale;
        const beforeZoomY = (centerY - this.currentY) / this.scale;

        // Update scale
        this.scale *= factor;
        
        // Clamp scale
        this.scale = Math.min(Math.max(this.scale, 0.5), 2);

        // Calculate new position to keep center point fixed
        const afterZoomX = (centerX - this.currentX) / this.scale;
        const afterZoomY = (centerY - this.currentY) / this.scale;

        // Adjust position to maintain center point
        this.currentX += (afterZoomX - beforeZoomX) * this.scale;
        this.currentY += (afterZoomY - beforeZoomY) * this.scale;

        // Update display
        this.updateTransform();
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        this.zoomValue.textContent = `${Math.round(this.scale * 100)}%`;
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
        // Clear existing grid
        while (this.tabletop.firstChild) {
            this.tabletop.removeChild(this.tabletop.firstChild);
        }
        
        // Create grid using document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        if (this.isHexGrid) {
            this.createHexGrid(fragment);
        } else {
            this.createSquareGrid(fragment);
        }
        
        this.tabletop.appendChild(fragment);
    }

    createSquareGrid(fragment) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.left = `${col * this.gridSize}px`;
                cell.style.top = `${row * this.gridSize}px`;
                fragment.appendChild(cell);
            }
        }
    }
    
    createHexGrid(fragment) {
        const horizontalSpacing = this.hexWidth;
        const verticalSpacing = this.hexHeight * 0.75;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                cell.setAttribute("class", "grid-cell");
                cell.setAttribute("width", String(this.hexWidth));
                cell.setAttribute("height", String(this.hexHeight));
                
                // Create the hexagon path
                const hexagon = document.createElementNS("http://www.w3.org/2000/svg", "path");
                
                // Calculate hex points
                const points = this.calculateHexPoints(this.hexWidth/2, this.hexHeight/2, this.hexSize);
                hexagon.setAttribute("d", points);
                hexagon.setAttribute("class", "hexagon");
                
                cell.appendChild(hexagon);
                
                // Position the SVG
                const offset = row % 2 === 0 ? 0 : horizontalSpacing / 2;
                cell.style.left = `${col * horizontalSpacing + offset}px`;
                cell.style.top = `${row * verticalSpacing}px`;
                
                fragment.appendChild(cell);
            }
        }
    }
    
    calculateHexPoints(centerX, centerY, size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60 - 30) * Math.PI / 180;
            const x = centerX + size * Math.cos(angle);
            const y = centerY + size * Math.sin(angle);
            points.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
        }
        points.push('Z');
        return points.join(' ');
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
