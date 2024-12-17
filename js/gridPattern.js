export function createGridImage(gridWidth, gridHeight, baseCellSize, lineColor = '#ccc', lineWidth = 1) {
    // Create an off-screen canvas to render the entire grid once
    const offCanvas = document.createElement('canvas');
    offCanvas.width = gridWidth * baseCellSize;
    offCanvas.height = gridHeight * baseCellSize;
    const offCtx = offCanvas.getContext('2d');

    offCtx.strokeStyle = lineColor;
    offCtx.lineWidth = lineWidth;

    // Draw vertical lines
    for (let x = 0; x <= gridWidth; x++) {
        offCtx.beginPath();
        offCtx.moveTo(x * baseCellSize, 0);
        offCtx.lineTo(x * baseCellSize, offCanvas.height);
        offCtx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
        offCtx.beginPath();
        offCtx.moveTo(0, y * baseCellSize);
        offCtx.lineTo(offCanvas.width, y * baseCellSize);
        offCtx.stroke();
    }

    return offCanvas;
}
