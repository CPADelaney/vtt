import { renderGrid } from "./board.js";

document.addEventListener("DOMContentLoaded", () => {
  const gridContainer = document.getElementById("grid-container");

  // Render the grid with 8 rows and 8 columns
  renderGrid(8, 8, gridContainer);

  console.log("Main script initialized and grid rendered.");
});
