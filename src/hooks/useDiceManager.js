// js/hooks/useDiceManager.js
import { useMemo } from 'react';

export function useDiceManager(currentUser = 'Player') {
    // Define a simple function for rolling a single die
    const rollSingleDice = (sides) => Math.floor(Math.random() * sides) + 1;

    // Define a function for rolling a combined dice expression
    const rollCombinedDiceExpression = (originalExpr) => {
        const expr = originalExpr.trim().replace(/\s+/g, '');
        const regex = /([+\-])?(\d*d\d+|\d+)/gi;
        let total = 0;
        let detailParts = [];
        let match;

        while ((match = regex.exec(expr)) !== null) {
            const sign = match[1] || '+';
            const token = match[2];
            const signFactor = (sign === '-') ? -1 : 1;

            if (token.includes('d')) {
                const [diceCountStr, sidesStr] = token.split('d');
                const diceCount = parseInt(diceCountStr || '1', 10);
                const sides = parseInt(sidesStr, 10);
                const rolls = Array.from({ length: diceCount }, () => rollSingleDice(sides));
                
                const sumRolls = rolls.reduce((a, b) => a + b, 0);
                total += sumRolls * signFactor;
                detailParts.push(`${sign}${diceCount}d${sides} [${rolls.join(',')}]`);
            } else {
                const num = parseInt(token, 10);
                total += num * signFactor;
                detailParts.push(`${sign}${num}`);
            }
        }

        const detailStr = detailParts.join('').replace(/^\+/, '');
        
        return {
            original: originalExpr,
            details: detailStr,
            total,
            text: `Rolled ${originalExpr}: ${detailStr} = ${total}`
        };
    };

    // Define a function for handling various chat commands, including dice rolls
    const handleCommand = (command) => {
        if (!command) return null;

        const lowerCommand = command.toLowerCase();
        if (lowerCommand.startsWith('/roll') || lowerCommand.startsWith('/r')) {
            const parts = command.split(/\s+/);
            const diceExpr = parts.slice(1).join('');

            if (diceExpr) {
                const result = rollCombinedDiceExpression(diceExpr);
                return {
                    type: 'roll',
                    ...result,
                    sender: currentUser
                };
            }

            return {
                type: 'error',
                text: "No dice expression provided.",
                sender: "System"
            };
        }

        return {
            type: 'message',
            text: command,
            sender: currentUser
        };
    };

    // Memoize the manager object so it only updates when currentUser changes
    const manager = useMemo(() => ({
        rollSingleDice,
        rollCombinedDiceExpression,
        handleCommand
    }), [currentUser]);

    return manager;
}
