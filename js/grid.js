import { GridConfig } from './config.js';

export class Grid {
    constructor(svgElement, width, height) {
        this.svg = svgElement;
        this.width = width;
        this.height = height;
        this.config = GridConfig;
    }

    generateSquareGrid() {
        const gridGroup = this.createGridGroup();
        const config = this.config.getInstance();

        for (let x = 0; x <= this.width; x += config.size) {
            const vertLine = this.createGridLine(x, 0, x, this.height);
            gridGroup.appendChild(vertLine);
        }

        for (let y = 0; y <= this.height; y += config.size) {
            const horzLine = this.createGridLine(0, y, this.width, y);
            gridGroup.appendChild(horzLine);
        }

        return gridGroup;
    }

    generateHexGrid() {
        const gridGroup = this.createGridGroup();
        const config = this.config.getInstance();
        const hexHeight = Math.sqrt(3) * config.size;
        const hexWidth = config.size * 2;

        for (let y = 0; y <= this.height; y += hexHeight * 0.75) {
            for (let x = 0; x <= this.width; x += hexWidth * 1.5) {
                const hexPoints = this.calculateHexPoints(x, y);
                const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                hex.setAttribute('points', hexPoints);
                hex.classList.add('grid-hex');
                gridGroup.appendChild(hex);
            }
        }

        return gridGroup;
    }

    calculateHexPoints(centerX, centerY) {
        const config = this.config.getInstance();
        const points = [];
        
        for (let i = 0; i < 6; i++) {
            const angleDeg = 60 * i - 30;
            const angleRad = Math.PI / 180 * angleDeg;
            const x = centerX + config.size * Math.cos(angleRad);
            const y = centerY + config.size * Math.sin(angleRad);
            points.push(`${x},${y}`);
        }

        return points.join(' ');
    }

    createGridGroup() {
        const config = this.config.getInstance();
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('id', 'grid-lines');
        gridGroup.style.stroke = config.color;
        gridGroup.style.strokeOpacity = config.opacity;

        return gridGroup;
    }

    createGridLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('grid-line');
        return line;
    }

    render() {
        // Clear existing grid
        const existingGrid = this.svg.querySelector('#grid-lines');
        if (existingGrid) {
            this.svg.removeChild(existingGrid);
        }

        // Generate new grid based on type
        const config = this.config.getInstance();
        const newGrid = config.type === 'hex' 
            ? this.generateHexGrid() 
            : this.generateSquareGrid();

        this.svg.appendChild(newGrid);
    }
}

// Initialize grid when module loads
const svg = document.getElementById('grid-canvas');
const grid = new Grid(svg, 1000, 800);

// Initial render
grid.render();

// Re-render on config change
document.addEventListener('grid-config-changed', () => {
    grid.render();
});

export default grid;
