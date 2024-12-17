// gridPattern.js

/**
 * Creates and returns a square grid pattern.
 * @param {CanvasRenderingContext2D} mainCtx - A 2D context from your main canvas, used to create the pattern.
 * @param {number} baseCellSize - The default cell size (e.g., 50px).
 * @param {string} strokeStyle - The color of the grid lines (e.g., "#ccc").
 * @param {number} lineWidth - The thickness of the grid lines.
 * @returns {CanvasPattern} A CanvasPattern that can be used as a fillStyle.
 */
export function createSquarePattern(mainCtx, baseCellSize, strokeStyle = '#ccc', lineWidth = 1) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = baseCellSize;
    patternCanvas.height = baseCellSize;
    const patternCtx = patternCanvas.getContext('2d');
    
    patternCtx.strokeStyle = strokeStyle;
    patternCtx.lineWidth = lineWidth;

    // Draw right and bottom lines
    patternCtx.beginPath();
    patternCtx.moveTo(baseCellSize, 0);
    patternCtx.lineTo(baseCellSize, baseCellSize);
    patternCtx.stroke();

    patternCtx.beginPath();
    patternCtx.moveTo(0, baseCellSize);
    patternCtx.lineTo(baseCellSize, baseCellSize);
    patternCtx.stroke();

    return mainCtx.createPattern(patternCanvas, 'repeat');
}

/**
 * Creates and returns a hex grid pattern.
 * This is a starting point for a pointy-topped hex pattern.
 * You may need to adjust dimensions depending on your desired hex layout.
 *
 * For simplicity:
 * - Each hex is defined with a "radius" = baseCellSize/2.
 * - Pointy-topped hex coordinates are used.
 *
 * @param {CanvasRenderingContext2D} mainCtx
 * @param {number} baseCellSize - The base width of a hex cell.
 * @param {string} strokeStyle
 * @param {number} lineWidth
 * @returns {CanvasPattern}
 */
export function createHexPattern(mainCtx, baseCellSize, strokeStyle = '#ccc', lineWidth = 1) {
    const r = baseCellSize / 2; // radius (distance from center to corner)
    const hexHeight = Math.sqrt(3) * r; // height of one hex
    // For a repeating pattern, we'll create a pattern that contains two columns of hexes.
    // Horizontal spacing between hex centers is 3/4 * baseCellSize for a pointy-top layout.
    const horizontalSpacing = (3 / 4) * baseCellSize;
    const verticalSpacing = hexHeight;

    // We'll create a pattern canvas that can tile hexes both horizontally and vertically.
    // Let's try a pattern width that covers two hex columns and a pattern height that covers two hex rows.
    const patternWidth = horizontalSpacing * 2;
    const patternHeight = verticalSpacing * 2;

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternWidth;
    patternCanvas.height = patternHeight;
    const patternCtx = patternCanvas.getContext('2d');

    patternCtx.strokeStyle = strokeStyle;
    patternCtx.lineWidth = lineWidth;

    // Function to draw a single hex at a given center
    function drawHex(cx, cy) {
        // Hex corner angles (pointy top): 0°, 60°, 120°, 180°, 240°, 300°
        patternCtx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30); // start at -30° so top corner is up
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) patternCtx.moveTo(x, y);
            else patternCtx.lineTo(x, y);
        }
        patternCtx.closePath();
        patternCtx.stroke();
    }

    // Draw hexes in a pattern that will tile nicely.
    // We'll place hexes so that when repeated, they form a continuous hex grid.
    // First row
    drawHex(r, r); // a hex near top-left
    drawHex(r + horizontalSpacing, r); // next hex to the right

    // Second row is offset vertically and horizontally to form the proper tiling
    // For pointy-tops, every other row is shifted horizontally by half a hex width (r * 1.5)
    drawHex(r + (horizontalSpacing / 2), r + verticalSpacing); 
    drawHex(r + (horizontalSpacing / 2) + horizontalSpacing, r + verticalSpacing);

    return mainCtx.createPattern(patternCanvas, 'repeat');
}
