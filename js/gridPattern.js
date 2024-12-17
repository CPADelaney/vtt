export function createSquarePattern(mainCtx, cellSize=50, strokeStyle='#ccc', lineWidth=1) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = cellSize;
    patternCanvas.height = cellSize;
    const pctx = patternCanvas.getContext('2d');
    pctx.strokeStyle = strokeStyle;
    pctx.lineWidth = lineWidth;

    // Draw the right and bottom edges of one cell
    pctx.beginPath();
    pctx.moveTo(cellSize, 0);
    pctx.lineTo(cellSize, cellSize);
    pctx.stroke();

    pctx.beginPath();
    pctx.moveTo(0, cellSize);
    pctx.lineTo(cellSize, cellSize);
    pctx.stroke();

    return mainCtx.createPattern(patternCanvas, 'repeat');
}
