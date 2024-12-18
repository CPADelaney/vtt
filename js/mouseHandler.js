// mouseHandler.js
export class MouseHandler {
    constructor(vtt) {
        this.vtt = vtt;
        this.isSelecting = false;
        this.selectedTokens = new Set();
        this.marquee = null;
        this.marqueeStart = { x: 0, y: 0 };
        
        // For right-click pan
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        this.initializeMouseHandlers();
    }

    initializeMouseHandlers() {
        // Prevent context menu
        this.vtt.tabletop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse down handler
        this.vtt.tabletop.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right click
                this.startPanning(e);
            } else if (e.button === 0) { // Left click
                this.handleLeftClick(e);
            }
        });

        // Mouse move handler
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.handlePanning(e);
            } else if (this.isSelecting) {
                this.updateMarquee(e);
            }
        });

        // Mouse up handler
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.stopPanning();
            } else if (e.button === 0) {
                this.handleLeftClickRelease(e);
            }
        });

        // Zoom handlers
        this.vtt.container.addEventListener('wheel', (e) => this.handleZoom(e));
        this.vtt.zoomSlider.addEventListener('input', (e) => this.handleSliderZoom(e));
    }

    startPanning(e) {
        if (e.target.classList.contains('token')) return;
        
        this.isPanning = true;
        this.vtt.tabletop.classList.add('grabbing');
        
        this.panStart = {
            x: e.pageX - this.vtt.currentX,
            y: e.pageY - this.vtt.currentY
        };
    }

    handlePanning(e) {
        if (!this.isPanning) return;
        
        e.preventDefault();
        
        this.vtt.currentX = e.pageX - this.panStart.x;
        this.vtt.currentY = e.pageY - this.panStart.y;

        this.vtt.updateTransform();
    }

    stopPanning() {
        this.isPanning = false;
        this.vtt.tabletop.classList.remove('grabbing');
    }

    handleZoom(e) {
        e.preventDefault();
        
        // Get mouse position relative to container
        const rect = this.vtt.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate position relative to transformed tabletop
        const beforeZoomX = (mouseX - this.vtt.currentX) / this.vtt.scale;
        const beforeZoomY = (mouseY - this.vtt.currentY) / this.vtt.scale;

        // Update scale
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.vtt.scale *= zoomFactor;
        
        // Clamp scale
        this.vtt.scale = Math.min(Math.max(this.vtt.scale, 0.5), 2);

        // Calculate new position to keep mouse point fixed
        const afterZoomX = (mouseX - this.vtt.currentX) / this.vtt.scale;
        const afterZoomY = (mouseY - this.vtt.currentY) / this.vtt.scale;

        // Adjust position to maintain mouse point
        this.vtt.currentX += (afterZoomX - beforeZoomX) * this.vtt.scale;
        this.vtt.currentY += (afterZoomY - beforeZoomY) * this.vtt.scale;

        this.vtt.updateTransform();
        this.updateZoomControls();
    }

    handleSliderZoom(e) {
        this.vtt.scale = parseFloat(e.target.value);
        this.updateZoomControls();
        this.vtt.updateTransform();
    }

    updateZoomControls() {
        this.vtt.zoomSlider.value = this.vtt.scale;
        this.vtt.zoomValue.textContent = `${Math.round(this.vtt.scale * 100)}%`;
    }

    handleLeftClick(e) {
        const clickedToken = e.target.closest('.token');
        
        if (clickedToken) {
            if (!e.shiftKey) {
                this.selectedTokens.clear();
            }
            this.selectedTokens.add(clickedToken);
            this.highlightSelectedTokens();
            this.startTokenDrag(clickedToken, e);
        } else {
            // Start marquee selection
            this.isSelecting = true;
            this.marqueeStart = {
                x: e.clientX,
                y: e.clientY
            };
            this.createMarquee(e);
            
            if (!e.shiftKey) {
                this.selectedTokens.clear();
                this.highlightSelectedTokens();
            }
        }
    }
    handleMouseMove(e) {
        if (this.isSelecting) {
            this.updateMarquee(e);
        }
    }

    handleLeftClickRelease(e) {
        if (this.isSelecting) {
            this.finalizeSelection();
        }
        this.isSelecting = false;
        if (this.marquee) {
            this.marquee.remove();
            this.marquee = null;
        }
    }

    createMarquee(e) {
        this.marquee = document.createElement('div');
        this.marquee.className = 'marquee';
        document.body.appendChild(this.marquee);
    }

    updateMarquee(e) {
        if (!this.marquee) return;

        const minX = Math.min(e.clientX, this.marqueeStart.x);
        const maxX = Math.max(e.clientX, this.marqueeStart.x);
        const minY = Math.min(e.clientY, this.marqueeStart.y);
        const maxY = Math.max(e.clientY, this.marqueeStart.y);

        this.marquee.style.left = `${minX}px`;
        this.marquee.style.top = `${minY}px`;
        this.marquee.style.width = `${maxX - minX}px`;
        this.marquee.style.height = `${maxY - minY}px`;
    }

    finalizeSelection() {
        if (!this.marquee) return;

        const marqueeRect = this.marquee.getBoundingClientRect();
        const tokens = document.querySelectorAll('.token');

        if (!event.shiftKey) {
            this.selectedTokens.clear();
        }

        tokens.forEach(token => {
            const tokenRect = token.getBoundingClientRect();
            if (this.rectsIntersect(marqueeRect, tokenRect)) {
                this.selectedTokens.add(token);
            }
        });

        this.highlightSelectedTokens();
    }

    rectsIntersect(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }

    highlightSelectedTokens() {
        document.querySelectorAll('.token').forEach(token => {
            token.classList.remove('selected');
        });
        this.selectedTokens.forEach(token => {
            token.classList.add('selected');
        });
    }

    startTokenDrag(token, startEvent) {
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;
        const tokenStartX = parseFloat(token.style.left);
        const tokenStartY = parseFloat(token.style.top);

        const handleDrag = (e) => {
            const dx = (e.clientX - startX) / this.vtt.scale;
            const dy = (e.clientY - startY) / this.vtt.scale;
            
            // Get the potential new position
            const newX = tokenStartX + dx;
            const newY = tokenStartY + dy;
            
            // Get the snapped position
            const snappedPos = this.getSnappedPosition(newX, newY);
            
            // Apply the snapped position
            token.style.left = `${snappedPos.x}px`;
            token.style.top = `${snappedPos.y}px`;
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
    }
        getSnappedPosition(x, y) {
        if (this.vtt.isHexGrid) {
            return this.snapToHexGrid(x, y);
        } else {
            return this.snapToSquareGrid(x, y);
        }
    }

    snapToSquareGrid(x, y) {
        // Simple square grid snapping
        const gridSize = this.vtt.gridSize;
        const snappedX = Math.round(x / gridSize) * gridSize;
        const snappedY = Math.round(y / gridSize) * gridSize;
        
        return { x: snappedX, y: snappedY };
    }

    snapToHexGrid(x, y) {
        const hexWidth = this.vtt.hexWidth;
        const hexHeight = this.vtt.hexHeight;
        const verticalSpacing = hexHeight * 0.75;
        
        // Find the nearest row
        let row = Math.round(y / verticalSpacing);
        const isOffsetRow = row % 2 === 1;
        
        // Adjust horizontal spacing based on row
        const horizontalSpacing = hexWidth;
        const offsetX = isOffsetRow ? hexWidth / 2 : 0;
        
        // Find the nearest column
        let col = Math.round((x - offsetX) / horizontalSpacing);
        
        // Calculate final snapped position
        const snappedX = col * horizontalSpacing + offsetX;
        const snappedY = row * verticalSpacing;
        
        return { x: snappedX, y: snappedY };
    }


    showContextMenu(e) {
        // Remove any existing context menus
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const deleteOption = document.createElement('div');
        deleteOption.className = 'context-menu-item';
        deleteOption.textContent = 'Delete token';
        deleteOption.onclick = () => {
            this.selectedTokens.forEach(token => token.remove());
            this.selectedTokens.clear();
            menu.remove();
        };

        menu.appendChild(deleteOption);
        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };
        document.addEventListener('mousedown', closeMenu);
    }
}
