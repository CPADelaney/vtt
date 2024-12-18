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
        
        const pos = {
            x: (e.clientX - this.vtt.currentX) / this.vtt.scale,
            y: (e.clientY - this.vtt.currentY) / this.vtt.scale
        };

        // Only show "Add Token" if the position is within bounds
        if (this.isWithinBounds(pos.x, pos.y)) {
            const addTokenOption = document.createElement('div');
            addTokenOption.className = 'context-menu-item';
            addTokenOption.textContent = 'Add Token';
            addTokenOption.onclick = () => {
                const snappedPos = this.getSnappedPosition(pos.x, pos.y);
                const token = this.vtt.addToken(snappedPos.x, snappedPos.y);
                this.closeContextMenu();
            };
            menu.appendChild(addTokenOption);
        }

        // Position the menu
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        // Only add menu to document if it has any options
        if (menu.children.length > 0) {
            document.body.appendChild(menu);
        }
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
            let newX = tokenStartX + dx;
            let newY = tokenStartY + dy;
            
            // Only snap if within bounds
            if (this.isWithinBounds(newX, newY)) {
                const snappedPos = this.getSnappedPosition(newX, newY);
                token.style.left = `${snappedPos.x}px`;
                token.style.top = `${snappedPos.y}px`;
            }
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

    getGridBounds() {
            if (this.vtt.isHexGrid) {
                const verticalSpacing = this.vtt.hexHeight * 0.75;
                return {
                    minX: this.vtt.hexWidth / 2,  // Start from first complete hex
                    minY: this.vtt.hexHeight * 0.255,  // Match our snap offset
                    maxX: ((this.vtt.cols - 1) * this.vtt.hexWidth),  // Account for last column
                    maxY: ((this.vtt.rows - 1) * verticalSpacing) - (this.vtt.hexHeight * 0.255)  // Match our snap offset
                };
            } else {
                return {
                    minX: this.vtt.gridSize / 2,  // Half cell for center alignment
                    minY: this.vtt.gridSize / 2,
                    maxX: (this.vtt.cols * this.vtt.gridSize) - (this.vtt.gridSize / 2),
                    maxY: (this.vtt.rows * this.vtt.gridSize) - (this.vtt.gridSize / 2)
                };
            }
        }

        isWithinBounds(x, y) {
            const bounds = this.getGridBounds();
            return x >= bounds.minX && x <= bounds.maxX && 
                   y >= bounds.minY && y <= bounds.maxY;
        }

    snapToSquareGrid(x, y) {
        const gridSize = this.vtt.gridSize;
        const bounds = this.getGridBounds();
        
        // Clamp x and y to bounds before snapping
        x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
        y = Math.max(bounds.minY, Math.min(bounds.maxY, y));
        
        const offsetX = gridSize / 2;
        const offsetY = gridSize / 2;
        
        const snappedX = Math.round((x - offsetX) / gridSize) * gridSize + offsetX;
        const snappedY = Math.round((y - offsetY) / gridSize) * gridSize + offsetY;
        
        return { x: snappedX, y: snappedY };
    }
    
    snapToHexGrid(x, y) {
        const hexWidth = this.vtt.hexWidth;
        const hexHeight = this.vtt.hexHeight;
        const verticalSpacing = hexHeight * 0.75;
        const bounds = this.getGridBounds();

        // Clamp x and y to bounds before snapping
        x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
        y = Math.max(bounds.minY, Math.min(bounds.maxY, y));
        
        let row = Math.round(y / verticalSpacing);
        const isOffsetRow = row % 2 === 1;
        
        const horizontalSpacing = hexWidth;
        const offsetX = isOffsetRow ? hexWidth / 2 : 0;
        
        let col = Math.round((x - offsetX) / horizontalSpacing);
        
        const snappedX = col * horizontalSpacing + offsetX;
        const snappedY = (row * verticalSpacing) - (hexHeight * 0.255);
        
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
