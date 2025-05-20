import React from 'react';
import '../css/styles.css'; // Import CSS for the .marquee class

/**
 * Renders the selection marquee box based on state.
 * Controlled by the useTokenSelection hook.
 *
 * @param {object | null} marqueeState - State object from useTokenSelection.
 *                                     Null when not active.
 *                                     { startX, startY, currentX, currentY } when active.
 */
export const Marquee = ({ marqueeState }) => {
    // Only render if marqueeState is active (not null)
    if (!marqueeState) {
        return null;
    }

    const { startX, startY, currentX, currentY } = marqueeState;

    // Calculate the top-left corner and dimensions of the marquee rectangle
    const minX = Math.min(startX, currentX);
    const maxX = Math.max(startX, currentX);
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);

    const style = {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${maxX - minX}px`,
        height: `${maxY - minY}px`,
    };

    return (
        // Use the CSS class for styling, apply dynamic position/size via style prop
        <div className="marquee" style={style} />
    );
};