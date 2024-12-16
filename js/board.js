// board.js handles initialization of the board.

const Board = (function(){
  let viewportEl;
  let boardEl;

  function init() {
    viewportEl = document.getElementById('viewport');
    boardEl = document.getElementById('board');

    // Optionally center the board by scrolling to its middle:
    viewportEl.scrollLeft = (boardEl.offsetWidth - viewportEl.offsetWidth) / 2;
    viewportEl.scrollTop = (boardEl.offsetHeight - viewportEl.offsetHeight) / 2;
  }

  // If we eventually add a conceptual “zoom” that doesn't change cell size:
  // zoomLevel would be a number that affects calculations of object placement.
  let zoomLevel = 1.0;
  function setZoom(newZoom) {
    // newZoom might change how tokens are placed, but does NOT affect #board’s background-size
    // For now, do nothing visually. Just store it.
    zoomLevel = newZoom;
  }

  function getZoom() {
    return zoomLevel;
  }

  return {
    init,
    setZoom,
    getZoom
  };
})();
