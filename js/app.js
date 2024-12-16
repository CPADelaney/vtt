const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const version = "1.0.1"; // Update this manually or automatically
const versionElement = document.getElementById('version');

versionElement.textContent = "Version: " + version;

let gridSize = 50;
let gridWidth = 20;
let gridHeight = 20;
let isPanning = false;
let startX;
let startY;
let offsetX = 0;
let offsetY = 0;

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

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isPanning = true;
        startX = e.clientX - offsetX; // Corrected startX calculation
        startY = e.clientY - offsetY; // Corrected startY calculation
        canvas.classList.add('panning');
    }
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.classList.remove('panning');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isPanning) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
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
    centerGrid();// Recenter after zoom
});

drawGrid();
centerGrid();// Initial centering
