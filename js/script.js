class VirtualTabletop {
    constructor() {
        this.tabletop = document.getElementById('tabletop');
        this.container = document.getElementById('tabletop-container');
        this.toggleButton = document.getElementById('toggleGrid');
        this.zoomSlider = document.getElementById('zoomSlider');
        this.zoomValue = document.getElementById('zoomValue');
        
        this.isHexGrid = false;
        this.scale = 1;
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.startX = 0;
        this.startY = 0;

        this.gridSize = 50; // Base size for grid cells
        this.cols = Math.ceil(window.innerWidth / this.gridSize) + 5;
        this.rows = Math.ceil(window.innerHeight / this.gridSize) + 5;

        this.initializeEventListeners();
        this.createGrid();
    }

    initializeEventListeners() {
        // Pan functionality (right-click only)
        this.tabletop.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu from appearing
        });
        
        this.tabletop.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right click
                this.startDragging(e);
            }
        });
        
        window.addEventListener('mousemove', (e) => this.drag(e));
        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // Right click
                this.stopDragging();
            }
        });

        // Zoom functionality
        this.zoomSlider.addEventListener('input', (e) => this.handleZoom(e));

        // Grid toggle
        this.toggleButton.addEventListener('click', () => this.toggleGridType());

        // Window resize handling
        window.addEventListener('resize', () => this.handleResize());
    }

    startDragging(e) {
        if (e.target.classList.contains('token')) return;
        
        this.isDragging = true;
        this.tabletop.classList.add('grabbing');
        
        this.startX = e.pageX - this.currentX;
        this.startY = e.pageY - this.currentY;
    }

    drag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        this.currentX = e.pageX - this.startX;
        this.currentY = e.pageY - this.startY;

        this.tabletop.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(${this.scale})`;
    }

    stopDragging() {
        this.isDragging = false;
        this.tabletop.classList.remove('grabbing');
    }

    handleZoom(e) {
        this.scale = parseFloat(e.target.value);
        this.zoomValue.textContent = `${Math.round(this.scale * 100)}%`;
        this.tabletop.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(${this.scale})`;
    }

    toggleGridType() {
        this.isHexGrid = !this.isHexGrid;
        this.tabletop.className = this.isHexGrid ? 'hex-grid' : 'square-grid';
        this.createGrid();
    }

    createGrid() {
        this.tabletop.innerHTML = '';
        
        if (this.isHexGrid) {
            this.createHexGrid();
        } else {
            this.createSquareGrid();
        }
    }

    createSquareGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.left = `${col * this.gridSize}px`;
                cell.style.top = `${row * this.gridSize}px`;
                this.tabletop.appendChild(cell);
            }
        }
    }

    createHexGrid() {
        const hexWidth = this.gridSize * 2;
        const hexHeight = this.gridSize * Math.sqrt(3);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                // Offset every other row
                const offset = row % 2 === 0 ? 0 : hexWidth / 2;
                cell.style.left = `${col * hexWidth + offset}px`;
                cell.style.top = `${row * (hexHeight * 0.75)}px`;
                
                this.tabletop.appendChild(cell);
            }
        }
    }

    handleResize() {
        this.cols = Math.ceil(window.innerWidth / this.gridSize) + 5;
        this.rows = Math.ceil(window.innerHeight / this.gridSize) + 5;
        this.createGrid();
    }

    addToken(x, y) {
        const token = document.createElement('div');
        token.className = 'token';
        token.style.left = `${x}px`;
        token.style.top = `${y}px`;
        
        // Make token draggable
        token.addEventListener('mousedown', (e) => {
            const moveToken = (moveEvent) => {
                token.style.left = `${moveEvent.pageX}px`;
                token.style.top = `${moveEvent.pageY}px`;
            };
            
            const stopMoving = () => {
                window.removeEventListener('mousemove', moveToken);
                window.removeEventListener('mouseup', stopMoving);
            };
            
            window.addEventListener('mousemove', moveToken);
            window.addEventListener('mouseup', stopMoving);
            e.stopPropagation();
        });
        
        this.tabletop.appendChild(token);
    }
}

// Initialize the virtual tabletop when the page loads
window.addEventListener('load', () => {
    const vtt = new VirtualTabletop();
    
    // Example: Add a token at the center of the viewport
    vtt.addToken(window.innerWidth / 2, window.innerHeight / 2);
});
