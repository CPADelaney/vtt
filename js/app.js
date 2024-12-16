const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

let gridSize = 50;
let gridWidth = 20;
let gridHeight = 20;
let isPanning = false;
let startX;
let startY;

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

    // Center the canvas - CRUCIAL CORRECTION HERE
    canvas.style.left = (viewport.clientWidth - canvas.width) / 2 + "px";
    canvas.style.top = (viewport.clientHeight - canvas.height) / 2 + "px";
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isPanning = true;
        startX = e.clientX + viewport.scrollLeft;
        startY = e.clientY + viewport.scrollTop;
        canvas.classList.add('panning');
    }
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.classList.remove('panning');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    viewport.scrollLeft = startX - e.clientX;
    viewport.scrollTop = startY - e.clientY;
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
});

drawGrid(); // Initial draw
