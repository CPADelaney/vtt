// js/DiceManager.js
// Define DiceManager directly on window
window.DiceManager = class DiceManager {
    constructor() {
        this.currentUser = 'Player';
    }

    rollSingleDice(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    rollCombinedDiceExpression(expression) {
        const originalExpr = expression;
        expression = expression.trim().replace(/\s+/g, '');
        const regex = /([+\-])?(\d*d\d+|\d+)/gi;
        let total = 0;
        let detailParts = [];
        let match;

        while ((match = regex.exec(expression)) !== null) {
            let sign = match[1] || '+';
            let token = match[2];
            let signFactor = (sign === '-') ? -1 : 1;

            if (token.includes('d')) {
                let [diceCountStr, sidesStr] = token.split('d');
                let diceCount = parseInt(diceCountStr || '1', 10);
                let sides = parseInt(sidesStr, 10);
                let rolls = [];

                for (let i = 0; i < diceCount; i++) {
                    let result = this.rollSingleDice(sides);
                    rolls.push(result);
                }

                let sumRolls = rolls.reduce((a, b) => a + b, 0);
                total += sumRolls * signFactor;
                detailParts.push(`${sign}${diceCount}d${sides} [${rolls.join(',')}]`);
            } else {
                let num = parseInt(token, 10);
                total += num * signFactor;
                detailParts.push(`${sign}${num}`);
            }
        }

        let detailStr = detailParts.join('');
        detailStr = detailStr.replace(/^\+/, '');
        
        return {
            original: originalExpr,
            details: detailStr,
            total: total,
            text: `Rolled ${originalExpr}: ${detailStr} = ${total}`
        };
    }

    handleCommand(command) {
        if (!command) return null;

        if (command.toLowerCase().startsWith('/roll') || command.toLowerCase().startsWith('/r')) {
            const parts = command.split(/\s+/);
            let diceExprIndex = 1;

            if (parts[0].toLowerCase() === '/roll' || parts[0].toLowerCase() === '/r') {
                const diceExpr = parts.slice(diceExprIndex).join('');
                if (diceExpr) {
                    const result = this.rollCombinedDiceExpression(diceExpr);
                    return {
                        type: 'roll',
                        ...result,
                        sender: this.currentUser
                    };
                } else {
                    return {
                        type: 'error',
                        text: "No dice expression provided.",
                        sender: "System"
                    };
                }
            }
        }

        return {
            type: 'message',
            text: command,
            sender: this.currentUser
        };
    }
};
