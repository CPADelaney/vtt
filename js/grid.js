import { GridConfig } from './config.js';

export class Grid {
    constructor(svgElement, width = 1000, height = 800) {
        this.svg = svgElement;
        this.width = width;
        this.height = height;
        this.config = GridConfig.getInstance();
        this.cells = new Map();
        this.chunks = new Map();
        this.visibleChunks = new Set();
        this.CHUNK_SIZE = 10; // Number of cells per chunk side
        
        this.createTransformGroup();
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
        
        // Draw a test rectangle to verify SVG is working
        const testRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        testRect.setAttribute('x', '0');
        testRect.setAttribute('y', '0');
        testRect.setAttribute('width', '100');
        testRect.setAttribute('height', '100');
        testRect.setAttribute('fill', 'red');
        this.svg.appendChild(testRect);
        
        console.log('Test rectangle added');
        
        // Initial render
        this.render();
        
        document.addEventListener('grid-config-changed', () => this.render());
    }

    setupViewportTracking() {
        // Track visible area for chunk loading
        this.viewportObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const chunkId = entry.target.getAttribute('data-chunk-id');
                    if (entry.isIntersecting) {
                        this.visibleChunks.add(chunkId);
                    } else {
                        this.visibleChunks.delete(chunkId);
                    }
                });
                this.updateVisibleChunks();
            },
            { threshold: 0.1 }
        );
    }

    createChunk(chunkX, chunkY) {
        const chunkId = `chunk-${chunkX}-${chunkY}`;
        const chunk = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        chunk.setAttribute('id', chunkId);
        chunk.setAttribute('data-chunk-id', chunkId);

        // Calculate chunk boundaries
        const startX = chunkX * this.CHUNK_SIZE;
        const startY = chunkY * this.CHUNK_SIZE;
        const size = this.config.size;

        if (this.config.type === 'hex') {
            this.createHexChunk(chunk, startX, startY, size);
        } else {
            this.createSquareChunk(chunk, startX, startY, size);
        }

        this.chunks.set(chunkId, chunk);
        return chunk;
    }

    createSquareChunk(chunk, startX, startY, size) {
        // Create a single path for all cells in the chunk
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';

        for (let y = 0; y < this.CHUNK_SIZE; y++) {
            for (let x = 0; x < this.CHUNK_SIZE; x++) {
                const cellX = (startX + x) * size;
                const cellY = (startY + y) * size;
                pathData += `M ${cellX} ${cellY} h ${size} v ${size} h -${size} Z `;
                
                // Store cell reference without creating individual elements
                this.cells.set(`cell-${startX + x}-${startY + y}`, {
                    x: cellX,
                    y: cellY,
                    gridX: startX + x,
                    gridY: startY + y
                });
            }
        }

        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.config.color);
        path.setAttribute('stroke-width', '0.5');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        
        chunk.appendChild(path);
    }

    createHexChunk(chunk, startX, startY, size) {
        const hexWidth = size * 2;
        const hexHeight = Math.sqrt(3) * size;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = '';

        for (let y = 0; y < this.CHUNK_SIZE; y++) {
            for (let x = 0; x < this.CHUNK_SIZE; x++) {
                const offsetX = (startX + x) * (hexWidth * 0.75);
                const offsetY = (startY + y) * hexHeight + (x % 2 ? hexHeight / 2 : 0);
                
                pathData += this.getHexPath(offsetX, offsetY, size);
                
                // Store hex cell reference
                this.cells.set(`cell-${startX + x}-${startY + y}`, {
                    x: offsetX,
                    y: offsetY,
                    gridX: startX + x,
                    gridY: startY + y,
                    isHex: true
                });
            }
        }

        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.config.color);
        path.setAttribute('stroke-width', '0.5');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        
        chunk.appendChild(path);
    }

    getHexPath(x, y, size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (60 * i - 30) * Math.PI / 180;
            points.push(
                x + size * Math.cos(angle),
                y + size * Math.sin(angle)
            );
        }
        return `M ${points[0]},${points[1]} L ${points[2]},${points[3]} L ${points[4]},${points[5]} L ${points[6]},${points[7]} L ${points[8]},${points[9]} L ${points[10]},${points[11]} Z `;
    }

    updateVisibleChunks() {
        // Get visible area based on current transform
        const transform = this.transformGroup.getAttribute('transform');
        const matrix = new DOMMatrix(transform);
        const viewBox = this.svg.viewBox.baseVal;
        
        // Calculate visible chunk range
        const visibleArea = {
            minX: (-matrix.e / matrix.a) / this.config.size,
            minY: (-matrix.f / matrix.d) / this.config.size,
            maxX: (viewBox.width - matrix.e) / (matrix.a * this.config.size),
            maxY: (viewBox.height - matrix.f) / (matrix.d * this.config.size)
        };

        // Convert to chunk coordinates
        const chunks = {
            minChunkX: Math.floor(visibleArea.minX / this.CHUNK_SIZE),
            minChunkY: Math.floor(visibleArea.minY / this.CHUNK_SIZE),
            maxChunkX: Math.ceil(visibleArea.maxX / this.CHUNK_SIZE),
            maxChunkY: Math.ceil(visibleArea.maxY / this.CHUNK_SIZE)
        };

        // Load visible chunks
        for (let y = chunks.minChunkY; y <= chunks.maxChunkY; y++) {
            for (let x = chunks.minChunkX; x <= chunks.maxChunkX; x++) {
                const chunkId = `chunk-${x}-${y}`;
                if (!this.chunks.has(chunkId)) {
                    const chunk = this.createChunk(x, y);
                    this.transformGroup.appendChild(chunk);
                    this.viewportObserver.observe(chunk);
                }
            }
        }

        // Remove far chunks
        this.chunks.forEach((chunk, chunkId) => {
            const [, x, y] = chunkId.split('-').map(Number);
            if (x < chunks.minChunkX - 1 || x > chunks.maxChunkX + 1 ||
                y < chunks.minChunkY - 1 || y > chunks.maxChunkY + 1) {
                this.transformGroup.removeChild(chunk);
                this.viewportObserver.unobserve(chunk);
                this.chunks.delete(chunkId);
            }
        });
    }

    getCellAtPosition(x, y) {
        if (this.config.type === 'hex') {
            return this.getHexCellAtPosition(x, y);
        }
        const size = this.config.size;
        const gridX = Math.floor(x / size);
        const gridY = Math.floor(y / size);
        return this.cells.get(`cell-${gridX}-${gridY}`);
    }

    getHexCellAtPosition(x, y) {
        const size = this.config.size;
        const hexWidth = size * 2;
        const hexHeight = Math.sqrt(3) * size;
        
        // Convert to hex coordinates
        const col = Math.floor(x / (hexWidth * 0.75));
        const row = Math.floor(y / hexHeight);
        
        // Get the two closest hexes
        const candidates = [
            this.cells.get(`cell-${col}-${row}`),
            this.cells.get(`cell-${col}-${row + 1}`),
            this.cells.get(`cell-${col + 1}-${row}`)
        ];
        
        // Find the closest hex center
        return candidates.reduce((closest, cell) => {
            if (!cell) return closest;
            const dx = x - cell.x;
            const dy = y - cell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return (!closest || distance < closest.distance) 
                ? { ...cell, distance }
                : closest;
        }, null);
    }
}

export default Grid;
