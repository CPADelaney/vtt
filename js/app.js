import { createGridImage } from './gridRenderer.js';

export class App {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = document.getElementById('viewport');
        this.versionElement = document.getElementById('version');

        this.version = "1.0.22"; // Update this to know when the site updates
        this.versionElement.textContent = "Version: " + this.version;

        // Grid parameters
        this.gridWidth = 20;
        this.gridHeight = 20;
        this.baseCellSize = 50;

        // Pan & Zoom params
        this.scale = 1;
        this.minScale = 0.2;
        this.maxScale = 5;

        this.offsetX = this.canvas.width / 2 - (this.gridWidth * this.baseCellSize / 2);
        this.offsetY = this.canvas.height / 2 - (this.gridHeight * this.baseCellSize / 2);

        // Create the static grid image
        this.gridImage = createGridImage(this.gridWidth, this.gridHeight, this.baseCellSize, '#ccc', 1);

        // Tokens
        this.tokens = [
            { x: 100, y: 100, width: 40, height: 40, color: 'red' },
            { x: 250, y: 150, width: 30, height: 60, color: 'blue' }
        ];

        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.addEventListeners();
    }

    addEventListeners() {
        // Prevent context menu on right-click
        this.viewport.addEventListener('contextmenu', (e) => e.preventDefault());

        // Panning with right-click
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // right-click
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

        // Zoom with mouse wheel
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // World coords before zoom
            const worldX = (mouseX - this.offsetX) / this.scale;
            const worldY = (mouseY - this.offsetY) / this.scale;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= zoomFactor;
            if (this.scale < this.minScale) this.scale = this.minScale;
            if (this.scale > this.maxScale) this.scale = this.maxScale;

            // Adjust offset so the same world point stays under mouse
            this.offsetX = mouseX - worldX * this.scale;
            this.offsetY = mouseY - worldY * this.scale;

            this.drawScene();
        });
    }

    drawScene() {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw the static grid image (no lines recalculated)
        this.ctx.drawImage(this.gridImage, 0, 0);

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
