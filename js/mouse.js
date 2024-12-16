// mouse.js handles mouse interactions: right-click drag (panning)

const MouseHandler = (function(){
  let viewportEl;
  let isPanning = false;
  let startX, startY, scrollLeftStart, scrollTopStart;

  function init() {
    viewportEl = document.getElementById('viewport');

    // Disable the context menu on right-click so we can use it for panning
    viewportEl.addEventListener('contextmenu', (e) => e.preventDefault());

    viewportEl.addEventListener('mousedown', onMouseDown);
    viewportEl.addEventListener('mouseup', onMouseUp);
    viewportEl.addEventListener('mouseleave', onMouseUp);
    viewportEl.addEventListener('mousemove', onMouseMove);
    viewportEl.addEventListener('wheel', onWheel, {passive: false});
  }

  function onMouseDown(e) {
    if (e.button === 2) { // right-click
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      scrollLeftStart = viewportEl.scrollLeft;
      scrollTopStart = viewportEl.scrollTop;
    }
  }

  function onMouseUp(e) {
    if (e.button === 2) {
      isPanning = false;
    }
  }

  function onMouseMove(e) {
    if (isPanning) {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      viewportEl.scrollLeft = scrollLeftStart - dx;
      viewportEl.scrollTop = scrollTopStart - dy;
    }
  }

  // onWheel to handle zoom conceptually. This won't change cell size, but we can adjust a zoom variable.
  function onWheel(e) {
    if (e.ctrlKey) { 
      // Prevent default zooming if ctrl+wheel is used
      e.preventDefault();
      let currentZoom = Board.getZoom();
      let newZoom = currentZoom + (e.deltaY < 0 ? 0.1 : -0.1);
      newZoom = Math.max(0.1, Math.min(newZoom, 5)); // clamp zoom
      Board.setZoom(newZoom);
      // No visual change in cell size, but can be used later for scaling tokens.
    }
  }

  return {
    init
  };
})();
