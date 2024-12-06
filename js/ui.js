// Function to create and append the HTML structure dynamically
export function initializeUI() {
  // Create a container for the entire UI
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="sidebar">
      <h2>Current User</h2>
      <select id="user-select">
        <option value="DM">DM</option>
        <option value="Player1">Player1</option>
        <option value="Player2">Player2</option>
      </select>

      <h2>Board</h2>
      <div style="position: relative;">
        <table id="grid"></table>
        <div id="selection-marquee"></div>
      </div>
    </div>

    <div id="controls">
      <h2>Character Management</h2>
      <button id="create-character-btn">Create Character</button>

      <h2>Dice Roller</h2>
      <div id="dice-roller">
        <input type="text" id="dice-expression" placeholder="e.g. 2d6+3">
        <button id="roll-expression">Roll</button>
      </div>
      <div>
        <button class="dice-button" data-sides="4">d4</button>
        <button class="dice-button" data-sides="6">d6</button>
        <button class="dice-button" data-sides="8">d8</button>
        <button class="dice-button" data-sides="10">d10</button>
        <button class="dice-button" data-sides="12">d12</button>
        <button class="dice-button" data-sides="20">d20</button>
      </div>

      <div id="log"></div>
      <input type="text" id="command-input" placeholder="Type a command or chat message..." />

      <div id="character-list">
        <h3>All Characters</h3>
        <div id="character-list-entries"></div>
      </div>

      <div id="monster-list" style="display:none;">
        <h3>Monsters</h3>
        <select id="monster-filter">
          <option value="">-- Select Environment --</option>
          <option value="Desert">Desert</option>
          <option value="Grasslands">Grasslands</option>
          <option value="Riverlands">Riverlands</option>
        </select>
        <div id="monster-list-entries"></div>
      </div>
    </div>

    <!-- Character Sheet Modal -->
    <div id="character-sheet-modal">
      <div class="modal-content">
        <span class="close-modal" id="close-sheet">&times;</span>
        <h3 id="character-name"></h3>
        <div id="character-details"></div>
        <div id="character-attacks"></div>
      </div>
    </div>

    <!-- Monster Sheet Modal -->
    <div id="monster-sheet-modal">
      <div class="modal-content">
        <span class="close-modal" id="close-monster-sheet">&times;</span>
        <h3 id="monster-name"></h3>
        <div id="monster-details"></div>
        <div id="monster-attacks"></div>
      </div>
    </div>

    <!-- Create Character Modal -->
    <div id="create-character-modal">
      <div class="modal-content">
        <span class="close-modal" id="close-create-character">&times;</span>
        <h3>Create Character</h3>
        <form id="create-character-form">
          <label>Name: <input type="text" name="name" required></label>
          <label>Class: <input type="text" name="class" required></label>
          <label>Level: <input type="number" name="level" value="1" min="1" required></label>
          <label>HP: <input type="number" name="HP" value="10" required></label>
          <label>AC: <input type="number" name="AC" value="10" required></label>
          <label>STR: <input type="number" name="STR" value="10" required></label>
          <label>DEX: <input type="number" name="DEX" value="10" required></label>
          <label>CON: <input type="number" name="CON" value="10" required></label>
          <label>INT: <input type="number" name="INT" value="10" required></label>
          <label>WIS: <input type="number" name="WIS" value="10" required></label>
          <label>CHA: <input type="number" name="CHA" value="10" required></label>

          <div id="attack-creation-section">
            <h4>Add Attacks</h4>
            <div id="attack-creation-list"></div>
            <button type="button" id="add-attack-btn">Add Attack</button>
          </div>

          <div id="assign-owner-field">
            <label>Assign to:
              <select name="owner">
                <option value="DM">DM</option>
                <option value="Player1">Player1</option>
                <option value="Player2">Player2</option>
              </select>
            </label>
          </div>

          <button type="submit">Create</button>
        </form>
      </div>
    </div>

    <!-- Context Menu -->
    <div class="context-menu" id="context-menu">
      <ul>
        <li id="context-delete">Delete</li>
      </ul>
    </div>
  `;

  // Append the container to the body
  document.body.appendChild(container);
}
