export class TokenManager {
    constructor(svgElement) {
        this.svg = svgElement;
        this.tokens = [];
    }

    createToken(x, y, color = 'blue', label = '') {
        const token = {
            id: `token-${Date.now()}`,
            x,
            y,
            color,
            label
        };

        this.tokens.push(token);
        this.renderToken(token);
        return token;
    }

    renderToken(token) {
        const tokenGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tokenGroup.setAttribute('id', token.id);
        tokenGroup.classList.add('token');

        // Token circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', token.x);
        circle.setAttribute('cy', token.y);
        circle.setAttribute('r', 25);  // Default radius
        circle.setAttribute('fill', token.color);

        // Token label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', token.x);
        text.setAttribute('y', token.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.setAttribute('fill', 'white');
        text.textContent = token.label;

        tokenGroup.appendChild(circle);
        tokenGroup.appendChild(text);

        this.svg.appendChild(tokenGroup);
    }

    setupEventListeners() {
        const addTokenBtn = document.getElementById('add-token');
        addTokenBtn.addEventListener('click', () => {
            // Add token at center of grid
            this.createToken(500, 400, 'blue', 'New Token');
        });
    }
}

// Initialize Token Manager
const svg = document.getElementById('grid-canvas');
const tokenManager = new TokenManager(svg);
tokenManager.setupEventListeners();

export default tokenManager;
