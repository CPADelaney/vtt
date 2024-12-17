export class GridConfig {
    constructor() {
        this.type = 'square';
        this.size = 50;
        this.color = '#000000';  // Changed to black for better visibility
        this.opacity = 1.0;  
    }

    // Singleton pattern
    static getInstance() {
        if (!GridConfig.instance) {
            GridConfig.instance = new GridConfig();
        }
        return GridConfig.instance;
    }

    updateFromUI() {
        const config = GridConfig.getInstance();
        config.type = document.getElementById('grid-type').value;
        config.size = Number(document.getElementById('grid-size').value);
        config.color = document.getElementById('grid-color').value;
        config.opacity = Number(document.getElementById('grid-opacity').value);
        
        return config;
    }

    setupEventListeners() {
        const configModal = document.getElementById('config-modal');
        const gridConfigBtn = document.getElementById('grid-config');
        const closeConfigBtn = document.getElementById('close-config');
        const saveConfigBtn = document.getElementById('save-config');

        gridConfigBtn.addEventListener('click', () => {
            configModal.classList.remove('hidden');
        });

        closeConfigBtn.addEventListener('click', () => {
            configModal.classList.add('hidden');
        });

        saveConfigBtn.addEventListener('click', () => {
            this.updateFromUI();
            configModal.classList.add('hidden');
            
            // Dispatch event for grid refresh
            document.dispatchEvent(new CustomEvent('grid-config-changed'));
        });
    }
}

// Initialize configuration
const gridConfig = GridConfig.getInstance();
gridConfig.setupEventListeners();

export default gridConfig;
