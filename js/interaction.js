import grid from './grid.js';
import tokenManager from './token.js';

export class Interaction {
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

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(1.1));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(0.9));

        // SVG interaction
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        this.svg.addEventListener('wheel', this.handleWheel.bind(this));
    }

    handleMouseDown(event) {
        const pt = this.getMousePosition(event);
        this.startX = pt.x;
        this.startY = pt.y;

        // Check if clicking on a token
        const clickedToken = event.target.closest('.token');
        if (clickedToken) {
            this.isTokenDragging = true;
            this.currentToken = clickedToken;
        } else {
            this.isPanning = true;
        }
    }

    handleMouseMove(event) {
        const pt = this.getMousePosition(event);

        if (this.isTokenDragging) {
            // Token dragging logic
            this.currentToken.setAttribute('transform', 
                `translate(${pt.x - this.startX}, ${pt.y - this.startY})`
            );
        } else if (this.isPanning) {
            // Panning logic
            const dx = (pt.x - this.startX) / this.scale;
            const dy = (pt.y - this.startY) / this.scale;
            
            this.translateX += dx;
            this.translateY += dy;
            
            this.svg.style.transform = 
                `scale(${this.scale}) translate(${this.translateX}px, ${this.translateY}px)`;
            
            this.startX = pt.x;
            this.startY = pt.y;
        }
    }

    handleMouseUp() {
        if (this.isTokenDragging) {
            // Finalize token position
            const token = this.currentToken;
