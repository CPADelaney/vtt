// bridge.js
export class UIBridge {
    constructor(vtt) {
        console.log('UIBridge constructor called');
        this.vtt = vtt;
        this.subscribers = new Set();
        this.inCombat = false;
        this.actionHistory = [];
        this.currentTurn = null;
        console.log('UIBridge initialized with:', { vtt, subscribers: this.subscribers });
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifyStateChange() {
        const state = {
            inCombat: this.inCombat,
            actionHistory: this.actionHistory,
            currentTurn: this.currentTurn
        };
        this.subscribers.forEach(cb => cb(state));
    }

    // Combat Management
    toggleCombat() {
        if (!this.inCombat) {
            this.startCombat();
        } else {
            this.endCombat();
        }
    }

    startCombat() {
        if (this.inCombat) return;
        this.inCombat = true;
        this.actionHistory = [];
        this.notifyStateChange();
    }

    endCombat() {
        if (!this.inCombat) return;
        if (this.actionHistory.length > 0) {
            const confirmed = window.confirm('End combat? This will clear the action history.');
            if (!confirmed) return;
        }
        this.inCombat = false;
        this.actionHistory = [];
        this.currentTurn = null;
        this.notifyStateChange();
    }

    // Action History Management
    addAction(action) {
        if (!this.inCombat) return;
        
        // Save the current state before the action
        const previousState = this.captureState();
        action.previousState = previousState;
        
        this.actionHistory.unshift(action);
        this.notifyStateChange();
    }

    undoLastAction() {
        if (!this.inCombat || this.actionHistory.length === 0) return;
        
        const action = this.actionHistory[0];
        if (action.previousState) {
            this.restoreState(action.previousState);
        }
        
        this.actionHistory.shift();
        this.notifyStateChange();
    }

    revertToPreviousTurn() {
        if (!this.inCombat || this.actionHistory.length === 0) return;
        
        // Find the last turn start marker
        const turnStartIndex = this.actionHistory.findIndex(action => action.type === 'TURN_START');
        if (turnStartIndex === -1) return;
        
        // Restore state from before that turn
        if (this.actionHistory[turnStartIndex].previousState) {
            this.restoreState(this.actionHistory[turnStartIndex].previousState);
        }
        
        // Remove all actions up to and including the turn start
        this.actionHistory.splice(0, turnStartIndex + 1);
        this.notifyStateChange();
    }

    // State Management
    captureState() {
        return {
            tokens: Array.from(document.querySelectorAll('.token')).map(token => ({
                id: token.id,
                position: {
                    x: parseFloat(token.style.left),
                    y: parseFloat(token.style.top)
                },
                stats: token.dataset.stats ? JSON.parse(token.dataset.stats) : {}
            }))
        };
    }

    restoreState(state) {
        if (!state.tokens) return;
        
        // Remove all current tokens
        document.querySelectorAll('.token').forEach(token => token.remove());
        
        // Restore tokens from saved state
        state.tokens.forEach(tokenData => {
            const token = this.vtt.addToken(tokenData.position.x, tokenData.position.y);
            token.id = tokenData.id;
            if (tokenData.stats) {
                token.dataset.stats = JSON.stringify(tokenData.stats);
            }
        });
    }
}
