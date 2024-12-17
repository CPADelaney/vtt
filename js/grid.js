import { GridConfig } from './config.js';

export class Grid {
    constructor(svgElement, width = 1000, height = 800) {
        console.log('Grid constructor called');
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

    createTransformGroup() {
        console.log('Creating transform group');
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

    initialize() {
        console.log('Initializing grid');
        // Set SVG attributes
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        
        // Initial render
        this.render();
        
        // Listen for config changes
        document.addEventListener('grid-config-changed', () => this.render());
    }

    render() {
        console.log('Rendering grid');
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

        return `M ${points[0]},${points[1]} ` +
               `L ${points[2]},${points[3]} ` +
               `L ${points[4]},${points[5]} ` +
               `L ${points[6]},${points[7]} ` +
               `L ${points[8]},${points[9]} ` +
               `L ${points[10]},${points[11]} Z `;
    }
}

export default Grid;
