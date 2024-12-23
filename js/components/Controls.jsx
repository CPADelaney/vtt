// js/components/Controls.jsx
export function Controls({ 
    isHexGrid, 
    scale, 
    onToggleGrid, 
    onZoomIn, 
    onZoomOut 
}) {
    return (
        <div className="controls">
            <button onClick={onToggleGrid}>
                Toggle {isHexGrid ? 'Square' : 'Hex'} Grid
            </button>
            <div className="zoom-controls">
                <button onClick={onZoomOut}>−</button>
                <span>{Math.round(scale * 100)}%</span>
                <button onClick={onZoomIn}>+</button>
            </div>
        </div>
    );
}
