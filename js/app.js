// app.js
import { createSquarePattern } from './gridPattern.js';

const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const versionElement = document.getElementById('version');
const version = "1.0.17";

versionElement.textContent = "Version: " + version;

// Grid and scaling parameters
let gridSize = 50;
const minZoom = 5;
const maxZoom = 100;

// Grid dimensions in cells
let gridWidth = 20;
let gridHeight = 20;

// Offsets and dragging states
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Tokens
const tokens = [];
function Token(x, y, width, height, color) {
    // x, y given in pixels at 50px/cell scale originally
    this.gridX = x / 50;
    this.gridY = y / 50;
    this.width = width;
    this.height = height;
    this.color = color;

    this.draw = function() {
        const scale = gridSize / 50;
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;
        const screenX = this.gridX * gridSize + offsetX;
        const screenY = this.gridY * gridSize + offsetY;

        ctx.fillStyle = this.color;
        ctx.fillRect(screenX, screenY, scaledWidth, scaledHeight);
    };
}

// Example tokens
tokens.push(new Token(100, 100, 40, 40, 'red'));
tokens.push(new Token(250, 150, 30, 60, 'blue'));

// Create the grid pattern
let gridPattern = createSquarePattern(ctx, 50, '#ccc', 1);

// Set initial canvas size based on grid size
canvas.width = gridWidth * gridSize;
canvas.height = gridHeight * gridSize;

function snapToGrid(x, y) {
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    return { x: snappedX, y: snappedY };
}

function drawTokens() {
    for (const token of tokens) {
        token.draw();
    }
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill the background with the pattern using offsets
    ctx.fillStyle = gridPattern;
    ctx.fillRect(offsetX, offsetY, gridWidth * gridSize, gridHeight * gridSize);

    drawTokens();
}

function centerGrid() {
    // Just center logically by adjusting offsetX/offsetY
    // Do not modify canvas.style here.
    offsetX = (viewport.clientWidth - (gridWidth * gridSize)) / 2;
    offsetY = (viewport.clientHeight - (gridHeight * gridSize)) / 2;
}

// Initial draw
centerGrid();
redraw();

// Event Listeners
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        // Right-click panning would be handled by scroll container (main.js)
        return;
    } else {
        // Left-click: Attempt to pick up a token
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scale = gridSize / 50;
        for (const token of tokens) {
            const scaledWidth = token.width * scale;
            const scaledHeight = token.height * scale;
            const tokenScreenX = token.gridX * gridSize + offsetX;
            const tokenScreenY = token.gridY * gridSize + offsetY;

            if (mouseX >= tokenScreenX && mouseX <= tokenScreenX + scaledWidth &&
                mouseY >= tokenScreenY && mouseY <= tokenScreenY + scaledHeight) {
                isDragging = true;
                draggedElement = token;
                dragOffsetX = mouseX - tokenScreenX;
                dragOffsetY = mouseY - tokenScreenY;
                break;
            }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggedElement) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let canvasX = mouseX - dragOffsetX - offsetX;
        let canvasY = mouseY - dragOffsetY - offsetY;

        const snappedPos = snapToGrid(canvasX, canvasY);

        // Update token position in grid units
        draggedElement.gridX = snappedPos.x / gridSize;
        draggedElement.gridY = snappedPos.y / gridSize;

        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggedElement = null;
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Zoom on mouse wheel
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // World coordinates under the mouse before zoom
    const worldX = (mouseX - offsetX) / gridSize;
    const worldY = (mouseY - offsetY) / gridSize;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newGridSize = Math.max(minZoom, Math.min(maxZoom, gridSize * zoomFactor));

    gridSize = newGridSize;

    // Adjust offsets so the same world point stays under the mouse
    offsetX = mouseX - (worldX * gridSize);
    offsetY = mouseY - (worldY * gridSize);

    // Adjust canvas size to reflect new grid size
    canvas.width = gridWidth * gridSize;
    canvas.height = gridHeight * gridSize;

    redraw();
});

export class App {
    initialize() {
        redraw();
    }
}
