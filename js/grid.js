import { GridConfig } from './config.js';

export class Grid {
    constructor(svgElement, width = 1000, height = 800) {
        this.svg = svgElement;
        this.width = width;
        this.height = height;
        this.config = GridConfig.getInstance();
        this.cells = new Map(); // Store cell references
        
        this.createTransformGroup();
        this.initialize();
    }

    initialize() {
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        
        // Initial render
        this.render();
        
        document.addEventListener('grid-config-changed', () => this.render());
    }

    createTransformGroup() {
        const existingGroup = this.svg.querySelector('#transform-group');
        if (existingGroup) {
            this.svg.removeChild(existingGroup);
        }

        this.transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.transformGroup.setAttribute('id', 'transform-group');
        this.svg.appendChild(this.transformGroup);
    }

    createCell(x, y, size) {
        const cell = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const id = `cell-${x}-${y}`;
        cell.setAttribute('id', id);

        // Create the square
        const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        square.setAttribute('x', x * size);
        square.setAttribute('y', y * size);
        square.setAttribute('width', size);
        square.setAttribute('height', size);
        square.setAttribute('fill', 'none');
        square.setAttribute('stroke', this.config.color);
        square.setAttribute('stroke-width', '0.5');
        square.setAttribute('vector-effect', 'non-scaling-stroke');

        cell.appendChild(square);

        // Store reference to the cell
        this.cells.set(id, {
            element: cell,
            x: x * size,
            y: y * size,
            gridX: x,
            gridY: y
        });

        // Add interactivity
        cell.addEventListener('mouseover', () => this.handleCellHover(id));
        cell.addEventListener('mouseout', () => this.handleCellUnhover(id));
        cell.addEventListener('click', () => this.handleCellClick(id));

        return cell;
    }

    render() {
        // Clear existing grid
        this.cells.clear();
        while (this.transformGroup.firstChild) {
            this.transformGroup.removeChild(this.transformGroup.firstChild);
        }

        const size = this.config.size;
        const cols = Math.ceil(this.width / size);
        const rows = Math.ceil(this.height / size);

        // Create grid group
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('id', 'grid-cells');

        // Create all cells
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = this.createCell(x, y, size);
                gridGroup.appendChild(cell);
            }
        }

        this.transformGroup.appendChild(gridGroup);
    }

    // Cell interaction methods
    handleCellHover(cellId) {
        const cell = this.cells.get(cellId);
        if (cell) {
            const square = cell.element.querySelector('rect');
            square.setAttribute('fill', 'rgba(0, 0, 255, 0.1)');
        }
    }

    handleCellUnhover(cellId) {
        const cell = this.cells.get(cellId);
        if (cell) {
            const square = cell.element.querySelector('rect');
            square.setAttribute('fill', 'none');
        }
    }

    handleCellClick(cellId) {
        const cell = this.cells.get(cellId);
        if (cell) {
            console.log('Cell clicked:', {
                gridX: cell.gridX,
                gridY: cell.gridY,
                pixelX: cell.x,
                pixelY: cell.y
            });
        }
    }

    // Utility methods
    getCellAtPosition(x, y) {
        const size = this.config.size;
        const gridX = Math.floor(x / size);
        const gridY = Math.floor(y / size);
        return this.cells.get(`cell-${gridX}-${gridY}`);
    }

    highlightCell(cellId, color = 'rgba(255, 255, 0, 0.3)') {
        const cell = this.cells.get(cellId);
        if (cell) {
            const square = cell.element.querySelector('rect');
            square.setAttribute('fill', color);
        }
    }

    clearHighlight(cellId) {
        const cell = this.cells.get(cellId);
        if (cell) {
            const square = cell.element.querySelector('rect');
            square.setAttribute('fill', 'none');
        }
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.render();
    }
}

export default Grid;
