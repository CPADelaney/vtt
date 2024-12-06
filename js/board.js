export function renderGrid(rows, cols, container) {
  const table = document.createElement("table");
  table.id = "grid";

  for (let r = 0; r < rows; r++) {
    const row = document.createElement("tr");
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("td");
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Add default cell event listeners
      cell.addEventListener("click", () => {
        console.log(`Clicked cell at (${r}, ${c})`);
      });

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  // Clear existing content and append the table
  container.innerHTML = "";
  container.appendChild(table);
}

export function clearGrid(container) {
  container.innerHTML = "";
}

export function highlightCell(row, col, color = "yellow") {
  const cell = document.querySelector(`td[data-row='${row}'][data-col='${col}']`);
  if (cell) {
    cell.style.backgroundColor = color;
  } else {
    console.warn(`No cell found at (${row}, ${col})`);
  }
}

export function resetCellHighlights(container) {
  const cells = container.querySelectorAll("td");
  cells.forEach(cell => {
    cell.style.backgroundColor = "";
  });
}
