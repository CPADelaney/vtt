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
        // Prevent context menu and handle right-click
        this.vtt.tabletop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse down handler
        this.vtt.tabletop.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right click
                this.rightClickStartX = e.clientX;
                this.rightClickStartY = e.clientY;
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
            if (e.button === 2) { // Right click release
                const deltaX = Math.abs(e.clientX - this.rightClickStartX);
                const deltaY = Math.abs(e.clientY - this.rightClickStartY);
                
                // Only show context menu if we haven't moved much
                if (deltaX < 5 && deltaY < 5) {
                    const clickedToken = e.target.closest('.token');
                    if (clickedToken) {
                        this.showContextMenu(e, clickedToken);
                    } else {
                        this.showGridContextMenu(e);
                    }
                }
                this.stopPanning();
            } else if (e.button === 0) {
                this.handleLeftClickRelease(e);
            }
        });

        // Close context menu when clicking elsewhere
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.closeContextMenu();
            }
        });

        // Wheel zoom handler
        this.vtt.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.vtt.handleZoomButton(1.1);
            } else {
                this.vtt.handleZoomButton(0.9);
            }
        });
    }


    showContextMenu(e, token) {
        this.closeContextMenu(); // Close any existing menu
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        // If the token isn't selected, select it
        if (!this.selectedTokens.has(token)) {
            this.selectedTokens.clear();
            this.selectedTokens.add(token);
            this.highlightSelectedTokens();
        }

        // Delete option
        const deleteOption = document.createElement('div');
        deleteOption.className = 'context-menu-item';
        deleteOption.textContent = 'Delete Token(s)';
        deleteOption.onclick = () => {
            this.selectedTokens.forEach(token => {
                token.remove();
                // Remove from VTT tokens set if it exists there
                this.vtt.tokens.delete(token);
            });
            this.selectedTokens.clear();
            this.closeContextMenu();
        };
        menu.appendChild(deleteOption);

        // Position the menu
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        // Add to document
        document.body.appendChild(menu);
    }

    showGridContextMenu(e) {
        this.closeContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        // Add token option
        const addTokenOption = document.createElement('div');
        addTokenOption.className = 'context-menu-item';
        addTokenOption.textContent = 'Add Token';
        addTokenOption.onclick = () => {
            const pos = this.getSnappedPosition(
                (e.clientX - this.vtt.currentX) / this.vtt.scale,
                (e.clientY - this.vtt.currentY) / this.vtt.scale
            );
            const token = this.vtt.addToken(pos.x, pos.y);
            this.closeContextMenu();
        };
        menu.appendChild(addTokenOption);

        // Position the menu
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        // Add to document
        document.body.appendChild(menu);
    }

    closeContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }    
    
    startPanning(e) {
        if (e.target.classList.contains('token')) return;
        
        this.isPanning = true;
        this.hasMoved = false; // Add this
        this.vtt.tabletop.classList.add('grabbing');
        
        this.panStart = {
            x: e.pageX - this.vtt.currentX,
            y: e.pageY - this.vtt.currentY
        };
    }

    handlePanning(e) {
        if (!this.isPanning) return;
        
        e.preventDefault();
        
        // Check if we've moved more than a few pixels
        const dx = e.pageX - (this.panStart.x + this.vtt.currentX);
        const dy = e.pageY - (this.panStart.y + this.vtt.currentY);
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.hasMoved = true;
        }
        
        this.vtt.currentX = e.pageX - this.panStart.x;
        this.vtt.currentY = e.pageY - this.panStart.y;
    
        this.vtt.updateTransform();
    }

    stopPanning() {
        this.isPanning = false;
        this.vtt.tabletop.classList.remove('grabbing');
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
        const gridSize = this.vtt.gridSize;
        
        // Offset by half a grid size to snap to center instead of corner
        const offsetX = gridSize / 2;
        const offsetY = gridSize / 2;
        
        // Round to nearest grid cell and add offset to get to center
        const snappedX = Math.round((x - offsetX) / gridSize) * gridSize + offsetX;
        const snappedY = Math.round((y - offsetY) / gridSize) * gridSize + offsetY;
        
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
            // Add vertical offset to center in hex (half the height of the non-overlapping portion)
            const snappedY = (row * verticalSpacing) - (hexHeight * 0.175);
            
            return { x: snappedX, y: snappedY };
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

    finalizeSelection() {
        if (!this.marquee) return;

        const marqueeRect = this.marquee.getBoundingClientRect();
        const tokens = document.querySelectorAll('.token');

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
}
