// js/main.js
import { App } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize(); // The grid and canvas are set up here

  requestAnimationFrame(() => {
    resizeCanvasAndCenter();
    enablePanning();
  });
});

function resizeCanvasAndCenter() {
  const boardScroll = document.getElementById('board-scroll-container');
  const boardCanvas = boardScroll.querySelector('.board-canvas');
  const grid = document.getElementById('grid');
  
  const gridWidth = grid.offsetWidth;
  const gridHeight = grid.offsetHeight;
  const margin = 1000; // Extra space around the grid

  boardCanvas.style.width = (gridWidth + margin * 2) + 'px';
  boardCanvas.style.height = (gridHeight + margin * 2) + 'px';

  // Center the scroll
  boardScroll.scrollLeft = (boardCanvas.offsetWidth - boardScroll.clientWidth) / 2;
  boardScroll.scrollTop = (boardCanvas.offsetHeight - boardScroll.clientHeight) / 2;
}

function enablePanning() {
  const boardScroll = document.getElementById('board-scroll-container');
  
  let isPanning = false;
  let startX, startY, scrollLeft, scrollTop;

  // Prevent the context menu on right-click
  boardScroll.addEventListener('contextmenu', (e) => e.preventDefault());

  boardScroll.addEventListener('mousedown', (e) => {
    // Only start panning if it's the right mouse button
    if (e.button !== 2) return;

    isPanning = true;
    boardScroll.style.cursor = 'grabbing';
    startX = e.pageX - boardScroll.offsetLeft;
    startY = e.pageY - boardScroll.offsetTop;
    scrollLeft = boardScroll.scrollLeft;
    scrollTop = boardScroll.scrollTop;
  });

  boardScroll.addEventListener('mouseleave', () => {
    isPanning = false;
    boardScroll.style.cursor = 'grab';
  });

  boardScroll.addEventListener('mouseup', () => {
    isPanning = false;
    boardScroll.style.cursor = 'grab';
  });

  boardScroll.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - boardScroll.offsetLeft;
    const y = e.pageY - boardScroll.offsetTop;
    boardScroll.scrollLeft = scrollLeft - (x - startX);
    boardScroll.scrollTop = scrollTop - (y - startY);
  });
}
