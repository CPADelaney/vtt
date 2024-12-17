import grid from './grid.js';
import tokenManager from './token.js';
import { GridConfig } from './config.js';

export class InteractionManager {
    constructor(svgElement) {
        this.svg = svgElement;
        this.isPanning = false;
        this.isTokenDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentToken = null;
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.gridConfig = GridConfig.getInstance();

        this.setupEventListeners();
    }

    // Get mouse position relative to SVG coordinates
    getMousePosition(event) {
        const CTM = this.svg.getScreenCTM();
        return {
            x: (event.clientX - CTM.e) / CTM.a,
            y: (event.clientY - CTM.f) / CTM.d
        };
    }

    // Snap coordinate to grid
    snapToGrid(value) {
        const gridSize = this.gridConfig.size;
        return Math.round(value / gridSize) * gridSize;
    }

    // Snap coordinate to hex grid
    snapToHex(x, y) {
        const size = this.gridConfig.size;
        const hexWidth = size * 2;
        const hexHeight = Math.sqrt(3) * size;
        
        // Convert to hex coordinates
        const q = (2/3 * x) / size;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
        
        // Round to nearest hex
        const roundedQ = Math.round(q);
        const roundedR = Math.round(r);
        
        // Convert back to pixel coordinates
        return {
            x: (3/2 * roundedQ) * size,
            y: (Math.sqrt(3) * (roundedQ/2 + roundedR)) * size
        };
    }

    // Zoom handling
    handleZoom(delta, centerX, centerY) {
        const oldScale = this.scale;
        this.scale *= delta;
        this.scale = Math.min(Math.max(0.5, this.scale), 3); // Limit zoom between 0.5x and 3x

        // Adjust translation to zoom toward mouse position
        const factor = this.scale / oldScale - 1;
        this.translateX -= (centerX - this.translateX) * factor;
        this.translateY -= (centerY - this.translateY) * factor;

        this.updateTransform();
    }

    // Mouse wheel handler
    handleWheel(event) {
        event.preventDefault();
        const mousePos = this.getMousePosition(event);
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.handleZoom(delta, mousePos.x, mousePos.y);
    }

    // Mouse down handler
    handleMouseDown(event) {
        const mousePos = this.getMousePosition(event);
        this.startX = mousePos.x;
        this.startY = mousePos.y;

        // Check if clicking on a token
        const clickedToken = event.target.closest('.token');
        if (clickedToken) {
            this.isTokenDragging = true;
            this.currentToken = clickedToken;
            this.currentToken.dataset.originalX = mousePos.x;
            this.currentToken.dataset.originalY = mousePos.y;
        } else {
            this.isPanning = true;
        }
    }

    // Mouse move handler
    handleMouseMove(event) {
        if (!this.isPanning && !this.isTokenDragging) return;

        const mousePos = this.getMousePosition(event);
        const dx = mousePos.x - this.startX;
        const dy = mousePos.y - this.startY;

        if (this.isTokenDragging && this.currentToken) {
            // Token dragging logic
            let newX = parseFloat(this.currentToken.dataset.originalX) + dx;
            let newY = parseFloat(this.currentToken.dataset.originalY) + dy;

            // Snap to grid based on grid type
            if (this.gridConfig.type === 'hex') {
                const snapped = this.snapToHex(newX, newY);
                newX = snapped.x;
                newY = snapped.y;
            } else {
                newX = this.snapToGrid(newX);
                newY = this.snapToGrid(newY);
            }

            // Update token position
            const tokenId = this.currentToken.id;
            tokenManager.updateTokenPosition(tokenId, newX, newY);
            
            // Visual feedback during drag
            this.currentToken.style.filter = 'brightness(1.2)';
        } else if (this.isPanning) {
            // Panning logic
            this.translateX += dx;
            this.translateY += dy;
            this.updateTransform();
            
            this.startX = mousePos.x;
            this.startY = mousePos.y;
        }
    }

    // Mouse up handler
    handleMouseUp() {
        if (this.isTokenDragging && this.currentToken) {
            // Reset token visual state
            this.currentToken.style.filter = '';
            
            // Finalize token position
            const tokenId = this.currentToken.id;
            const finalX = parseFloat(this.currentToken.getAttribute('cx'));
            const finalY = parseFloat(this.currentToken.getAttribute('cy'));
            tokenManager.finalizeTokenPosition(tokenId, finalX, finalY);
        }

        // Reset interaction states
        this.isPanning = false;
        this.isTokenDragging = false;
        this.currentToken = null;
    }

    // Update transform
    updateTransform() {
        const transformGroup = this.svg.querySelector('#transform-group');
        if (transformGroup) {
            transformGroup.setAttribute('transform', 
                `translate(${this.translateX} ${this.translateY}) scale(${this.scale})`
            );
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Mouse events
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        this.svg.addEventListener('wheel', this.handleWheel.bind(this));

        // Touch events for mobile support
        this.svg.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target
            });
        });

        this.svg.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        });

        this.svg.addEventListener('touchend', () => {
            this.handleMouseUp();
        });

        // Zoom buttons
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.handleZoom(1.1, this.svg.clientWidth / 2, this.svg.clientHeight / 2);
        });

        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.handleZoom(0.9, this.svg.clientWidth / 2, this.svg.clientHeight / 2);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.updateTransform();
        });
    }
}

// Create and export a singleton instance
const svg = document.getElementById('grid-canvas');
export const interactionManager = new InteractionManager(svg);
export default interactionManager;
