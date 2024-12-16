const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const versionElement = document.getElementById('version');
const version = "1.0.10";

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

const tokens = [];

function Token(x, y, width, height, color) {
    // x, y, width, height are based on the original scale (50 px per cell)
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;

    this.draw = function() {
        // Scale token's position according to the current grid size
        const scale = gridSize / 50;
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;

        // Convert original coordinates to current scaled coordinates
        const screenX = (this.x / 50) * gridSize + offsetX;
        const screenY = (this.y / 50) * gridSize + offsetY;

        ctx.fillStyle = this.color;
        ctx.fillRect(screenX, screenY, scaledWidth, scaledHeight);
    };
}

// Example tokens: originally placed at 100px, 100px with width/height at default scale (50)
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
    // x, y here are in the canvas coordinate space after offset, so convert back
    // First, we consider that dragging aligns with grid cells at the current scale.
    // We'll snap coordinates to grid cells that are multiples of gridSize.
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

// Center grid initially if desired
function centerGrid() {
    offsetX = (viewport.clientWidth - canvas.width) / 2;
    offsetY = (viewport.clientHeight - canvas.height) / 2;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
}

// Initially draw and center grid
drawGrid();
centerGrid();
redraw();

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right-click: Panning
        isPanning = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        canvas.classList.add('panning');
        window.addEventListener('mousemove', doPan, { capture: true });
        window.addEventListener('mouseup', endPan, { once: true });
    } else { // Left-click: Token Selection/Dragging
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if we clicked on a token
        for (const token of tokens) {
            const scale = gridSize / 50;
            const scaledWidth = token.width * scale;
            const scaledHeight = token.height * scale;

            // Token screen coordinates
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

        // Convert the mouse position to canvas coords relative to offset
        let canvasX = mouseX - dragOffsetX - offsetX;
        let canvasY = mouseY - dragOffsetY - offsetY;

        // Snap to grid
        const snappedPos = snapToGrid(canvasX, canvasY);

        // Convert snappedPos back to original coordinate system (where gridSize=50)
        // snappedPos.x and y are multiples of current gridSize. To get original coords:
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

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Current mouse position in grid space before zoom
    const preZoomX = (mouseX - offsetX) / gridSize;
    const preZoomY = (mouseY - offsetY) / gridSize;

    let zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    gridSize *= zoomFactor;

    if (gridSize < 5) gridSize = 5;
    if (gridSize > 100) gridSize = 100;

    // After zoom, calculate the new position of the same point
    const postZoomX = preZoomX * gridSize;
    const postZoomY = preZoomY * gridSize;

    // Adjust offsets so that the mouse point stays consistent
    offsetX += mouseX - postZoomX;
    offsetY += mouseY - postZoomY;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';

    drawGrid();
    redraw();
});
