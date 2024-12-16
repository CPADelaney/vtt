const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

let gridSize = 50; // Size of each grid cell
let gridWidth = 20; // Number of grid cells horizontally
let gridHeight = 20; // Number of grid cells vertically
let isPanning = false;
let startX;
let startY;

function drawGrid() {
    canvas.width = gridWidth * gridSize;
    canvas.height = gridHeight * gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ccc'; // Grid line color

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

drawGrid(); // Initial grid draw

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2){ // Right Mouse Button
        isPanning = true;
        startX = e.clientX - viewport.offsetLeft + viewport.scrollLeft;
        startY = e.clientY - viewport.offsetTop + viewport.scrollTop;
        canvas.classList.add('panning');
    }
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.classList.remove('panning');
});

canvas.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    viewport.scrollLeft = startX - (e.clientX - viewport.offsetLeft);
    viewport.scrollTop = startY - (e.clientY - viewport.offsetTop);
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevents default context menu behavior
});

// Zooming using mouse wheel
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    let zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Adjust zoom speed here
    gridSize *= zoomFactor;

    if (gridSize < 5) gridSize = 5; //Min zoom
    if (gridSize > 100) gridSize = 100; //Max zoom

    drawGrid();
});
