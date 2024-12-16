const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

let gridSize = 50;
let gridWidth = 20;
let gridHeight = 20;
let isPanning = false;
let startX;
let startY;
let offsetX = 0; // Keep track of the grid's offset
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

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right mouse button
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        canvas.classList.add('panning');
    }
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.classList.remove('panning');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isPanning) return;

    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    offsetX += dx;
    offsetY += dy;

    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';

    startX = e.clientX;
    startY = e.clientY;
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

    //Adjust offset after zoom
    offsetX = (viewport.clientWidth - canvas.width) / 2;
    offsetY = (viewport.clientHeight - canvas.height) / 2;
    canvas.style.left = offsetX + "px";
    canvas.style.top = offsetY + "px";
});

drawGrid(); // Initial draw
