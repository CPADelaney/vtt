import { GridConfig } from './config.js';

export class grid {
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

    initialize() {
        // Set SVG attributes
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        
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

    render() {
        // Clear existing grid
        if (this.gridGroup) {
            this.transformGroup.removeChild(this.gridGroup);
        }

        // Create new grid group
        this.gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.gridGroup.setAttribute('id', 'grid-lines');
        
        // Apply grid styles
        this.gridGroup.style.stroke = this.config.color;
        this.gridGroup.style.strokeWidth = '0.5';
        this.gridGroup.style.strokeOpacity = this.config.opacity;

        // Render appropriate grid type
        if (this.config.type === 'hex') {
            this.renderHexGrid();
        } else {
            this.renderSquareGrid();
        }

        // Add grid to transform group
        this.transformGroup.appendChild(this.gridGroup);
    }

    renderSquareGrid() {
        const gridSize = this.config.size;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';

        // Vertical lines
        for (let x = 0; x <= this.width; x += gridSize) {
            pathData += `M ${x} 0 L ${x} ${this.height} `;
        }

        // Horizontal lines
        for (let y = 0; y <= this.height; y += gridSize) {
            pathData += `M 0 ${y} L ${this.width} ${y} `;
        }

        path.setAttribute('d', pathData);
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        this.gridGroup.appendChild(path);
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

    // Utility methods for grid calculations
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

    // Get nearest grid intersection
    getNearestIntersection(x, y) {
        return this.config.type === 'hex' 
            ? this.getHexGridPosition(x, y)
            : this.getSquareGridPosition(x, y);
    }

    // Check if a point is within the grid bounds
    isWithinBounds(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }

    // Get grid cell at position
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

    // Update dimensions
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.render();
    }

    // Debug helpers
    drawDebugPoint(x, y, color = 'red') {
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('r', '3');
        point.setAttribute('fill', color);
        this.gridGroup.appendChild(point);
    }
}

// Create and export singleton instance
const svg = document.getElementById('grid-canvas');
export const grid = new grid(svg);
export default grid;
