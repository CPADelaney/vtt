import { GridConfig } from './config.js';

export class Grid {
    constructor(svgElement, width = 1000, height = 800) {
        this.svg = svgElement;
        this.width = width;
        this.height = height;
        this.config = GridConfig.getInstance();
        this.gridGroup = null;
        
        // Create main transform group
        this.createTransformGroup();
        
        // Initialize grid
        this.initialize();
    }

    // At the top of grid.js, just after constructor
    initialize() {
        console.log('Initializing grid with SVG:', this.svg);
        
        // Set SVG attributes
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        
        // Draw a test rectangle to verify SVG is working
        const testRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        testRect.setAttribute('x', '0');
        testRect.setAttribute('y', '0');
        testRect.setAttribute('width', '100');
        testRect.setAttribute('height', '100');
        testRect.setAttribute('fill', 'red');
        this.svg.appendChild(testRect);
        
        // Initial render
        this.render();
        
        // Listen for config changes
        document.addEventListener('grid-config-changed', () => this.render());
    }

    createTransformGroup() {
        // Remove existing transform group if present
        const existingGroup = this.svg.querySelector('#transform-group');
        if (existingGroup) {
            this.svg.removeChild(existingGroup);
        }

        // Create new transform group
        this.transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.transformGroup.setAttribute('id', 'transform-group');
        this.svg.appendChild(this.transformGroup);
    }
// In grid.js, modify the renderSquareGrid method:
renderSquareGrid() {
    const gridSize = this.config.size;
    
    // For testing, let's draw the grid lines directly instead of using a path
    for (let x = 0; x <= this.width; x += gridSize) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', this.height);
        line.setAttribute('stroke', 'black');  // Force visible color
        line.setAttribute('stroke-width', '1');  // Force visible width
        this.gridGroup.appendChild(line);
    }

    for (let y = 0; y <= this.height; y += gridSize) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', this.width);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'black');  // Force visible color
        line.setAttribute('stroke-width', '1');  // Force visible width
        this.gridGroup.appendChild(line);
    }
}

// Also add this to the render method right before rendering the grid:
render() {
    // Add these console logs
    console.log('Rendering grid');
    console.log('Transform group:', this.transformGroup);
    console.log('Grid group:', this.gridGroup);

    // Clear existing grid
    if (this.gridGroup) {
        this.transformGroup.removeChild(this.gridGroup);
    }

    // Create new grid group with explicit styles
    this.gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.gridGroup.setAttribute('id', 'grid-lines');
    this.gridGroup.style.stroke = 'black'; // Force visible color
    this.gridGroup.style.strokeWidth = '1';
    
    // Render grid
    if (this.config.type === 'hex') {
        this.renderHexGrid();
    } else {
        this.renderSquareGrid();
    }

    this.transformGroup.appendChild(this.gridGroup);
}

    renderHexGrid() {
        const size = this.config.size;
        const hexWidth = size * 2;
        const hexHeight = Math.sqrt(3) * size;
        const vertDist = hexHeight * 0.75;
        
        // Calculate number of hexes needed
        const cols = Math.ceil(this.width / (hexWidth * 0.75)) + 1;
        const rows = Math.ceil(this.height / vertDist) + 1;

        // Create a single path for all hexagons
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const offset = row % 2 ? hexWidth * 0.5 : 0;
                const x = col * hexWidth * 0.75 + offset;
                const y = row * vertDist;

                pathData += this.createHexPathData(x, y, size);
            }
        }

        path.setAttribute('d', pathData);
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('fill', 'none');
        this.gridGroup.appendChild(path);
    }

    createHexPathData(x, y, size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (60 * i - 30) * Math.PI / 180;
            points.push(
                x + size * Math.cos(angle),
                y + size * Math.sin(angle)
            );
        }

        // Create hex path
        return `M ${points[0]},${points[1]} ` +
               `L ${points[2]},${points[3]} ` +
               `L ${points[4]},${points[5]} ` +
               `L ${points[6]},${points[7]} ` +
               `L ${points[8]},${points[9]} ` +
               `L ${points[10]},${points[11]} Z `;
    }

    getGridPosition(x, y) {
        if (this.config.type === 'hex') {
            return this.getHexGridPosition(x, y);
        }
        return this.getSquareGridPosition(x, y);
    }

    getSquareGridPosition(x, y) {
        const gridSize = this.config.size;
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }

    getHexGridPosition(x, y) {
        const size = this.config.size;
        const hexWidth = size * 2;
        const hexHeight = Math.sqrt(3) * size;

        // Convert pixel coordinates to hex coordinates
        const q = (2/3 * x) / size;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
        
        // Round to nearest hex coordinates
        const roundedQ = Math.round(q);
        const roundedR = Math.round(r);
        
        // Convert back to pixel coordinates
        return {
            x: (3/2 * roundedQ) * size,
            y: (Math.sqrt(3) * (roundedQ/2 + roundedR)) * size
        };
    }

    getNearestIntersection(x, y) {
        return this.config.type === 'hex' 
            ? this.getHexGridPosition(x, y)
            : this.getSquareGridPosition(x, y);
    }

    isWithinBounds(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }

    getCellAtPosition(x, y) {
        const pos = this.getNearestIntersection(x, y);
        if (!this.isWithinBounds(pos.x, pos.y)) return null;

        return {
            x: pos.x,
            y: pos.y,
            type: this.config.type,
            size: this.config.size
        };
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.render();
    }
}

// Export a single instance
export default Grid;
