const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const versionElement = document.getElementById('version');
const version = "1.0.6"; // Current Version

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
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.draw = function() {
        const scaledWidth = this.width * (gridSize / 50);
        const scaledHeight = this.height * (gridSize / 50);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, scaledWidth, scaledHeight);
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

function centerGrid() {
    offsetX = (viewport.clientWidth - canvas.width) / 2;
    offsetY = (viewport.clientHeight - canvas.height) / 2;
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (const token of tokens) {
            const scaledWidth = token.width * (gridSize / 50);
            const scaledHeight = token.height * (gridSize / 50);
            if (x >= token.x + offsetX && x <= token.x + offsetX + scaledWidth && y >= token.y + offsetY && y <= token.y + offsetY + scaledHeight) {
                isDragging = true;
                dragOffsetX = x - (token.x + offsetX);
                dragOffsetY = y - (token.y + offsetY);
                draggedElement = token;
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
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left - dragOffsetX;
        let y = e.clientY - rect.top - dragOffsetY;

        const snappedPos = snapToGrid(x - offsetX, y - offsetY);
        draggedElement.x = snappedPos.x;
        draggedElement.y = snappedPos.y;

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
    let zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    gridSize *= zoomFactor;

    if (gridSize < 5) gridSize = 5;
    if (gridSize > 100) gridSize = 100;

    drawGrid();
    centerGrid();
    redraw();
});

redraw();
