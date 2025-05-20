import React from 'react';
import '../css/styles.css'; // Corrected import path

/**
 * Renders the context menu component.
 * Controlled by the useContextMenu hook and rendered by a parent component.
 *
 * @param {object | null} menuState - State object from useContextMenu. Null when not active.
 *                                    { x: screenPx, y: screenPx, type: 'token' | 'grid', tokenIds?: string[], gridCoords?: {x, y} } when active.
 * @param {Function} hideMenu - Callback to hide the menu (passed from useContextMenu).
 * @param {Function} onAddToken - Callback to add a token (passed from parent, e.g., VirtualTabletop). Receives gridCoords.
 * @param {Function} onDeleteTokens - Callback to delete tokens (passed from parent, e.g., VirtualTabletop). Receives tokenIds array.
 */
export const ContextMenu = ({ menuState, hideMenu, onAddToken, onDeleteTokens }) => {
    if (!menuState) return null;

    // Determine options based on the menu type ('token' or 'grid')
    const menuItems = [];
    if (menuState.type === 'token') {
        // Ensure tokenIds is an array, even if it was just one ID
        const tokenIds = Array.isArray(menuState.tokenIds) ? menuState.tokenIds : (menuState.tokenIds ? [menuState.tokenIds] : []);
        if (tokenIds.length > 0) {
            menuItems.push({ label: `Delete Token${tokenIds.length > 1 ? 's' : ''}`, action: () => onDeleteTokens(tokenIds) }); // Pass token IDs
        }
        // Add other token-specific options here (e.g., Edit, Copy, Change HP)
    } else { // type === 'grid'
        menuItems.push({ label: 'Add Token Here', action: () => onAddToken(menuState.gridCoords) }); // Pass grid coords
        // Add other grid/map options here (e.g., Add Image, Draw Shape)
    }

    if (menuItems.length === 0) return null; // Don't render empty menu

    return (
        <div
            className="context-menu" // Use CSS class for styling
            style={{ left: menuState.x, top: menuState.y }} // Apply dynamic position
            onContextMenu={e => e.preventDefault()} // Prevent nested browser context menus
        >
            {menuItems.map((item, index) => (
                <div
                    key={index}
                    className="context-menu-item" // Use CSS class for styling
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click from propagating outside the menu item
                        item.action(); // Execute the action callback
                        hideMenu(); // Hide the menu after action (handled by hook listener)
                    }}
                    // Adding onMouseDown to prevent propagation on click start
                    onMouseDown={e => e.stopPropagation()}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
};