import { createSquarePattern } from './gridPattern.js';

export class App {
    constructor() {
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = document.getElementById('viewport');
        this.versionElement = document.getElementById('version');

        // Version number updated here
        this.version = "1.0.20"; 
        this.versionElement.textContent = "Version: " + this.version;

        // Grid parameters
        this.baseCellSize = 50;
        this.scale = 1;
        this.offsetX = this.canvas.width/2 - (10 * this.baseCellSize);
        this.offsetY = this.canvas.height/2 - (10 * this.baseCellSize);

        this.gridWidth = 20;  // cells
        this.gridHeight = 20; // cells
        this.minScale = 0.2;
        this.maxScale = 5;

        // Tokens in world space
        this.tokens = [
            { x: 100, y: 100, width: 40, height: 40, color: 'red' },
            { x: 250, y: 150, width: 30, height: 60, color: 'blue' }
        ];

        // Create grid pattern
        this.gridPattern = createSquarePattern(this.ctx, this.baseCellSize, '#ccc', 1);

        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.addEventListeners();
    }

    addEventListeners() {
        // Prevent default context menu so right-click can pan
        this.viewport.addEventListener('contextmenu', (e) => e.preventDefault());

        // Panning with right-click
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.isPanning = true;
                this.canvas.classList.add('panning');
                this.startX = e.clientX - this.offsetX;
                this.startY = e.clientY - this.offsetY;
            }
        });

        this.viewport.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.offsetX = e.clientX - this.startX;
                this.offsetY = e.clientY - this.startY;
                this.drawScene();
            }
        });

        this.viewport.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.canvas.classList.remove('panning');
        });

        // Zoom at mouse position with wheel
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Convert mouse to world coords before zoom
            const worldX = (mouseX - this.offsetX) / this.scale;
            const worldY = (mouseY - this.offsetY) / this.scale;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= zoomFactor;

            if (this.scale < this.minScale) this.scale = this.minScale;
            if (this.scale > this.maxScale) this.scale = this.maxScale;

            // Adjust offset so the same world point is under the mouse
            this.offsetX = mouseX - worldX * this.scale;
            this.offsetY = mouseY - worldY * this.scale;

            this.drawScene();
        });
    }

    drawScene() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw the grid
        this.ctx.fillStyle = this.gridPattern;
        this.ctx.fillRect(0, 0, this.gridWidth * this.baseCellSize, this.gridHeight * this.baseCellSize);

        // Draw tokens
        for (const t of this.tokens) {
            this.ctx.fillStyle = t.color;
            this.ctx.fillRect(t.x, t.y, t.width, t.height);
        }

        this.ctx.restore();
    }

    initialize() {
        this.drawScene();
    }
}
