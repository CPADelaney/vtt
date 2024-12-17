export class TokenManager {
    constructor(ruleset) {
        this.tokens = new Map();
        this.ruleset = ruleset;
    }

    createToken(tokenData) {
        const token = {
            id: `token-${Date.now()}`,
            ...this.ruleset.getDefaultToken(),
            ...tokenData
        };

        if (!this.ruleset.validateToken(token)) {
            throw new Error('Invalid token data');
        }

        this.tokens.set(token.id, token);
        return token;
    }

    removeToken(tokenId) {
        this.tokens.delete(tokenId);
    }

    updateToken(tokenId, updates) {
        const token = this.tokens.get(tokenId);
        if (!token) {
            throw new Error('Token not found');
        }

        const updatedToken = { ...token, ...updates };
        this.tokens.set(tokenId, updatedToken);
        return updatedToken;
    }

    getToken(tokenId) {
        return this.tokens.get(tokenId);
    }

    getAllTokens() {
        return Array.from(this.tokens.values());
    }

    clearTokens() {
        this.tokens.clear();
    }

    renderToken(token) {
        const tokenGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tokenGroup.setAttribute('id', token.id);
        tokenGroup.setAttribute('class', 'token');

        // Create token circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', token.x);
        circle.setAttribute('cy', token.y);
        circle.setAttribute('r', token.size || 25);
        circle.setAttribute('fill', token.color || 'blue');

        // Create token label
        if (token.label) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', token.x);
            text.setAttribute('y', token.y + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'white');
            text.textContent = token.label;
            tokenGroup.appendChild(text);
        }

        tokenGroup.appendChild(circle);
        return tokenGroup;
    }

// Example token placement
updateTokenPosition(tokenId, x, y) {
    const cell = this.grid.getCellAtPosition(x, y);
    if (cell) {
        const token = this.tokens.get(tokenId);
        if (token) {
            // Snap to cell center
            token.x = cell.x + (this.config.size / 2);
            token.y = cell.y + (this.config.size / 2);
            this.updateToken(tokenId, token);
        }
    }
}

    getTokenAt(x, y) {
        // Simple hit detection
        return Array.from(this.tokens.values()).find(token => {
            const dx = token.x - x;
            const dy = token.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (token.size || 25);
        });
    }
}

export default TokenManager;
