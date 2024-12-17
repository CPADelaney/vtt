const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const versionElement = document.getElementById('version');
const version = "1.0.15";

versionElement.textContent = "Version: " + version;

let gridSize = 50;
let gridWidth = 20;
let gridHeight = 20;
let isPanning = false;
let startX;
let startY;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragOffsetX;
let dragOffsetY;
let draggedElement = null;
const minZoom = 5; // Minimum gridSize
const maxZoom = 100; // Maximum gridSize

const tokens = [];

function Token(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;

    this.draw = function() {
        const scale = gridSize / 50;
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;
        const screenX = (this.x / 50) * gridSize + offsetX;
        const screenY = (this.y / 50) * gridSize + offsetY;

        ctx.fillStyle = this.color;
        ctx.fillRect(screenX, screenY, scaledWidth, scaledHeight);
    };
}

tokens.push(new Token(100, 100, 40, 40, 'red'));
tokens.push(new Token(250, 150, 30, 60, 'blue'));

function drawGrid() {
    canvas.width = gridWidth * gridSize;
    canvas.height = gridHeight * gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ccc';

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

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
    drawGrid();
    drawTokens();
}

function centerGrid() {
    offsetX = (viewport.clientWidth - canvas.width) / 2;
    offsetY = (viewport.clientHeight - canvas.height) / 2;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
}

drawGrid();
centerGrid();
redraw();

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isPanning = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        canvas.classList.add('panning');
        window.addEventListener('mousemove', doPan, { capture: true });
        window.addEventListener('mouseup', endPan, { once: true });
    } else {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (const token of tokens) {
            const scale = gridSize / 50;
            const scaledWidth = token.width * scale;
            const scaledHeight = token.height * scale;
            const tokenScreenX = (token.x / 50) * gridSize + offsetX;
            const tokenScreenY = (token.y / 50) * gridSize + offsetY;

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

function doPan(e) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
    redraw();
}

function endPan() {
    isPanning = false;
    canvas.classList.remove('panning');
    window.removeEventListener('mousemove', doPan, { capture: true });
}

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggedElement) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let canvasX = mouseX - dragOffsetX - offsetX;
        let canvasY = mouseY - dragOffsetY - offsetY;

        const snappedPos = snapToGrid(canvasX, canvasY);

        draggedElement.x = (snappedPos.x / gridSize) * 50;
        draggedElement.y = (snappedPos.y / gridSize) * 50;

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

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  // Get the canvas rectangle
  const rect = canvas.getBoundingClientRect();
  
  // Calculate mouse position relative to the canvas
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Determine zoom direction and factor
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  
  // Calculate new grid size, respecting min and max zoom
  const newGridSize = Math.max(minZoom, Math.min(maxZoom, gridSize * zoomFactor));
  
  // Calculate the mouse position relative to the current grid before zooming
  const preZoomGridX = (mouseX - offsetX) / gridSize;
  const preZoomGridY = (mouseY - offsetY) / gridSize;
  
  // Calculate the mouse position relative to the new grid size
  const postZoomGridX = (mouseX - offsetX) / newGridSize;
  const postZoomGridY = (mouseY - offsetY) / newGridSize;
  
  // Calculate the offset adjustments to keep the mouse point fixed
  const offsetXAdjustment = (postZoomGridX - preZoomGridX) * newGridSize;
  const offsetYAdjustment = (postZoomGridY - preZoomGridY) * newGridSize;
  
  // Update offsets
  offsetX += offsetXAdjustment;
  offsetY += offsetYAdjustment;
  
  // Update grid size
  gridSize = newGridSize;
  
  // Update canvas position
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;
  
  // Redraw the canvas
  redraw();
});
